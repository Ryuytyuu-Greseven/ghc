import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';

@Injectable()
export class HospitalRepository {
  constructor(
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<HospitalDocument[]> {
    return this.hospitalModel.find(filter).exec();
  }

  async findById(id: string): Promise<HospitalDocument | null> {
    return this.hospitalModel.findById(id).exec();
  }

  async findOne(filter: object): Promise<HospitalDocument | null> {
    return this.hospitalModel.findOne(filter).exec();
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

  async count(filter: object = {}): Promise<number> {
    return this.hospitalModel.countDocuments(filter).exec();
  }
}
