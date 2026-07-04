export class UpdateBranchInventoryStockDto {
  branchId?: string;
  itemId?: string;
  availableQty?: number;
  damagedQty?: number;
  batchNo?: string;
  expiryDate?: string | Date;
}
