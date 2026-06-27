import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryTransaction, InventoryTransactionDocument } from '../schemas/inventory-transaction.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly model: Model<InventoryTransactionDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<InventoryTransactionDocument[]> {
    return this.model
      .find(filter)
      .populate('itemId', 'itemName itemCode unit')
      .populate('requestId', 'requestNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<InventoryTransactionDocument | null> {
    return this.model
      .findById(id)
      .populate('itemId', 'itemName itemCode unit')
      .populate('requestId', 'requestNumber')
      .exec();
  }

  async findByItem(itemId: string): Promise<InventoryTransactionDocument[]> {
    return this.model
      .find({ itemId })
      .populate('itemId', 'itemName itemCode unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByLocation(location: string): Promise<InventoryTransactionDocument[]> {
    return this.model
      .find({ $or: [{ fromLocation: location }, { toLocation: location }] })
      .populate('itemId', 'itemName itemCode unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByDateRange(
    from: Date,
    to: Date,
  ): Promise<InventoryTransactionDocument[]> {
    return this.model
      .find({ createdAt: { $gte: from, $lte: to } })
      .populate('itemId', 'itemName itemCode unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByType(transactionType: string): Promise<InventoryTransactionDocument[]> {
    return this.model
      .find({ transactionType: transactionType as any })
      .populate('itemId', 'itemName itemCode unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(data: Partial<InventoryTransaction>): Promise<InventoryTransactionDocument> {
    return this.model.create(data);
  }

  async findPaginated(options: any): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const queryOptions = { ...options };

    let branchFilter: any = null;
    if (options.branchId) {
      branchFilter = {
        $or: [
          { fromLocation: options.branchId },
          { toLocation: options.branchId }
        ]
      };
      delete queryOptions.branchId;
    }

    let branchIds: string[] = [];
    if (options.search) {
      try {
        const matchedHospitals = await this.model.db.model('Hospital').find({
          name: { $regex: options.search, $options: 'i' },
        }).select('_id').exec();
        branchIds = matchedHospitals.map((h) => h._id.toString());
      } catch (err) {
        console.error('Failed to resolve hospitals for search:', err);
      }
    }

    const { filter, sort, skip, limit, page, pageSize } = this.queryService.buildQuery(queryOptions, {
      searchFields: [
        'item.itemName',
        'item.itemCode',
        'transactionType',
        'request.requestNumber',
        'performedBy',
      ],
      exactFilters: ['transactionType', 'itemId'],
      objectIdFilters: ['itemId'],
      regexFilters: ['performedBy'],
      dateFilters: {
        createdAt: { fromParam: 'fromDate', toParam: 'toDate' },
      },
      sortMapping: {
        itemName: 'item.itemName',
        requestNumber: 'request.requestNumber',
      },
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    if (branchFilter) {
      Object.assign(filter, branchFilter);
    }

    if (options.search && branchIds.length > 0) {
      filter.$or.push(
        { fromLocation: { $in: branchIds } },
        { toLocation: { $in: branchIds } }
      );
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
          from: 'inventoryrequests',
          localField: 'requestId',
          foreignField: '_id',
          as: 'request',
        },
      },
      { $unwind: { path: '$request', preserveNullAndEmptyArrays: true } },
      { $match: filter },
    ];

    // Count query
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total ?? 0;

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip }, { $limit: limit });

    const rawData = await this.model.aggregate(pipeline).exec();

    // Populate Mongoose paths
    const data = await this.model.populate(rawData, [
      { path: 'itemId', select: 'itemName itemCode unit' },
      { path: 'requestId', select: 'requestNumber' },
    ]);

    return { data, total, page, pageSize };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
