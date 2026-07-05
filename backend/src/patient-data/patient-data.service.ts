import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientDataRepository } from '../repositories/patient-data.repository';
import { PatientData, PatientMedicine } from '../schemas/patient-data.schema';
import { BranchInventoryService } from '../inventory/branch-inventory/branch-inventory.service';
import { PatientRepository } from '../repositories/patient.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { llmInstance } from '../google/vertex.config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import * as nodemailer from 'nodemailer';

type BranchInventoryAdjustment = {
  branchId: string;
  itemId: string;
  quantity: number;
  batchNo: string;
  expiryDate?: string | Date | null;
};

type PatientMedicineInput = {
  name?: unknown;
  medicineName?: unknown;
  quantity?: unknown;
};

@Injectable()
export class PatientDataService {
  constructor(
    private readonly patientDataRepository: PatientDataRepository,
    private readonly branchInventoryService: BranchInventoryService,
    private readonly patientRepository: PatientRepository,
    private readonly staffRepository: StaffRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByPatient(patientId: string) {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('patientId is invalid');
    }

    return this.patientDataRepository.findByPatient(patientId);
  }

  async create(data: Record<string, any>) {
    const patientData = this.preparePatientData(data);
    const created = await this.patientDataRepository.create(patientData);
    await this.notifyDoctorAssignment(created, data);
    return created;
  }

  async update(id: string, data: Record<string, any>) {
    const existing = await this.patientDataRepository.findById(id);
    if (!existing) throw new NotFoundException(`PatientData ${id} not found`);

    const patientData = this.preparePatientData(data, true);
    await this.applyBranchInventoryAdjustments(data.branchInventoryAdjustments);
    const updated = await this.patientDataRepository.update(id, patientData);
    if (!updated) throw new NotFoundException(`PatientData ${id} not found`);
    await this.notifyMedicinesAssigned(existing, updated, data);
    return updated;
  }

  async remove(id: string) {
    const record = await this.patientDataRepository.delete(id);
    if (!record) throw new NotFoundException(`PatientData ${id} not found`);
    return { id, removed: true };
  }

  private async notifyDoctorAssignment(visit: any, data: Record<string, any>) {
    const doctorUserId = data.doctorUserId
      ? String(data.doctorUserId).trim()
      : '';
    if (!doctorUserId || !Types.ObjectId.isValid(doctorUserId)) return;

    const patient = await this.patientRepository.findById(
      visit.patientId.toString(),
    );
    if (!patient) return;

    const staff = await this.staffRepository.findOne({
      userId: new Types.ObjectId(doctorUserId),
    });
    const doctorEmail = staff?.email?.trim() || undefined;

    void this.notificationsService.dispatch(
      NotificationType.PATIENT_ASSIGNED_TO_DOCTOR,
      {
        patient,
        visit,
        doctorUserId,
        doctorName: String(data.doctor ?? visit.doctor ?? 'your doctor'),
        doctorEmail,
      },
    );
  }

  private async notifyMedicinesAssigned(
    existing: { medicines?: { name: string; quantity: number }[] },
    visit: any,
    data: Record<string, any>,
  ) {
    if (data.medicines === undefined) return;

    const medicines = Array.isArray(visit.medicines) ? visit.medicines : [];
    if (medicines.length === 0) return;
    if (!this.medicinesChanged(existing.medicines ?? [], medicines)) return;

    const patient = await this.patientRepository.findById(
      visit.patientId.toString(),
    );
    if (!patient) return;

    void this.notificationsService.dispatch(
      NotificationType.PATIENT_MEDICINES_ASSIGNED,
      {
        patient,
        visit,
        medicines,
      },
    );
  }

