export enum InventoryCategory {
  MEDICINE = 'Medicine',
  EQUIPMENT = 'Equipment',
  CONSUMABLE = 'Consumable',
  SURGICAL = 'Surgical',
  DIAGNOSTIC = 'Diagnostic',
  OTHER = 'Other',
}

export enum InventoryStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PARTIAL = 'Partial',
}

export enum TransactionType {
  PURCHASE = 'Purchase',
  TRANSFER = 'Transfer',
  ISSUE = 'Issue',
  RETURN = 'Return',
  DAMAGE = 'Damage',
  EXPIRY = 'Expiry',
  ADJUSTMENT = 'Adjustment',
}
