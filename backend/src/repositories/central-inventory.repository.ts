import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { CentralInventory, CentralInventoryDocument } from '../schemas/central-inventory.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class CentralInventoryRepository {
  constructor(
    @InjectModel(CentralInventory.name)
    private readonly model: Model<CentralInventoryDocument>,
    private readonly queryService: QueryService,
  ) { }

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

  async findPaginated(options: any): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    summary: {
      totalAvailable: number;
      totalDamaged: number;
      lowStockCount: number;
      expiringCount: number;
    };
  }> {
    const queryOptions = { ...options };
    if (options.category) {
      queryOptions['item.category'] = options.category;
      delete queryOptions.category;
    }
    if (options.status) {
      queryOptions['item.status'] = options.status;
      delete queryOptions.status;
    }
    if (options.batch) {
      queryOptions.batchNo = options.batch;
      delete queryOptions.batch;
    }

    const { filter, sort, skip, limit, page, pageSize } = this.queryService.buildQuery(queryOptions, {
      // searchFields: ['item.itemName'],
      // exactFilters: ['item.category', 'item.status', 'batchNo'],
      searchFields: [],
      exactFilters: [],
      fuzzySearch: true,
      sortMapping: {
        itemName: 'item.itemName',
      },
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    // Special handlers for alert types mapping to filter
    if (options.lowStock === 'true' || options.lowStock === true) {
      filter.availableQty = { $lte: 50 };
    }
    if (options.expired === 'true' || options.expired === true) {
      filter.expiryDate = { $ne: null, $lt: new Date() };
    } else if (options.expiringSoon === 'true' || options.expiringSoon === true) {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      filter.expiryDate = {
        $ne: null,
        $gte: new Date(),
        $lte: ninetyDaysFromNow,
      };
    }

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
      { $match: filter },
    ];

    // Count query
    const countPipeline = [...pipeline, { $count: 'total' }];
    console.log('Pipelines: ', JSON.stringify(pipeline));
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip }, { $limit: limit });

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

    const deta = await this.model.aggregate(pipeline).exec();
    console.log('furst query', deta);
    const [data, statsResult, lowStockCount, expiringCount] = await Promise.all([
      this.model.aggregate(pipeline).exec(),
      this.model.aggregate([
        {
          $lookup: {
            from: 'inventorymasters',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAvailable: { $sum: '$availableQty' },
            totalDamaged: { $sum: '$damagedQty' },
          },
        },
      ]).exec(),
      this.model.aggregate([
        {
          $lookup: {
            from: 'inventorymasters',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        {
          $match: {
            ...filter,
            availableQty: { $lte: 50 },
          },
        },
        { $count: 'count' },
      ]).exec(),
      this.model.aggregate([
        {
          $lookup: {
            from: 'inventorymasters',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        {
          $match: {
            ...filter,
            expiryDate: {
              $ne: null,
              $gte: new Date(),
              $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
        { $count: 'count' },
      ]).exec(),
    ]);

    const totalAvailable = statsResult[0]?.totalAvailable ?? 0;
    const totalDamaged = statsResult[0]?.totalDamaged ?? 0;

    return {
      data,
      total,
      page,
      pageSize,
      summary: {
        totalAvailable,
        totalDamaged,
        lowStockCount: lowStockCount[0]?.count ?? 0,
        expiringCount: expiringCount[0]?.count ?? 0,
      },
    };
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

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
