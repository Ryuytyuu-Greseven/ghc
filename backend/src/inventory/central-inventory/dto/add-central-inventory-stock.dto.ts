export class AddCentralInventoryStockDto {
  itemId: string;
  availableQty: number;
  damagedQty?: number;
  batchNo: string;
  expiryDate?: string | Date;
  location?: string;
  price?: number;
  isActive?: boolean;
}