  private medicinesChanged(
    before: { name: string; quantity: number }[],
    after: { name: string; quantity: number }[],
  ): boolean {
    const serialize = (list: { name: string; quantity: number }[]) =>
      JSON.stringify(
        [...list]
          .map((m) => ({ name: m.name, quantity: m.quantity }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    return serialize(before) !== serialize(after);
  }

  private preparePatientData(
    data: Record<string, any>,
    partial = false,
  ): Partial<PatientData> {
    const requiredFields = ['patientId', 'problem', 'visitDate', 'doctor'];

    if (!partial) {
      requiredFields.forEach((field) => {
        const value = data[field];
        if (
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '')
        ) {
          throw new BadRequestException(`${field} is required`);
        }
      });
    }

    if (
      data.patientId !== undefined &&
      !Types.ObjectId.isValid(data.patientId)
    ) {
      throw new BadRequestException('patientId is invalid');
    }

    const patientData: Partial<PatientData> = {};
    if (data.patientId)
      patientData.patientId = new Types.ObjectId(data.patientId);
    if (data.problem !== undefined)
      patientData.problem = String(data.problem).trim();
    if (data.visitDate !== undefined)
      patientData.visitDate = new Date(data.visitDate);
    if (data.category !== undefined)
      patientData.category = String(data.category).trim();
    if (data.medicines !== undefined) {
      patientData.medicines = Array.isArray(data.medicines)
        ? data.medicines
            .map((medicine: unknown) => this.normalizeMedicine(medicine))
            .filter(
              (medicine): medicine is { name: string; quantity: number } =>
                medicine !== null,
            )
        : [];
    }
    if (data.doctor !== undefined)
      patientData.doctor = String(data.doctor).trim();
    if (
      data.doctorUserId !== undefined &&
      data.doctorUserId !== null &&
      String(data.doctorUserId).trim() !== ''
    ) {
      if (!Types.ObjectId.isValid(String(data.doctorUserId))) {
        throw new BadRequestException('doctorUserId is invalid');
      }
      patientData.doctorUserId = new Types.ObjectId(String(data.doctorUserId));
    }
    if (data.nurse !== undefined)
      patientData.nurse = String(data.nurse).trim();
    if (
      data.nurseUserId !== undefined &&
      data.nurseUserId !== null &&
      String(data.nurseUserId).trim() !== ''
    ) {
      if (!Types.ObjectId.isValid(String(data.nurseUserId))) {
        throw new BadRequestException('nurseUserId is invalid');
      }
      patientData.nurseUserId = new Types.ObjectId(String(data.nurseUserId));
    }
    if (data.notes !== undefined) patientData.notes = String(data.notes).trim();
    if (data.recommendedTests !== undefined) {
      patientData.recommendedTests = Array.isArray(data.recommendedTests)
        ? data.recommendedTests.map((t: unknown) => String(t).trim()).filter(t => t !== '')
        : [];
    }
    if (data.isActive !== undefined)
      patientData.isActive = Boolean(data.isActive);

    return patientData;
  }

  private normalizeMedicine(
    medicine: unknown,
  ): PatientMedicine | null {
    if (typeof medicine === 'string') {
      const trimmed = medicine.trim();
      if (!trimmed) return null;

      const match = trimmed.match(/^(.*?)\s+x\s+(\d+(?:\.\d+)?)$/i);
      return {
        name: (match?.[1] ?? trimmed).trim(),
        quantity: match ? Number(match[2]) : 1,
      };
    }

    if (!medicine || typeof medicine !== 'object') return null;

    const item = medicine as any;
    const name = String(item.name ?? item.medicineName ?? '').trim();
    const quantity = Number(item.quantity ?? 1);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;

    return {
      name,
      quantity,
      days: item.days ? Number(item.days) : undefined,
      sessions: Array.isArray(item.sessions) ? item.sessions.map(String) : undefined,
      quantityPerSession: item.quantityPerSession ? Number(item.quantityPerSession) : undefined,
    };
  }

  private async applyBranchInventoryAdjustments(adjustments: unknown) {
    if (adjustments === undefined) return;
    if (!Array.isArray(adjustments)) {
      throw new BadRequestException(
        'branchInventoryAdjustments must be an array',
      );
    }

    for (const adjustment of adjustments) {
      const item = adjustment as BranchInventoryAdjustment;
      if (!Types.ObjectId.isValid(item.branchId)) {
        throw new BadRequestException('branchId is invalid');
      }
      if (!Types.ObjectId.isValid(item.itemId)) {
        throw new BadRequestException('itemId is invalid');
      }
      if (!item.batchNo || String(item.batchNo).trim() === '') {
        throw new BadRequestException('batchNo is required');
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException('quantity must be greater than 0');
      }

      // Check available stock in branch inventory before deducting
      const stocks = await this.branchInventoryService.findByBranchAndItem(item.branchId, item.itemId);
      const batchStock = stocks.find(s => s.batchNo === item.batchNo);
      const availableQty = batchStock ? batchStock.availableQty : 0;
      if (availableQty < quantity) {
        throw new BadRequestException(`Calculated quantity (${quantity}) exceeds available stock (${availableQty})`);
      }

      await this.branchInventoryService.adjustStock(
        item.branchId,
        item.itemId,
        -quantity,
        String(item.batchNo).trim(),
        item.expiryDate ? new Date(item.expiryDate) : null,
      );
    }
  }

  async getVisitSuggestions(problem: string): Promise<any> {
    try {
      const prompt = `Analyze these patient symptoms/problems and provide potential diagnoses, suggested medication categories, and recommended vital signs checks.
Symptom/Problem: ${problem}

Return ONLY valid JSON with this exact shape:
{
  "potentialDiagnoses": ["Diagnosis 1", "Diagnosis 2"],
  "suggestedMedicineCategories": ["Category 1", "Category 2"],
  "recommendedVitalsToCheck": ["Vital check 1", "Vital check 2"]
}`;

      const response = await llmInstance.invoke([
        new SystemMessage('You are a helpful clinical diagnostics helper. Respond in JSON only.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      // Fallback
    }

    return {
      potentialDiagnoses: ['Underlying viral infection', 'General symptom check required'],
      suggestedMedicineCategories: ['Analgesics', 'Antipyretics'],
      recommendedVitalsToCheck: ['Body Temperature', 'Blood Pressure', 'Pulse Rate'],
    };
  }

  async getPrescriptionValidation(data: { diagnosis: string; medicines: { name: string; quantity: number }[] }): Promise<any> {
    try {
      const prompt = `Validate this prescription against the patient diagnosis for safety warning alerts, potential drug interactions, and dietary/serving advice.
Diagnosis: ${data.diagnosis}
Medicines: ${JSON.stringify(data.medicines)}

Return ONLY valid JSON with this exact shape:
{
  "safetyWarnings": ["Warning 1", "Warning 2"],
  "dietaryAdvice": "Dietary guidelines summary",
  "suggestedAlternatives": [
    {
      "prescribed": "Medicine Name",
      "alternative": "Alternative Medicine Name",
      "reason": "Lower interactions or general match suggestion"
    }
  ]
}`;

      const response = await llmInstance.invoke([
        new SystemMessage('You are a clinical pharmacologist validator. Respond in JSON only.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      // Fallback
    }

    return {
      safetyWarnings: ['Ensure dosage fits the severity of symptoms'],
      dietaryAdvice: 'Take medications after meals with water.',
      suggestedAlternatives: [],
    };
  }

  async sendPrescriptionEmail(payload: {
    patientName: string;
    patientEmail: string;
    problem: string;
    visits: Array<{
      visitDate: string;
      doctor?: string;
      medicines: Array<{ name: string; quantity: number; days?: number; sessions?: string[]; quantityPerSession?: number }>;
      recommendedTests?: string[];
      notes?: string;
    }>;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const visitsHtml = payload.visits
      .map((v) => {
        const medicinesRows = v.medicines
          .map((m) => {
            const timingParts: string[] = [];
            if (m.days) timingParts.push(`${m.days} days`);
            if (m.sessions?.length) timingParts.push(m.sessions.join(' / '));
            if (m.quantityPerSession) timingParts.push(`${m.quantityPerSession} per dose`);
            return `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b">${m.name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;text-align:center">${m.quantity}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569">${timingParts.join(', ') || '—'}</td>
              </tr>`;
          })
          .join('');

        const testsHtml = v.recommendedTests?.length
          ? `<div style="margin-top:10px">
              <p style="font-size:12px;font-weight:600;color:#64748b;margin:0 0 6px">RECOMMENDED TESTS</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px">${v.recommendedTests.map((t) => `<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 10px;font-size:12px;color:#334155">${t}</span>`).join('')}</div>
            </div>`
          : '';

        const notesHtml = v.notes
          ? `<div style="margin-top:10px;padding:10px;background:#fafafa;border-left:3px solid #94a3b8;border-radius:4px">
              <p style="font-size:12px;font-weight:600;color:#64748b;margin:0 0 4px">NOTES</p>
              <p style="font-size:13px;color:#475569;margin:0;font-style:italic">${v.notes}</p>
            </div>`
          : '';

        return `
          <div style="margin-bottom:20px;padding:16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff">
            <p style="font-size:12px;font-weight:600;color:#64748b;margin:0 0 10px;letter-spacing:.05em">
              ${v.visitDate}${v.doctor ? ` &middot; ${v.doctor}` : ''}
            </p>
            ${v.medicines.length ? `
            <table width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">MEDICINE</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600">QTY</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600">TIMING / DOSAGE</th>
                </tr>
              </thead>
              <tbody>${medicinesRows}</tbody>
            </table>` : ''}
            ${testsHtml}${notesHtml}
          </div>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
        <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
          <div style="background:linear-gradient(135deg,#0f766e,#0369a1);padding:24px 28px">
            <p style="margin:0;font-size:11px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.1em">PRESCRIPTION</p>
            <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff">${payload.patientName}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.8)">Problem: ${payload.problem}</p>
          </div>
          <div style="padding:24px 28px">
            ${visitsHtml}
          </div>
          <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;font-size:11px;color:#94a3b8">This prescription was sent digitally. Please follow your doctor's instructions carefully.</p>
          </div>
        </div>
      </body>
      </html>`;

    await transporter.sendMail({
      from: `GHC Portal <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: payload.patientEmail,
      subject: `Prescription for ${payload.patientName} — ${payload.problem}`,
      html,
    });

    return { success: true };
  }
}
