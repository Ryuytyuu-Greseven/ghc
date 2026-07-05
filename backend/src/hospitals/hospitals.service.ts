import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { HospitalRepository } from '../repositories/hospital.repository';
import { Hospital } from '../schemas/hospital.schema';
import { buildPaginatedResponse } from '../inventory/utils/pagination.util';
import { BedAllocationRepository } from '../repositories/bed-allocation.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { LocationsService } from '../locations/locations.service';

@Injectable()
export class HospitalsService {
  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly bedAllocationRepository: BedAllocationRepository,
    private readonly notificationsService: NotificationsService,
    private readonly locationsService: LocationsService,
  ) {}

  private mapLocationNames(hospital: any) {
    if (!hospital) return hospital;
    const doc = hospital.toObject ? hospital.toObject() : hospital;
    const stateCode = doc.state;
    const cityCode = doc.city;

    doc.stateCode = stateCode;
    doc.cityCode = cityCode;

    doc.state = this.locationsService.getStateName(stateCode) || doc.state;
    doc.city = this.locationsService.getDistrictName(cityCode) || doc.city;

    return doc;
  }

  async getAllHospitals(
    query: Record<string, any> = {},
    extraFilter: Record<string, any> = {},
  ) {
    // If no pagination properties are provided, return the flat backwards-compatible array
    if (
      query.page === undefined &&
      query.pageSize === undefined &&
      query.limit === undefined
    ) {
      const res = await this.hospitalRepository.findAll({
        isActive: true,
        ...extraFilter,
      });
      return res.map(h => this.mapLocationNames(h));
    }

    // Map 'limit' to 'pageSize' if passed
    if (query.limit && !query.pageSize) {
      query.pageSize = query.limit;
    }

    const { data, total, page, pageSize } =
      await this.hospitalRepository.findPaginated(query, extraFilter);
    const mappedData = data.map(h => this.mapLocationNames(h));
    return buildPaginatedResponse(mappedData, total, page, pageSize);
  }

  async getHospitalById(id: string) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    // If it's an archive version, automatically resolve to current active version details
    let activeDoc = hospital;
    if (!hospital.isCurrent && hospital.hospitalId) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(
        hospital.hospitalId,
      );
      if (current) activeDoc = current;
    }
    return this.mapLocationNames(activeDoc);
  }

  async createHospital(data: Partial<Hospital>, userId?: string, performedBy?: string) {
    const generatedId = new Types.ObjectId().toString();
    const docData = {
      ...data,
      _id: generatedId,
      hospitalId: generatedId,
      version: 1,
      isCurrent: true,
    };
    const created = await this.hospitalRepository.create(docData);
    void this.notificationsService.dispatch(NotificationType.HOSPITAL_ONBOARDED, {
      hospital: this.mapLocationNames(created),
      userId,
      performedBy,
    });
    return this.mapLocationNames(created);
  }

  async updateHospital(id: string, data: Partial<Hospital>, userId?: string, performedBy?: string) {
    // 1. Find the target version document
    const oldDoc = await this.hospitalRepository.findById(id);
    if (!oldDoc) throw new NotFoundException(`Hospital ${id} not found`);

    const logicalId = oldDoc.hospitalId || oldDoc._id.toString();

    // Safety: If the requested document is not the current active version, resolve to the current active version
    let activeDoc = oldDoc;
    if (!oldDoc.isCurrent) {
      const current =
        await this.hospitalRepository.findCurrentByHospitalId(logicalId);
      if (current) {
        activeDoc = current;
      }
    }

    // 2. Set the current version isCurrent to false
    await this.hospitalRepository.update(activeDoc._id.toString(), {
      isCurrent: false,
    });

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

    const created = await this.hospitalRepository.create(newDocData);

    const changedFields: string[] = [];
    Object.keys(data).forEach(key => {
      const val1 = activeDoc.get(key);
      const val2 = data[key as keyof Partial<Hospital>];
      if (val1 !== val2 && val2 !== undefined) {
        changedFields.push(key);
      }
    });
    const changes = changedFields.length > 0
      ? `Updated fields: ${changedFields.join(', ')}`
      : 'Profile information updated';

    void this.notificationsService.dispatch(NotificationType.HOSPITAL_UPDATED, {
      hospital: this.mapLocationNames(created),
      changes,
      userId,
      performedBy,
    });

    return this.mapLocationNames(created);
  }

  async deleteHospital(id: string) {
    const hospital = await this.hospitalRepository.delete(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    return { id, removed: true };
  }

  async getHospitalHistory(hospitalId: string) {
    const history = await this.hospitalRepository.findHistory(hospitalId);
    return history.map(h => this.mapLocationNames(h));
  }

  async getHospitalBedAllocations(id: string) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);

    const logicalId = hospital.hospitalId || hospital._id.toString();
    return this.bedAllocationRepository.findByHospital(logicalId);
  }
}
