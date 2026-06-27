import { Injectable } from '@nestjs/common';
import { RequestStatus } from '../../common/enums';

@Injectable()
export class InventoryRequestsHelperService {
  getStatusValues(): string[] {
    return Object.values(RequestStatus);
  }

  determineStatus(approvedItems: { requestedQty: number; approvedQty: number }[]): RequestStatus {
    const totalRequested = approvedItems.reduce((s, i) => s + i.requestedQty, 0);
    const totalApproved = approvedItems.reduce((s, i) => s + i.approvedQty, 0);
    if (totalApproved === 0) return RequestStatus.REJECTED;
    if (totalApproved >= totalRequested) return RequestStatus.APPROVED;
    return RequestStatus.PARTIAL;
  }
}
