export class AdjustBranchInventoryStockDto {
  itemId: string;
  quantity: number;
  batchNo: string;
  expiryDate?: string | Date;
}
