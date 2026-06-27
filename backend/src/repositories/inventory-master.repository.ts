import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { InventoryMaster, InventoryMasterDocument } from '../schemas/inventory-master.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class InventoryMasterRepository {
  constructor(
    @InjectModel(InventoryMaster.name)
    private readonly model: Model<InventoryMasterDocument>,
    private readonly queryService: QueryService,
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
        ],
      })
      .sort({ itemName: 1 })
      .exec();
  }

  async findPaginated(options: any) {
    const { filter, sort, skip, limit, page, pageSize } = this.queryService.buildQuery(options, {
      searchFields: ['itemName'],
      exactFilters: ['category', 'status'],
      defaultSort: { field: 'itemName', order: 'asc' },
    });

    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, total, page, pageSize };
  }

  async findByCategory(category: string): Promise<InventoryMasterDocument[]> {
    return this.model.find({ category: category as any }).sort({ itemName: 1 }).exec();
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
