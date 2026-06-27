import { Injectable } from '@nestjs/common';

@Injectable()
export class BranchInventoryHelperService {
  isAdequate(availableQty: number, minThreshold = 10): boolean {
    return availableQty >= minThreshold;
  }
}
