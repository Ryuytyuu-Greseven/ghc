import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Staff, StaffDocument } from '../schemas/staff.schema';

@Injectable()
export class StaffRepository {
  constructor(
    @InjectModel(Staff.name)
    private readonly staffModel: Model<StaffDocument>,
  ) { }

  async findAll(filter: object = {}): Promise<StaffDocument[]> {
    return this.staffModel.find(filter).populate('hospitalId').populate('userId').exec();
  }

  async findById(id: string): Promise<StaffDocument | null> {
    return this.staffModel.findById(id).populate('hospitalId').populate('userId').exec();
  }

  async findOne(filter: object): Promise<StaffDocument | null> {
    return this.staffModel.findOne(filter).populate('hospitalId').populate('userId').exec();
  }

  async findByHospital(hospitalId: string): Promise<StaffDocument[]> {
    return this.staffModel.find({ hospitalId }).populate('hospitalId').populate('userId').exec();
  }

  async create(data: Partial<Staff>): Promise<StaffDocument> {
    return this.staffModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<StaffDocument>,
  ): Promise<StaffDocument | null> {
    return this.staffModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<StaffDocument | null> {
    return this.staffModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.staffModel.countDocuments(filter).exec();
  }
}
