import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly model: Model<AuditLogDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<AuditLogDocument[]> {
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(data: Partial<AuditLog>): Promise<AuditLogDocument> {
    return this.model.create(data);
  }

  async findPaginated(
    options: any,
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const queryOptions = { ...options };

    const { filter, sort, skip, limit, page, pageSize } =
      this.queryService.buildQuery(queryOptions, {
        searchFields: ['module', 'action', 'message', 'performedBy'],
        exactFilters: ['module', 'action'],
        regexFilters: ['performedBy'],
        dateFilters: {
          createdAt: { fromParam: 'fromDate', toParam: 'toDate' },
        },
        defaultSort: { field: 'createdAt', order: 'desc' },
      });

    const total = await this.model.countDocuments(filter).exec();
    const data = await this.model
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return { data, total, page, pageSize };
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
