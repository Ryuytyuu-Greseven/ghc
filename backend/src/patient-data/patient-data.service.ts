import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientDataRepository } from '../repositories/patient-data.repository';
import { PatientData } from '../schemas/patient-data.schema';
import { BranchInventoryService } from '../inventory/branch-inventory/branch-inventory.service';
import { PatientRepository } from '../repositories/patient.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';

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
    const doctorUserId = data.doctorUserId ? String(data.doctorUserId).trim() : '';
    if (!doctorUserId || !Types.ObjectId.isValid(doctorUserId)) return;

    const patient = await this.patientRepository.findById(visit.patientId.toString());
    if (!patient) return;

    const staff = await this.staffRepository.findOne({ userId: new Types.ObjectId(doctorUserId) });
    const doctorEmail = staff?.email?.trim() || undefined;

    void this.notificationsService.dispatch(NotificationType.PATIENT_ASSIGNED_TO_DOCTOR, {
      patient,
      visit,
      doctorUserId,
      doctorName: String(data.doctor ?? visit.doctor ?? 'your doctor'),
      doctorEmail,
    });
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

    const patient = await this.patientRepository.findById(visit.patientId.toString());
    if (!patient) return;

    void this.notificationsService.dispatch(NotificationType.PATIENT_MEDICINES_ASSIGNED, {
      patient,
      visit,
      medicines,
    });
  }

  private medicinesChanged(
    before: { name: string; quantity: number }[],
    after: { name: string; quantity: number }[],
  ): boolean {
    const serialize = (list: { name: string; quantity: number }[]) =>
      JSON.stringify(
        [...list]
          .map(m => ({ name: m.name, quantity: m.quantity }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    return serialize(before) !== serialize(after);
  }

  private preparePatientData(data: Record<string, any>, partial = false): Partial<PatientData> {
    const requiredFields = ['patientId', 'problem', 'visitDate', 'doctor'];

    if (!partial) {
      requiredFields.forEach(field => {
        const value = data[field];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          throw new BadRequestException(`${field} is required`);
        }
      });
    }

    if (data.patientId !== undefined && !Types.ObjectId.isValid(data.patientId)) {
      throw new BadRequestException('patientId is invalid');
    }

    const patientData: Partial<PatientData> = {};
    if (data.patientId) patientData.patientId = new Types.ObjectId(data.patientId);
    if (data.problem !== undefined) patientData.problem = String(data.problem).trim();
    if (data.visitDate !== undefined) patientData.visitDate = new Date(data.visitDate);
    if (data.category !== undefined) patientData.category = String(data.category).trim();
    if (data.medicines !== undefined) {
      patientData.medicines = Array.isArray(data.medicines)
        ? data.medicines
            .map((medicine: unknown) => this.normalizeMedicine(medicine))
            .filter((medicine): medicine is { name: string; quantity: number } => medicine !== null)
        : [];
    }
    if (data.doctor !== undefined) patientData.doctor = String(data.doctor).trim();
    if (data.doctorUserId !== undefined && data.doctorUserId !== null && String(data.doctorUserId).trim() !== '') {
      if (!Types.ObjectId.isValid(String(data.doctorUserId))) {
        throw new BadRequestException('doctorUserId is invalid');
      }
      patientData.doctorUserId = new Types.ObjectId(String(data.doctorUserId));
    }
    if (data.notes !== undefined) patientData.notes = String(data.notes).trim();
    if (data.isActive !== undefined) patientData.isActive = Boolean(data.isActive);

    return patientData;
  }

  private normalizeMedicine(medicine: unknown): { name: string; quantity: number } | null {
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

    const item = medicine as PatientMedicineInput;
    const name = String(item.name ?? item.medicineName ?? '').trim();
    const quantity = Number(item.quantity ?? 1);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;

    return { name, quantity };
  }

  private async applyBranchInventoryAdjustments(adjustments: unknown) {
    if (adjustments === undefined) return;
    if (!Array.isArray(adjustments)) {
      throw new BadRequestException('branchInventoryAdjustments must be an array');
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

      await this.branchInventoryService.adjustStock(
        item.branchId,
        item.itemId,
        -quantity,
        String(item.batchNo).trim(),
        item.expiryDate ? new Date(item.expiryDate) : null,
      );
    }
  }
}
