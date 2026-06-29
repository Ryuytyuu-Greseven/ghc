import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryRequestRepository } from '../../repositories/inventory-request.repository';
import { CentralInventoryRepository } from '../../repositories/central-inventory.repository';
import { BranchInventoryRepository } from '../../repositories/branch-inventory.repository';
import { InventoryTransactionRepository } from '../../repositories/inventory-transaction.repository';
import { InventoryRequestsHelperService } from './inventory-requests-helper.service';
import { InventoryMasterRepository } from '../../repositories/inventory-master.repository';
import { RequestStatus, TransactionType } from '../../common/enums';
import { buildPaginatedResponse } from '../utils/pagination.util';
import { StaffRepository } from '../../repositories/staff.repository';

@Injectable()
export class InventoryRequestsService {
  constructor(
    private readonly requestRepo: InventoryRequestRepository,
    private readonly centralRepo: CentralInventoryRepository,
    private readonly branchRepo: BranchInventoryRepository,
    private readonly transactionRepo: InventoryTransactionRepository,
    private readonly masterRepo: InventoryMasterRepository,
    private readonly helper: InventoryRequestsHelperService,
    private readonly staffRepo: StaffRepository,
  ) {}

  async findAll(query: Record<string, any> = {}, user?: any) {
    if (user && user.role !== 'Admin') {
      const staff = await this.staffRepo.findOne({ userId: new Types.ObjectId(user.userId) });
      if (staff && staff.hospitalId) {
        const staffHospitalId = (staff.hospitalId as any)._id
          ? (staff.hospitalId as any)._id.toString()
          : staff.hospitalId.toString();
        query.branchId = staffHospitalId;
      }
    }
    const { data, total, page, pageSize } = await this.requestRepo.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findByBranch(branchId: string, user?: any) {
    if (user && user.role !== 'Admin') {
      const staff = await this.staffRepo.findOne({ userId: new Types.ObjectId(user.userId) });
      if (staff && staff.hospitalId) {
        const staffHospitalId = (staff.hospitalId as any)._id
          ? (staff.hospitalId as any)._id.toString()
          : staff.hospitalId.toString();
        if (staffHospitalId !== branchId) {
          throw new ForbiddenException('You can only access requests for your assigned facility.');
        }
      }
    }
    return this.requestRepo.findByBranch(branchId);
  }

  async findOne(id: string) {
    const req = await this.requestRepo.findById(id);
    if (!req) throw new NotFoundException(`Request ${id} not found`);
    return req;
  }

  async create(data: Record<string, any>, user?: any) {
    if (user) {
      this.checkRole(user, 'NotAdmin');
    }
    const items = data.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('At least one item must be requested.');
    }

    for (const item of items) {
      const itemId = item.itemId;
      const requestedQty = Number(item.requestedQty);

      if (!itemId) {
        throw new BadRequestException('Item ID is required for each request item.');
      }
      if (isNaN(requestedQty) || requestedQty <= 0) {
        throw new BadRequestException('Requested quantity must be a positive number.');
      }

      // Check available quantity in Central Inventory
      const batches = await this.centralRepo.findByItem(itemId.toString());
      const totalAvailable = batches.reduce((s, b) => s + b.availableQty, 0);

      if (totalAvailable < requestedQty) {
        const masterItem = await this.masterRepo.findById(itemId.toString());
        const itemName = masterItem ? masterItem.itemName : 'Unknown Item';
        throw new BadRequestException(
          `Requested quantity for item "${itemName}" exceeds available Central Inventory stock. Available: ${totalAvailable}, Requested: ${requestedQty}`
        );
      }
    }

    const requestNumber = await this.requestRepo.generateRequestNumber();
    return this.requestRepo.create({ ...data, requestNumber, status: RequestStatus.PENDING });
  }

  async approve(id: string, body: Record<string, any>, user?: any) {
    if (user) {
      this.checkRole(user, 'Admin');
    }
    const request = await this.requestRepo.findById(id);
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only Pending requests can be approved');
    }

