import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import {
  InventoryRequest,
  InventoryRequestDocument,
} from '../schemas/inventory-request.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class InventoryRequestRepository {
  constructor(
    @InjectModel(InventoryRequest.name)
    private readonly model: Model<InventoryRequestDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<InventoryRequestDocument[]> {
    return this.model
      .find(filter)
      .populate('branchId', 'name city')
      .populate('fromBranchId', 'name city')
      .populate('items.itemId', 'itemName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<InventoryRequestDocument | null> {
    return this.model
      .findById(id)
      .populate('branchId', 'name city')
      .populate('fromBranchId', 'name city')
      .populate('items.itemId', 'itemName')
      .exec();
  }

  async findOne(filter: object): Promise<InventoryRequestDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findByBranch(branchId: string): Promise<InventoryRequestDocument[]> {
    return this.model
      .find({ branchId })
      .populate('fromBranchId', 'name city')
      .populate('items.itemId', 'itemName unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByStatus(status: string): Promise<InventoryRequestDocument[]> {
    return this.model
      .find({ status: status as any })
      .populate('branchId', 'name city')
      .populate('fromBranchId', 'name city')
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

  async create(
    data: Partial<InventoryRequest>,
  ): Promise<InventoryRequestDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<InventoryRequestDocument>,
  ): Promise<InventoryRequestDocument | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .populate('branchId', 'name city')
      .populate('fromBranchId', 'name city')
      .exec();
  }

  async findPaginated(
    options: any,
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const queryOptions = { ...options };

    const { filter, sort, skip, limit, page, pageSize } =
      this.queryService.buildQuery(queryOptions, {
        searchFields: [
          'requestNumber',
          'requestedBy',
          'branch.name',
          'matchedItems.itemName',
        ],
        exactFilters: ['status', 'branchId'],
        objectIdFilters: ['branchId'],
        regexFilters: ['requestedBy'],
        dateFilters: {
          createdAt: { fromParam: 'fromDate', toParam: 'toDate' },
        },
        sortMapping: {
          requestNumber: 'requestNumber',
          requestedBy: 'requestedBy',
          branchName: 'branch.name',
          status: 'status',
        },
        defaultSort: { field: 'createdAt', order: 'desc' },
      });

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
      { $match: filter },
    ];

    // Count query
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip }, { $limit: limit });

    const rawData = await this.model.aggregate(pipeline).exec();
    const data = await this.model.populate(rawData, [
      { path: 'branchId', select: 'name city' },
      { path: 'fromBranchId', select: 'name city' },
      { path: 'items.itemId', select: 'itemName' },
    ]);

    return { data, total, page, pageSize };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
