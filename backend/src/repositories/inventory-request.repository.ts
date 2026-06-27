import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { InventoryRequest, InventoryRequestDocument } from '../inventory/schemas/inventory-request.schema';

@Injectable()
export class InventoryRequestRepository {
  constructor(
    @InjectModel(InventoryRequest.name)
    private readonly model: Model<InventoryRequestDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<InventoryRequestDocument[]> {
    return this.model
      .find(filter)
      .populate('branchId', 'name city')
      .populate('items.itemId', 'itemName itemCode unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<InventoryRequestDocument | null> {
    return this.model
      .findById(id)
      .populate('branchId', 'name city')
      .populate('items.itemId', 'itemName itemCode unit')
      .exec();
  }

  async findOne(filter: object): Promise<InventoryRequestDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findByBranch(branchId: string): Promise<InventoryRequestDocument[]> {
    return this.model
      .find({ branchId })
      .populate('items.itemId', 'itemName unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByStatus(status: string): Promise<InventoryRequestDocument[]> {
    return this.model
      .find({ status: status as any })
      .populate('branchId', 'name city')
      .sort({ createdAt: -1 })
      .exec();
  }

  async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    const count = await this.model
      .countDocuments({ requestNumber: { $regex: `^${prefix}` } })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `${prefix}${seq}`;
  }

  async create(data: Partial<InventoryRequest>): Promise<InventoryRequestDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<InventoryRequestDocument>,
  ): Promise<InventoryRequestDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).populate('branchId', 'name city').exec();
  }

  async findPaginated(params: {
    skip: number;
    limit: number;
    branchId?: string;
    status?: string;
    requestedBy?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: any[]; total: number }> {
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'hospitals',
          localField: 'branchId',
          foreignField: '_id',
          as: 'branch',
        },
      },
      { $unwind: '$branch' },
      {
        $lookup: {
          from: 'inventorymasters',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'matchedItems',
        },
      },
    ];

    const match: any = {};

    if (params.branchId) {
      match.branchId = new Types.ObjectId(params.branchId);
    }

    if (params.status) {
      match.status = params.status;
    }

    if (params.requestedBy) {
      match.requestedBy = { $regex: params.requestedBy, $options: 'i' };
    }

    if (params.fromDate || params.toDate) {
      match.createdAt = {};
      if (params.fromDate) match.createdAt.$gte = new Date(params.fromDate);
      if (params.toDate) match.createdAt.$lte = new Date(params.toDate);
    }

    if (params.search) {
      match.$or = [
        { requestNumber: { $regex: params.search, $options: 'i' } },
        { requestedBy: { $regex: params.search, $options: 'i' } },
        { 'branch.name': { $regex: params.search, $options: 'i' } },
        { 'matchedItems.itemName': { $regex: params.search, $options: 'i' } },
      ];
    }

    pipeline.push({ $match: match });

    // Count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    // Sorting
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'desc';
    const sortVal = sortOrder === 'desc' ? -1 : 1;

    let sortField = sortBy;
    if (sortBy === 'branchName') {
      sortField = 'branch.name';
    }

    pipeline.push({ $sort: { [sortField]: sortVal } });
    pipeline.push({ $skip: params.skip }, { $limit: params.limit });

    const rawData = await this.model.aggregate(pipeline).exec();

    // Populate the paginated results using Mongoose model populate to get full nested paths cleanly
    const data = await this.model.populate(rawData, [
      { path: 'branchId', select: 'name city' },
      { path: 'items.itemId', select: 'itemName itemCode unit' },
    ]);

    return { data, total };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
