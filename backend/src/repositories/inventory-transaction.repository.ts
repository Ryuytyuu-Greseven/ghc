import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryTransaction, InventoryTransactionDocument } from '../inventory/schemas/inventory-transaction.schema';

@Injectable()
export class InventoryTransactionRepository {
  constructor(
    @InjectModel(InventoryTransaction.name)
    private readonly model: Model<InventoryTransactionDocument>,
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

  async findPaginated(params: {
    skip: number;
    limit: number;
    transactionType?: string;
    branchId?: string;
    itemId?: string;
    fromDate?: string;
    toDate?: string;
    performedBy?: string;
    search?: string;
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
          from: 'inventoryrequests',
          localField: 'requestId',
          foreignField: '_id',
          as: 'request',
        },
      },
      { $unwind: { path: '$request', preserveNullAndEmptyArrays: true } },
    ];

    const match: any = {};

    if (params.transactionType) {
      match.transactionType = params.transactionType;
    }

    if (params.itemId) {
      match.itemId = new Types.ObjectId(params.itemId);
    }

    if (params.branchId) {
      // For transactions, branchId is stored as a string in fromLocation or toLocation
      match.$or = [
        { fromLocation: params.branchId },
        { toLocation: params.branchId }
      ];
    }

    if (params.performedBy) {
      match.performedBy = { $regex: params.performedBy, $options: 'i' };
    }

    if (params.fromDate || params.toDate) {
      match.createdAt = {};
      if (params.fromDate) match.createdAt.$gte = new Date(params.fromDate);
      if (params.toDate) match.createdAt.$lte = new Date(params.toDate);
    }

    let branchIds: string[] = [];
    if (params.search) {
      // Resolve hospital IDs for searching
      try {
        const matchedHospitals = await this.model.db.model('Hospital').find({
          name: { $regex: params.search, $options: 'i' },
        }).select('_id').exec();
        branchIds = matchedHospitals.map((h) => h._id.toString());
      } catch (err) {
        console.error('Failed to resolve hospitals for search:', err);
      }
    }

    if (params.search) {
      const searchMatch: any[] = [
        { 'item.itemName': { $regex: params.search, $options: 'i' } },
        { 'item.itemCode': { $regex: params.search, $options: 'i' } },
        { transactionType: { $regex: params.search, $options: 'i' } },
        { 'request.requestNumber': { $regex: params.search, $options: 'i' } },
        { performedBy: { $regex: params.search, $options: 'i' } },
      ];
      if (branchIds.length > 0) {
        searchMatch.push(
          { fromLocation: { $in: branchIds } },
          { toLocation: { $in: branchIds } },
        );
      }
      match.$or = searchMatch;
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
    if (sortBy === 'itemName') {
      sortField = 'item.itemName';
    } else if (sortBy === 'requestNumber') {
      sortField = 'request.requestNumber';
    }

    pipeline.push({ $sort: { [sortField]: sortVal } });
    pipeline.push({ $skip: params.skip }, { $limit: params.limit });

    const rawData = await this.model.aggregate(pipeline).exec();

    // Populate Mongoose paths
    const data = await this.model.populate(rawData, [
      { path: 'itemId', select: 'itemName itemCode unit' },
      { path: 'requestId', select: 'requestNumber' },
    ]);

    return { data, total };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
