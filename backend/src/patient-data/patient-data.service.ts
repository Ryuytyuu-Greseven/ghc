import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientDataRepository } from '../repositories/patient-data.repository';
import { PatientData } from '../schemas/patient-data.schema';
import { BranchInventoryService } from '../inventory/branch-inventory/branch-inventory.service';

type BranchInventoryAdjustment = {
  branchId: string;
  itemId: string;
  quantity: number;
  batchNo: string;
  expiryDate?: string | Date | null;
};

@Injectable()
export class PatientDataService {
  constructor(
    private readonly patientDataRepository: PatientDataRepository,
    private readonly branchInventoryService: BranchInventoryService,
  ) {}

  async findByPatient(patientId: string) {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('patientId is invalid');
    }

    return this.patientDataRepository.findByPatient(patientId);
  }

  async create(data: Record<string, any>) {
    const patientData = this.preparePatientData(data);
    return this.patientDataRepository.create(patientData);
  }

  async update(id: string, data: Record<string, any>) {
    const existing = await this.patientDataRepository.findById(id);
    if (!existing) throw new NotFoundException(`PatientData ${id} not found`);

    const patientData = this.preparePatientData(data, true);
    await this.applyBranchInventoryAdjustments(data.branchInventoryAdjustments);
    const updated = await this.patientDataRepository.update(id, patientData);
    if (!updated) throw new NotFoundException(`PatientData ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const record = await this.patientDataRepository.delete(id);
    if (!record) throw new NotFoundException(`PatientData ${id} not found`);
    return { id, removed: true };
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
        ? data.medicines.map((medicine: unknown) => String(medicine).trim()).filter(Boolean)
        : [];
    }
    if (data.doctor !== undefined) patientData.doctor = String(data.doctor).trim();
    if (data.notes !== undefined) patientData.notes = String(data.notes).trim();
    if (data.isActive !== undefined) patientData.isActive = Boolean(data.isActive);

    return patientData;
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
