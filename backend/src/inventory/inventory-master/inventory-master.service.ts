import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryMasterRepository } from '../../repositories/inventory-master.repository';
import { InventoryMasterHelperService } from './inventory-master-helper.service';
import { InventoryStatus } from '../../common/enums';
import { buildPaginatedResponse } from '../utils/pagination.util';

@Injectable()
export class InventoryMasterService {
  constructor(
    private readonly repo: InventoryMasterRepository,
    private readonly helper: InventoryMasterHelperService,
  ) {}

  async findAll(query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Number(query.pageSize ?? query.limit ?? 10));
    const skip = (page - 1) * pageSize;

    const filter: Record<string, any> = {};
    if (query.category) filter.category = query.category;
    if (query.unit) filter.unit = query.unit;
    if (query.status) filter.status = query.status;

    const searchStr = (query.search ?? query.q ?? '').trim();
    if (searchStr) {
      filter.$or = [
        { itemName: { $regex: searchStr, $options: 'i' } },
        { itemCode: { $regex: searchStr, $options: 'i' } },
      ];
    }

    const sortBy = query.sortBy ?? 'itemName';
    const sortOrder = query.sortOrder ?? 'asc';

    const [data, totalRecords] = await Promise.all([
      this.repo.findPaginated(filter, skip, pageSize, sortBy, sortOrder),
      this.repo.count(filter),
    ]);

    return buildPaginatedResponse(data, totalRecords, page, pageSize);
  }

  async findOne(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async search(q: string) {
    return this.repo.search(q);
  }

  async create(data: Record<string, any>) {
    const existing = await this.repo.findOne({ itemCode: data.itemCode?.toUpperCase() });
    if (existing) throw new ConflictException(`Item code ${data.itemCode} already exists`);
    return this.repo.create(data);
  }

  async update(id: string, data: Record<string, any>) {
    const item = await this.repo.update(id, data);
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async softDelete(id: string) {
    const item = await this.repo.update(id, { status: InventoryStatus.INACTIVE });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return { id, deactivated: true };
  }
}
