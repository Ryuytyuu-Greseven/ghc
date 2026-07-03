import { Injectable, NotFoundException } from '@nestjs/common';
import { CentralInventoryRepository } from '../../repositories/central-inventory.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
import { CentralInventoryHelperService } from './central-inventory-helper.service';
import { TransactionType } from '../../common/enums';
import { Types } from 'mongoose';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class CentralInventoryService {
  constructor(
    private readonly repo: CentralInventoryRepository,
    private readonly transactionRepo: AuditLogRepository,
    private readonly helper: CentralInventoryHelperService,
  ) {}

  async findAll(query: Record<string, any> = {}) {
    const { data, total, summary, page, pageSize } = await this.repo.findPaginated(query);
    const paginatedRes = buildPaginatedResponse(data, total, page, pageSize);
    return {
      ...paginatedRes,
      summary,
    };
  }

  async findByItem(itemId: string) {
    return this.repo.findByItem(itemId);
  }

  async findLowStock(threshold = 50) {
    return this.repo.findLowStock(threshold);
  }

  async findOne(id: string) {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`Central inventory entry ${id} not found`);
    return entry;
  }

  async addStock(data: Record<string, any>) {
    const entry = await this.repo.create(data);
    await this.transactionRepo.create({
      module: 'inventory',
      action: 'PURCHASE',
      message: `Purchased ${data.availableQty} units of medicine stock and added to Central Store.`,
      performedBy: data.performedBy ?? 'System',
      performedByRole: 'Admin',
      metadata: {
        itemId: data.itemId,
        quantity: data.availableQty,
        fromLocation: 'External',
        toLocation: 'Central',
        transactionType: TransactionType.PURCHASE,
      }
    });
    return entry;
  }

  async update(id: string, data: Record<string, any>) {
    const entry = await this.repo.update(id, data);
    if (!entry) throw new NotFoundException(`Central inventory entry ${id} not found`);
    return entry;
  }

  async remove(id: string) {
    const entry = await this.repo.delete(id);
    if (!entry) throw new NotFoundException(`Central inventory entry ${id} not found`);
    return { id, removed: true };
  }
}
