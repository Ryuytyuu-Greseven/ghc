import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TestAvailabilityAudit,
  TestAvailabilityAuditDocument,
} from '../schemas/test-availability-audit.schema';
import { QueryService } from '../common/services/query.service';

@Injectable()
export class TestAvailabilityAuditRepository {
  constructor(
    @InjectModel(TestAvailabilityAudit.name)
    private readonly model: Model<TestAvailabilityAuditDocument>,
    private readonly queryService: QueryService,
  ) {}

  async create(
    data: Partial<TestAvailabilityAudit>,
  ): Promise<TestAvailabilityAuditDocument> {
    return this.model.create(data);
  }

  async findPaginated(options: Record<string, any>) {
    const { filter, sort, skip, limit, page, pageSize } =
      this.queryService.buildQuery(options, {
        searchFields: [],
        exactFilters: [],
        objectIdFilters: ['hospitalId', 'testId'],
        defaultSort: { field: 'auditedAt', order: 'desc' },
      });

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('testId', 'testName testCode category')
        .populate('hospitalId', 'name type')
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, total, page, pageSize };
  }
}
