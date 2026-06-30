import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { QueryService } from '../common/services/query.service';
import { buildPaginatedResponse } from '../inventory/utils/pagination.util';

@Injectable()
export class PatientRepository {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<PatientDocument[]> {
    return this.patientModel.find(filter).populate('hospitalId').exec();
  }

  async findPaginated(options: Record<string, any> = {}) {
    const { filter, sort, skip, limit, page, pageSize } = this.queryService.buildQuery(options, {
      searchFields: ['name', 'phone', 'email', 'aadhaarNumber', 'address', 'gender', 'bloodGroup'],
      exactFilters: ['bedRequired'],
      objectIdFilters: ['hospitalId'],
      defaultSort: { field: 'admittedAt', order: 'desc' },
    });
    const finalFilter = { ...filter, isActive: true };

    const [data, total] = await Promise.all([
      this.patientModel.find(finalFilter).populate('hospitalId').sort(sort).skip(skip).limit(limit).exec(),
      this.patientModel.countDocuments(finalFilter).exec(),
    ]);

    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findById(id: string): Promise<PatientDocument | null> {
    return this.patientModel.findById(id).populate('hospitalId').exec();
  }

  async findOne(filter: object): Promise<PatientDocument | null> {
    return this.patientModel.findOne(filter).populate('hospitalId').exec();
  }

  async findByHospital(hospitalId: string): Promise<PatientDocument[]> {
    return this.patientModel.find({ hospitalId }).populate('hospitalId').exec();
  }

  async findByAadhaarNumber(aadhaarNumber: string, excludeId?: string): Promise<PatientDocument | null> {
    const filter: Record<string, unknown> = { aadhaarNumber };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.patientModel.findOne(filter).exec();
  }

  async create(data: Partial<Patient>): Promise<PatientDocument> {
    return this.patientModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<PatientDocument>,
  ): Promise<PatientDocument | null> {
    return this.patientModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<PatientDocument | null> {
    return this.patientModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.patientModel.countDocuments(filter).exec();
  }
}
