import { AddCentralInventoryStockDto } from './add-central-inventory-stock.dto';

export class UpdateCentralInventoryStockDto implements Partial<AddCentralInventoryStockDto> {
  itemId?: string;
  availableQty?: number;
  damagedQty?: number;
  batchNo?: string;
  expiryDate?: string | Date;
  location?: string;
  price?: number;
  isActive?: boolean;
}
