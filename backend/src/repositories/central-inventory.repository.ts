import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { CentralInventory, CentralInventoryDocument } from '../inventory/schemas/central-inventory.schema';

@Injectable()
export class CentralInventoryRepository {
  constructor(
    @InjectModel(CentralInventory.name)
    private readonly model: Model<CentralInventoryDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<CentralInventoryDocument[]> {
    return this.model.find(filter).populate('itemId').sort({ 'itemId.itemName': 1 }).exec();
  }

  async findById(id: string): Promise<CentralInventoryDocument | null> {
    return this.model.findById(id).populate('itemId').exec();
  }

  async findOne(filter: object): Promise<CentralInventoryDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findByItem(itemId: string): Promise<CentralInventoryDocument[]> {
    return this.model
      .find({ itemId })
      .sort({ expiryDate: 1 })
      .exec();
  }

  async findLowStock(threshold: number): Promise<CentralInventoryDocument[]> {
    return this.model.find({ availableQty: { $lte: threshold } }).populate('itemId').exec();
  }

  async create(data: Partial<CentralInventory>): Promise<CentralInventoryDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<CentralInventoryDocument>,
  ): Promise<CentralInventoryDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<CentralInventoryDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async findPaginated(params: {
    skip: number;
    limit: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
    expired?: boolean;
    expiringSoon?: boolean;
    batch?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: any[];
    total: number;
    summary: {
      totalAvailable: number;
      totalDamaged: number;
      lowStockCount: number;
      expiringCount: number;
    };
  }> {
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'inventorymasters',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
    ];

    const match: any = {};

    if (params.search) {
      match.$or = [
        { 'item.itemName': { $regex: params.search, $options: 'i' } },
        { 'item.itemCode': { $regex: params.search, $options: 'i' } },
      ];
    }

    if (params.category) {
      match['item.category'] = params.category;
    }

    if (params.status) {
      match['item.status'] = params.status;
    }

    if (params.batch) {
      match.batchNo = { $regex: params.batch, $options: 'i' };
    }

    if (params.lowStock) {
      match.availableQty = { $lte: 50 };
    }

    if (params.expired) {
      match.expiryDate = { $ne: null, $lt: new Date() };
    } else if (params.expiringSoon) {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      match.expiryDate = {
        $ne: null,
        $gte: new Date(),
        $lte: ninetyDaysFromNow,
      };
    }

    pipeline.push({ $match: match });

    // Count query
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    // Sorting
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'desc';
    const sortVal = sortOrder === 'desc' ? -1 : 1;

    let sortField = sortBy;
    if (sortBy === 'itemName') {
      sortField = 'item.itemName';
    } else if (sortBy === 'itemCode') {
      sortField = 'item.itemCode';
    }

    pipeline.push({ $sort: { [sortField]: sortVal } });
    pipeline.push({ $skip: params.skip }, { $limit: params.limit });

    // Project to map back to expected DTO structure (itemId)
    pipeline.push({
      $project: {
        _id: 1,
        itemId: '$item',
        availableQty: 1,
        damagedQty: 1,
        batchNo: 1,
        expiryDate: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const [data, statsResult, lowStockCount, expiringCount] = await Promise.all([
      this.model.aggregate(pipeline).exec(),
      this.model.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAvailable: { $sum: '$availableQty' },
            totalDamaged: { $sum: '$damagedQty' },
          },
        },
      ]).exec(),
      this.model.countDocuments({ ...match, availableQty: { $lte: 50 } }).exec(),
      this.model.countDocuments({
        ...match,
        expiryDate: {
          $ne: null,
          $gte: new Date(),
          $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      }).exec(),
    ]);

    const totalAvailable = statsResult[0]?.totalAvailable ?? 0;
    const totalDamaged = statsResult[0]?.totalDamaged ?? 0;

    return {
      data,
      total,
      summary: {
        totalAvailable,
        totalDamaged,
        lowStockCount,
        expiringCount,
      },
    };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
