class RequestItemDto {
  itemId: string;
  requestedQty: number;
}

export class CreateInventoryRequestDto {
  branchId: string;
  items: RequestItemDto[];
  reason?: string;
  fromBranchId?: string | null;
}