    const { approvedItems = [], remarks = '', performedBy = 'System' } = body;

    const updatedItems = request.items.map((item) => {
      const itemIdStr = (item.itemId as any)._id
        ? (item.itemId as any)._id.toString()
        : item.itemId.toString();
      const approval = approvedItems.find(
        (a: any) => a.itemId.toString() === itemIdStr,
      );
      const approvedQty = Number(approval?.approvedQty ?? 0);
      const issuedQty = Number(approval?.issuedQty ?? approvedQty);
      return {
        itemId: (item.itemId as any)._id || item.itemId,
        requestedQty: item.requestedQty,
        approvedQty,
        issuedQty,
      };
    });

    const branchIdStr = (request.branchId as any)._id
      ? (request.branchId as any)._id.toString()
      : request.branchId.toString();

    for (const item of updatedItems) {
      if (item.issuedQty <= 0) continue;
      await this.deductAndTransferCentralStock(
        item.itemId.toString(),
        item.issuedQty,
        branchIdStr,
        request._id as Types.ObjectId,
        performedBy,
      );
    }

    const newStatus = this.helper.determineStatus(
      updatedItems.map((i) => ({ requestedQty: i.requestedQty, approvedQty: i.approvedQty })),
    );

    return this.requestRepo.update(id, { status: newStatus, items: updatedItems, remarks });
  }

  async reject(id: string, body: Record<string, any>, user?: any) {
    if (user) {
      this.checkRole(user, 'Admin');
    }
    const request = await this.requestRepo.findById(id);
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only Pending requests can be rejected');
    }
    return this.requestRepo.update(id, {
      status: RequestStatus.REJECTED,
      remarks: body.remarks ?? '',
    });
  }

  async updateStatus(id: string, body: Record<string, any>, user?: any) {
    if (user) {
      this.checkRole(user, 'Admin');
    }
    const request = await this.requestRepo.findById(id);
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    return this.requestRepo.update(id, { status: body.status, remarks: body.remarks });
  }

  private checkRole(user: any, allowedRole: 'Admin' | 'NotAdmin') {
    if (!user || !user.role) {
      throw new ForbiddenException('Invalid user context');
    }
    const isAdmin = user.role === 'Admin';

    if (allowedRole === 'Admin') {
      if (!isAdmin) {
        throw new ForbiddenException('Only users with the Admin role can approve or reject inventory requests.');
      }
    } else if (allowedRole === 'NotAdmin') {
      if (isAdmin) {
        throw new ForbiddenException('Admin users cannot raise inventory requests.');
      }
    }
  }

  private async deductAndTransferCentralStock(
    itemId: string,
    qty: number,
    branchId: string,
    requestId: Types.ObjectId,
    performedBy: string,
  ): Promise<void> {
    const batches = await this.centralRepo.findByItem(itemId);
    // FIFO: oldest expiry date first, nulls last
    batches.sort((a, b) => {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return aTime - bTime;
    });

    const totalAvailable = batches.reduce((s, b) => s + b.availableQty, 0);
    if (totalAvailable < qty) {
      throw new BadRequestException(
        `Insufficient stock in Central Inventory. Available: ${totalAvailable}, Required: ${qty}`,
      );
    }

    let remaining = qty;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.availableQty, remaining);
      
      // Deduct from Central
      await this.centralRepo.update(batch._id.toString(), {
        $inc: { availableQty: -deduct },
      });

      // Add to Branch Stock (retaining actual batch number and expiry date!)
      await this.branchRepo.upsertBranchStock(
        branchId,
        itemId,
        deduct,
        batch.batchNo,
        batch.expiryDate,
      );

      // Create transaction record
      await this.transactionRepo.create({
        itemId: new Types.ObjectId(itemId),
        fromLocation: 'Central',
        toLocation: branchId,
        quantity: deduct,
        transactionType: TransactionType.TRANSFER,
        requestId,
        performedBy,
      });

      remaining -= deduct;
    }
  }
}
