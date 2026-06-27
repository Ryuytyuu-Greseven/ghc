import { Injectable, NotFoundException } from '@nestjs/common';
import { CentralInventoryRepository } from '../../repositories/central-inventory.repository';
import { InventoryTransactionRepository } from '../../repositories/inventory-transaction.repository';
import { CentralInventoryHelperService } from './central-inventory-helper.service';
import { TransactionType } from '../../common/enums';
import { Types } from 'mongoose';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class CentralInventoryService {
  constructor(
    private readonly repo: CentralInventoryRepository,
    private readonly transactionRepo: InventoryTransactionRepository,
    private readonly helper: CentralInventoryHelperService,
  ) {}

  async findAll(query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const { data, total, summary } = await this.repo.findPaginated({
      skip,
      limit: pageSize,
      search: query.search,
      category: query.category,
      lowStock: query.lowStock === 'true' || query.lowStock === true,
      expired: query.expired === 'true' || query.expired === true,
      expiringSoon: query.expiringSoon === 'true' || query.expiringSoon === true,
      batch: query.batch,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

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
      itemId: new Types.ObjectId(data.itemId),
      fromLocation: 'External',
      toLocation: 'Central',
      quantity: data.availableQty,
      transactionType: TransactionType.PURCHASE,
      requestId: null,
      performedBy: data.performedBy ?? 'System',
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
