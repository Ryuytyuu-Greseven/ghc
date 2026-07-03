import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class HospitalRepository {
  constructor(
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: any = {}): Promise<HospitalDocument[]> {
    const mergedFilter = { isCurrent: { $ne: false }, ...filter };
    return this.hospitalModel.find(mergedFilter).exec();
  }

  async findById(id: string): Promise<HospitalDocument | null> {
    return this.hospitalModel.findById(id).exec();
  }

  async findCurrentByHospitalId(hospitalId: string): Promise<HospitalDocument | null> {
    return this.hospitalModel.findOne({ hospitalId, isCurrent: { $ne: false } }).exec();
  }

  async findHistory(hospitalId: string): Promise<HospitalDocument[]> {
    return this.hospitalModel.find({
      $or: [
        { hospitalId: hospitalId },
        { _id: hospitalId }
      ]
    }).sort({ version: -1 }).exec();
  }

  async findOne(filter: any): Promise<HospitalDocument | null> {
    const mergedFilter = { isCurrent: { $ne: false }, ...filter };
    return this.hospitalModel.findOne(mergedFilter).exec();
  }

  async create(data: Partial<Hospital>): Promise<HospitalDocument> {
    return this.hospitalModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<HospitalDocument>,
  ): Promise<HospitalDocument | null> {
    return this.hospitalModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<HospitalDocument | null> {
    return this.hospitalModel.findByIdAndDelete(id).exec();
  }

  async count(filter: any = {}): Promise<number> {
    const mergedFilter = { isCurrent: { $ne: false }, ...filter };
    return this.hospitalModel.countDocuments(mergedFilter).exec();
  }

  async findPaginated(options: any, extraFilter: any = {}): Promise<{ data: HospitalDocument[]; total: number; page: number; pageSize: number }> {
    const queryOptions = { ...options };

    const { filter, sort, skip, limit, page, pageSize } = this.queryService.buildQuery(queryOptions, {
      searchFields: ['name', 'city', 'address', 'medicalOfficer'],
      exactFilters: ['type', 'isActive', 'isCurrent'],
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    const finalFilter = { isCurrent: { $ne: false }, isActive: { $ne: false }, ...filter, ...extraFilter };

    const total = await this.hospitalModel.countDocuments(finalFilter).exec();
    const data = await this.hospitalModel.find(finalFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return { data, total, page, pageSize };
  }
}
