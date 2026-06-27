import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HospitalRepository } from '../repositories/hospital.repository';
import { Hospital } from '../schemas/hospital.schema';
import { buildPaginatedResponse } from '../inventory/utils/pagination.util';

@Injectable()
export class HospitalsService {
  constructor(private readonly hospitalRepository: HospitalRepository) {}

  async getAllHospitals(query: Record<string, any> = {}) {
    // If no pagination properties are provided, return the flat backwards-compatible array
    if (query.page === undefined && query.pageSize === undefined && query.limit === undefined) {
      return this.hospitalRepository.findAll({ isActive: true });
    }

    // Map 'limit' to 'pageSize' if passed
    if (query.limit && !query.pageSize) {
      query.pageSize = query.limit;
    }

    const { data, total, page, pageSize } = await this.hospitalRepository.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async getHospitalById(id: string) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    // If it's an archive version, automatically resolve to current active version details
    if (!hospital.isCurrent && hospital.hospitalId) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(hospital.hospitalId);
      if (current) return current;
    }
    return hospital;
  }

  async createHospital(data: Partial<Hospital>) {
    const generatedId = new Types.ObjectId().toString();
    const docData = {
      ...data,
      _id: generatedId,
      hospitalId: generatedId,
      version: 1,
      isCurrent: true,
    };
    return this.hospitalRepository.create(docData);
  }

  async updateHospital(id: string, data: Partial<Hospital>) {
    // 1. Find the target version document
    const oldDoc = await this.hospitalRepository.findById(id);
    if (!oldDoc) throw new NotFoundException(`Hospital ${id} not found`);

    const logicalId = oldDoc.hospitalId || oldDoc._id.toString();

    // Safety: If the requested document is not the current active version, resolve to the current active version
    let activeDoc = oldDoc;
    if (!oldDoc.isCurrent) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(logicalId);
      if (current) {
        activeDoc = current;
      }
    }

    // 2. Set the current version isCurrent to false
    await this.hospitalRepository.update(activeDoc._id.toString(), { isCurrent: false });

    // 3. Create a fresh document for the new version
    const newDocData: any = {
      ...activeDoc.toObject(),
      ...data,
      _id: new Types.ObjectId(),
      hospitalId: logicalId,
      version: (activeDoc.version || 1) + 1,
      isCurrent: true,
    };
    delete newDocData.createdAt;
    delete newDocData.updatedAt;

    return this.hospitalRepository.create(newDocData);
  }

  async deleteHospital(id: string) {
    const hospital = await this.hospitalRepository.delete(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    return { id, removed: true };
  }

  async getHospitalHistory(hospitalId: string) {
    return this.hospitalRepository.findHistory(hospitalId);
  }
}
