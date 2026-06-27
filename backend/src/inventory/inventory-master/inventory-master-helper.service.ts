import { Injectable } from '@nestjs/common';
import { InventoryCategory, InventoryStatus } from '../../common/enums';

@Injectable()
export class InventoryMasterHelperService {
  buildFilter(query: Record<string, any>): object {
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    return filter;
  }

  getCategoryValues(): string[] {
    return Object.values(InventoryCategory);
  }

  getStatusValues(): string[] {
    return Object.values(InventoryStatus);
  }
}
