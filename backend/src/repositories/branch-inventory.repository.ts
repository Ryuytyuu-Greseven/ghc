import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { BranchInventory, BranchInventoryDocument } from '../inventory/schemas/branch-inventory.schema';

@Injectable()
export class BranchInventoryRepository {
  constructor(
    @InjectModel(BranchInventory.name)
    private readonly model: Model<BranchInventoryDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<BranchInventoryDocument[]> {
    return this.model.find(filter).populate('itemId').exec();
  }

  async findById(id: string): Promise<BranchInventoryDocument | null> {
    return this.model.findById(id).populate('itemId').exec();
  }

  async findOne(filter: object): Promise<BranchInventoryDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findByBranch(branchId: string): Promise<BranchInventoryDocument[]> {
    return this.model.find({ branchId }).populate('itemId').sort({ 'itemId.itemName': 1 }).exec();
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
        { $inc: { availableQty: qty }, $setOnInsert: { damagedQty: 0, expiryDate } },
        { new: true, upsert: true },
      )
      .exec() as Promise<BranchInventoryDocument>;
  }

  async create(data: Partial<BranchInventory>): Promise<BranchInventoryDocument> {
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

  async findPaginated(params: {
    skip: number;
    limit: number;
    branchId?: string;
    search?: string;
    category?: string;
    lowStock?: boolean;
    expired?: boolean;
    expiringSoon?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: any[]; total: number }> {
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
    ];

    const match: any = {};

    if (params.branchId) {
      match.branchId = new Types.ObjectId(params.branchId);
    }

    if (params.search) {
      match.$or = [
        { 'branch.name': { $regex: params.search, $options: 'i' } },
        { 'item.itemName': { $regex: params.search, $options: 'i' } },
        { 'item.itemCode': { $regex: params.search, $options: 'i' } },
        { batchNo: { $regex: params.search, $options: 'i' } },
      ];
    }

    if (params.category) {
      match['item.category'] = params.category;
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
    } else if (sortBy === 'branchName') {
      sortField = 'branch.name';
    }

    pipeline.push({ $sort: { [sortField]: sortVal } });
    pipeline.push({ $skip: params.skip }, { $limit: params.limit });

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
    return { data, total };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
