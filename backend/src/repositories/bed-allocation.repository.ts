import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import {
  BedAllocation,
  BedAllocationDocument,
} from '../schemas/bed-allocation.schema';

@Injectable()
export class BedAllocationRepository {
  constructor(
    @InjectModel(BedAllocation.name)
    private readonly model: Model<BedAllocationDocument>,
  ) {}

  async create(data: Partial<BedAllocation>): Promise<BedAllocationDocument> {
    return this.model.create(data);
  }

  async findOne(filter: object): Promise<BedAllocationDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async update(
    id: string,
    data: UpdateQuery<BedAllocationDocument>,
  ): Promise<BedAllocationDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async findById(id: string): Promise<BedAllocationDocument | null> {
    return this.model.findById(id).exec();
  }

  async findByHospital(hospitalId: string): Promise<BedAllocationDocument[]> {
    return this.model
      .find({ hospitalId: new Types.ObjectId(hospitalId) })
      .populate('patientId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
