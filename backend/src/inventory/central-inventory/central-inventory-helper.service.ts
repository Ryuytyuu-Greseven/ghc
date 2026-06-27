import { Injectable } from '@nestjs/common';

@Injectable()
export class CentralInventoryHelperService {
  isLowStock(availableQty: number, threshold = 50): boolean {
    return availableQty <= threshold;
  }

  isExpiringSoon(expiryDate: Date | null, daysAhead = 90): boolean {
    if (!expiryDate) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return new Date(expiryDate) <= cutoff;
  }
}
