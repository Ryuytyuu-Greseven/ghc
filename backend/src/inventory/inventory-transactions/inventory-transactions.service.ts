import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTransactionRepository } from '../../repositories/inventory-transaction.repository';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class InventoryTransactionsService {
  constructor(private readonly repo: InventoryTransactionRepository) {}

  async findAll(query: Record<string, any> = {}) {
    const queryParams = {
      ...query,
      transactionType: query.transactionType ?? query.type,
      branchId: query.branchId ?? query.location,
      fromDate: query.fromDate ?? query.from,
      toDate: query.toDate ?? query.to,
    };
    const { data, total, page, pageSize } = await this.repo.findPaginated(queryParams);
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
