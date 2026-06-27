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
    const { data, total, page, pageSize } = await this.repo.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
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
