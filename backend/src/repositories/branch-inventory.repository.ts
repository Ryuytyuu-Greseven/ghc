import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import {
  BranchInventory,
  BranchInventoryDocument,
} from '../schemas/branch-inventory.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class BranchInventoryRepository {
  constructor(
    @InjectModel(BranchInventory.name)
    private readonly model: Model<BranchInventoryDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<BranchInventoryDocument[]> {
    return this.model.find(filter).populate('itemId').exec();
  }

  async findByBranchAndCategory(
    branchId: string,
    category: string,
  ): Promise<any[]> {
    const pipeline = [
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
          branchId: new Types.ObjectId(branchId),
          'item.category': category,
        },
      },
      {
        $project: {
          _id: 1,
          branchId: 1,
          itemId: '$item',
          availableQty: 1,
          damagedQty: 1,
          batchNo: 1,
          expiryDate: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];
    return this.model.aggregate(pipeline).exec();
  }

  async findById(id: string): Promise<BranchInventoryDocument | null> {
    return this.model.findById(id).populate('itemId').exec();
  }

  async findOne(filter: object): Promise<BranchInventoryDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findByBranch(branchId: string): Promise<BranchInventoryDocument[]> {
    return this.model
      .find({ branchId })
      .populate('itemId')
      .sort({ 'itemId.itemName': 1 })
      .exec();
  }

  async findByBranchAndItem(
    branchId: string,
    itemId: string,
  ): Promise<BranchInventoryDocument[]> {
    return this.model.find({ branchId, itemId }).exec();
  }

  async findByItem(itemId: string): Promise<BranchInventoryDocument[]> {
    return this.model.find({ itemId }).populate('branchId').exec();
  }

  async upsertBranchStock(
    branchId: string,
    itemId: string,
    qty: number,
    batchNo: string,
    expiryDate: Date | null = null,
  ): Promise<BranchInventoryDocument> {
    return this.model
      .findOneAndUpdate(
        { branchId, itemId, batchNo },
        {
          $inc: { availableQty: qty },
          $setOnInsert: { damagedQty: 0, expiryDate },
        },
        { new: true, upsert: true },
      )
      .exec() as Promise<BranchInventoryDocument>;
  }

  async create(
    data: Partial<BranchInventory>,
  ): Promise<BranchInventoryDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<BranchInventoryDocument>,
  ): Promise<BranchInventoryDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<BranchInventoryDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async findPaginated(
    options: any,
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const queryOptions = { ...options };
    if (options.category) {
      queryOptions['item.category'] = options.category;
      delete queryOptions.category;
    }

    const { filter, sort, skip, limit, page, pageSize } =
      this.queryService.buildQuery(queryOptions, {
        searchFields: ['branch.name', 'item.itemName', 'batchNo'],
        exactFilters: ['item.category', 'branchId'],
        objectIdFilters: ['branchId'],
        fuzzySearch: true,
        sortMapping: {
          itemName: 'item.itemName',
          branchName: 'branch.name',
        },
        defaultSort: { field: 'createdAt', order: 'desc' },
      });

    if (options.lowStock === 'true' || options.lowStock === true) {
      filter.availableQty = { $lte: 50 };
    }
    if (options.expired === 'true' || options.expired === true) {
      filter.expiryDate = { $ne: null, $lt: new Date() };
    } else if (
      options.expiringSoon === 'true' ||
      options.expiringSoon === true
    ) {
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
      {
        $lookup: {
          from: 'hospitals',
          localField: 'branchId',
          foreignField: '_id',
          as: 'branch',
        },
      },
      { $unwind: '$branch' },
      { $match: filter },
    ];

    // Count query
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Project to map back to expected populated DTO structure
    pipeline.push({
      $project: {
        _id: 1,
        branchId: '$branch',
        itemId: '$item',
        availableQty: 1,
        damagedQty: 1,
        batchNo: 1,
        expiryDate: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const data = await this.model.aggregate(pipeline).exec();
    return { data, total, page, pageSize };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
