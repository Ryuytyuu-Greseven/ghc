import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import {
  DiagnosticTest,
  DiagnosticTestDocument,
} from '../schemas/diagnostic-test.schema';
import { QueryService } from '../common/services/query.service';
import { DiagnosticTestStatus } from '../common/enums/diagnostic-test.enum';

@Injectable()
export class DiagnosticTestRepository {
  constructor(
    @InjectModel(DiagnosticTest.name)
    private readonly model: Model<DiagnosticTestDocument>,
    private readonly queryService: QueryService,
  ) {}

  async findAll(filter: object = {}): Promise<DiagnosticTestDocument[]> {
    return this.model.find(filter).sort({ testName: 1 }).exec();
  }

  async findById(id: string): Promise<DiagnosticTestDocument | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: object): Promise<DiagnosticTestDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async search(query: string): Promise<DiagnosticTestDocument[]> {
    const variants = new Set<string>();
    variants.add(query);
    for (let i = 0; i < query.length; i++) {
      variants.add(query.slice(0, i) + query.slice(i + 1));
    }
    const orClauses = [...variants].flatMap((v) => [
      { testName: { $regex: new RegExp(v, 'i') } },
      { testCode: { $regex: new RegExp(v, 'i') } },
    ]);
    return this.model
      .find({ status: DiagnosticTestStatus.Active, $or: orClauses })
      .sort({ testName: 1 })
      .exec();
  }

  async findPaginated(options: Record<string, any>) {
    const { filter, sort, skip, limit, page, pageSize } =
      this.queryService.buildQuery(options, {
        searchFields: ['testName', 'testCode'],
        exactFilters: ['category', 'status'],
        fuzzySearch: true,
        defaultSort: { field: 'testName', order: 'asc' },
      });

    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data, total, page, pageSize };
  }

  async findByCategory(category: string): Promise<DiagnosticTestDocument[]> {
    return this.model
      .find({ category: category as any, status: DiagnosticTestStatus.Active })
      .sort({ testName: 1 })
      .exec();
  }

  async create(
    data: Partial<DiagnosticTest>,
  ): Promise<DiagnosticTestDocument> {
    return this.model.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<DiagnosticTestDocument>,
  ): Promise<DiagnosticTestDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<DiagnosticTestDocument | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
