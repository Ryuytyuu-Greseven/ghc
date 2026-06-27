import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionRepository } from '../../repositories/inventory-transaction.repository';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class InventoryTransactionsService {
  constructor(private readonly repo: InventoryTransactionRepository) {}

  async findAll(query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const { data, total } = await this.repo.findPaginated({
      skip,
      limit: pageSize,
      transactionType: query.transactionType ?? query.type,
      branchId: query.branchId ?? query.location,
      itemId: query.itemId,
      fromDate: query.fromDate ?? query.from,
      toDate: query.toDate ?? query.to,
      performedBy: query.performedBy,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findByItem(itemId: string) {
    return this.repo.findByItem(itemId);
  }

  async findByLocation(location: string) {
    return this.repo.findByLocation(location);
  }

  async findOne(id: string) {
    const tx = await this.repo.findById(id);
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return tx;
  }
}
