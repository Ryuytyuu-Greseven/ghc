import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { InventoryMaster, InventoryMasterDocument } from '../inventory/schemas/inventory-master.schema';

@Injectable()
export class InventoryMasterRepository {
  constructor(
    @InjectModel(InventoryMaster.name)
    private readonly model: Model<InventoryMasterDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<InventoryMasterDocument[]> {
    return this.model.find(filter).sort({ itemName: 1 }).exec();
  }

  async findById(id: string): Promise<InventoryMasterDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: object): Promise<InventoryMasterDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async search(query: string): Promise<InventoryMasterDocument[]> {
    return this.model
      .find({
        $or: [
          { itemName: { $regex: query, $options: 'i' } },
          { itemCode: { $regex: query, $options: 'i' } },
        ],
      })
      .sort({ itemName: 1 })
      .exec();
  }

  async findPaginated(
    filter: object,
    skip: number,
    limit: number,
    sortBy = 'itemName',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<InventoryMasterDocument[]> {
    const sortVal = sortOrder === 'desc' ? -1 : 1;
    return this.model
      .find(filter)
      .sort({ [sortBy]: sortVal })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async create(data: Partial<InventoryMaster>): Promise<InventoryMasterDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<InventoryMasterDocument>,
  ): Promise<InventoryMasterDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<InventoryMasterDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
