import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchInventoryRepository } from '../../repositories/branch-inventory.repository';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class BranchInventoryService {
  constructor(private readonly repo: BranchInventoryRepository) {}

  async findByBranch(branchId: string, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const { data, total } = await this.repo.findPaginated({
      skip,
      limit: pageSize,
      branchId,
      search: query.search,
      category: query.category,
      lowStock: query.lowStock === 'true' || query.lowStock === true,
      expired: query.expired === 'true' || query.expired === true,
      expiringSoon: query.expiringSoon === 'true' || query.expiringSoon === true,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findByItem(itemId: string) {
    return this.repo.findByItem(itemId);
  }

  async findByBranchAndItem(branchId: string, itemId: string) {
    return this.repo.findByBranchAndItem(branchId, itemId);
  }

  async findOne(id: string) {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`Branch inventory entry ${id} not found`);
    return entry;
  }

  async update(id: string, data: Record<string, any>) {
    const entry = await this.repo.update(id, data);
    if (!entry) throw new NotFoundException(`Branch inventory entry ${id} not found`);
    return entry;
  }
}
