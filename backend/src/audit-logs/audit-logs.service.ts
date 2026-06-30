import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogRepository) {}

  async log(data: Partial<AuditLog>) {
    return this.repo.create(data);
  }

  async findAll(query: Record<string, any> = {}) {
    const queryParams = {
      ...query,
      fromDate: query.fromDate ?? query.from,
      toDate: query.toDate ?? query.to,
    };
    return this.repo.findPaginated(queryParams);
  }

  async findOne(id: string) {
    const log = await this.repo.findById(id);
    if (!log) throw new NotFoundException(`Audit log ${id} not found`);
    return log;
  }
}
