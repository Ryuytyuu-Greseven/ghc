import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryRequestRepository } from '../../repositories/inventory-request.repository';
import { CentralInventoryRepository } from '../../repositories/central-inventory.repository';
import { BranchInventoryRepository } from '../../repositories/branch-inventory.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
import { InventoryRequestsHelperService } from './inventory-requests-helper.service';
import { InventoryMasterRepository } from '../../repositories/inventory-master.repository';
import { RequestStatus, TransactionType } from '../../common/enums';
import { buildPaginatedResponse } from '../utils/pagination.util';
import { StaffRepository } from '../../repositories/staff.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/notification-types';
import { httpLocalStorage } from '../../common/services/http.service';
import { UserRepository } from '../../repositories/user.repository';
import { HospitalRepository } from '../../repositories/hospital.repository';

@Injectable()
export class InventoryRequestsService {
  constructor(
    private readonly requestRepo: InventoryRequestRepository,
    private readonly centralRepo: CentralInventoryRepository,
    private readonly branchRepo: BranchInventoryRepository,
    private readonly transactionRepo: AuditLogRepository,
    private readonly masterRepo: InventoryMasterRepository,
    private readonly helper: InventoryRequestsHelperService,
    private readonly staffRepo: StaffRepository,
    private readonly notificationsService: NotificationsService,
    private readonly userRepo: UserRepository,
    private readonly hospitalRepo: HospitalRepository,
  ) {}

  async findAll(query: Record<string, any> = {}, user?: any) {
    if (user && user.role !== 'Admin') {
      const staff = await this.staffRepo.findOne({
        userId: new Types.ObjectId(user.userId),
      });
      if (staff && staff.hospitalId) {
        const staffHospitalId = (staff.hospitalId as any)._id
          ? (staff.hospitalId as any)._id.toString()
          : staff.hospitalId.toString();
        query.branchId = staffHospitalId;
      }
    }
    const { data, total, page, pageSize } =
      await this.requestRepo.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findByBranch(branchId: string, user?: any) {
    if (user && user.role !== 'Admin') {
      const staff = await this.staffRepo.findOne({
        userId: new Types.ObjectId(user.userId),
      });
      if (staff && staff.hospitalId) {
        const staffHospitalId = (staff.hospitalId as any)._id
          ? (staff.hospitalId as any)._id.toString()
          : staff.hospitalId.toString();
        if (staffHospitalId !== branchId) {
          throw new ForbiddenException(
            'You can only access requests for your assigned facility.',
          );
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
        throw new BadRequestException(
          'Item ID is required for each request item.',
        );
      }
      if (isNaN(requestedQty) || requestedQty <= 0) {
        throw new BadRequestException(
          'Requested quantity must be a positive number.',
        );
      }

      // Check available quantity in Central Inventory
      const batches = await this.centralRepo.findByItem(itemId.toString());
      const totalAvailable = batches.reduce((s, b) => s + b.availableQty, 0);

      if (totalAvailable < requestedQty) {
        const masterItem = await this.masterRepo.findById(itemId.toString());
        const itemName = masterItem ? masterItem.itemName : 'Unknown Item';
        throw new BadRequestException(
          `Requested quantity for item "${itemName}" exceeds available Central Inventory stock. Available: ${totalAvailable}, Requested: ${requestedQty}`,
        );
      }
    }

    const requestNumber = await this.requestRepo.generateRequestNumber();
    let resolvedUserId = user?.userId;
    if (!resolvedUserId) {
      const store = httpLocalStorage.getStore();
      if (store && store.token) {
        try {
          const tokenStr = store.token.startsWith('Bearer ') ? store.token.substring(7) : store.token;
          const payloadBase64 = tokenStr.split('.')[1];
          if (payloadBase64) {
            const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf8');
            const parsed = JSON.parse(payloadDecoded);
            resolvedUserId = parsed.userId || parsed.sub;
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
    }
    const userId = resolvedUserId ? new Types.ObjectId(resolvedUserId) : null;

    const createdRequest = await this.requestRepo.create({
      ...data,
      userId,
      requestNumber,
      status: RequestStatus.PENDING,
    });

    // Notify admins
    try {
      const admins = await this.userRepo.findAll({ role: 'Admin', isActive: true });
      const targetAdmins = admins.map((admin) => ({
        id: admin._id.toString(),
        email: admin.email,
      }));

      const performedBy = data.requestedBy || user?.username || 'Staff';

      let branchName: string | undefined = undefined;
      if (createdRequest.branchId) {
        const branch = await this.hospitalRepo.findById(createdRequest.branchId.toString());
        if (branch) {
          branchName = branch.name;
        }
      }

      if (targetAdmins.length > 0) {
        void this.notificationsService.dispatch(
          NotificationType.INVENTORY_REQUEST_RAISED,
          {
            request: createdRequest,
            performedBy,
            branchName,
            targetAdmins,
          },
        );
      }
    } catch (err) {
      console.error('Failed to dispatch request raised notification to admins:', err);
    }

    return createdRequest;
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

    const { approvedItems = [], remarks = '' } = body;
    const performedBy = body.performedBy || (user ? user.username : 'Admin');

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

    const fromBranchIdStr = request.fromBranchId
      ? ((request.fromBranchId as any)._id ?? request.fromBranchId).toString()
      : null;

    for (const item of updatedItems) {
      if (item.issuedQty <= 0) continue;
      if (fromBranchIdStr) {
        await this.deductAndTransferBranchStock(
          fromBranchIdStr,
          branchIdStr,
          item.itemId.toString(),
          item.issuedQty,
          request._id,
          performedBy,
        );
      } else {
        await this.deductAndTransferCentralStock(
          item.itemId.toString(),
          item.issuedQty,
          branchIdStr,
          request._id,
          performedBy,
        );
      }
    }

    const newStatus = this.helper.determineStatus(
      updatedItems.map((i) => ({
        requestedQty: i.requestedQty,
        approvedQty: i.approvedQty,
      })),
    );

    const updatedRequest = await this.requestRepo.update(id, {
      status: newStatus,
      items: updatedItems,
      remarks,
    });

    await this.transactionRepo.create({
      module: 'inventory',
      action: 'UPDATE',
      message: `Inventory request #${request.requestNumber} was approved (status: ${newStatus}) by ${performedBy}.`,
      performedBy,
      performedByRole: 'Admin',
      metadata: {
        requestId: request._id,
        status: newStatus,
        remarks,
      },
    });

    const targetUserId = await this.resolveRequesterUserId(request);
    const targetEmail = await this.resolveRequesterEmail(request);
    if (targetUserId) {
      void this.notificationsService.dispatch(
        NotificationType.INVENTORY_REQUEST_PROCESSED,
        {
          request: updatedRequest,
          performedBy,
          status: newStatus,
          userId: targetUserId,
          email: targetEmail || undefined,
        },
      );
    }

    return updatedRequest;
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
    const updatedRequest = await this.requestRepo.update(id, {
      status: RequestStatus.REJECTED,
      remarks: body.remarks ?? '',
    });

    const performedBy = body.performedBy || (user ? user.username : 'Admin');
    await this.transactionRepo.create({
      module: 'inventory',
      action: 'UPDATE',
      message: `Inventory request #${request.requestNumber} was rejected by ${performedBy}.`,
      performedBy,
      performedByRole: 'Admin',
      metadata: {
        requestId: request._id,
        status: RequestStatus.REJECTED,
        remarks: body.remarks,
      },
    });

    const targetUserIdReject = await this.resolveRequesterUserId(request);
    const targetEmailReject = await this.resolveRequesterEmail(request);
    if (targetUserIdReject) {
      void this.notificationsService.dispatch(
        NotificationType.INVENTORY_REQUEST_PROCESSED,
        {
          request: updatedRequest,
          performedBy,
          status: RequestStatus.REJECTED,
          userId: targetUserIdReject,
          email: targetEmailReject || undefined,
        },
      );
    }

    return updatedRequest;
  }

  async updateStatus(id: string, body: Record<string, any>, user?: any) {
    if (user) {
      this.checkRole(user, 'Admin');
    }
    const request = await this.requestRepo.findById(id);
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    const updatedRequest = await this.requestRepo.update(id, {
      status: body.status,
      remarks: body.remarks,
    });

    const performedBy = body.performedBy || (user ? user.username : 'Admin');
    const targetUserIdUpdate = await this.resolveRequesterUserId(request);
    const targetEmailUpdate = await this.resolveRequesterEmail(request);
    if (targetUserIdUpdate) {
      void this.notificationsService.dispatch(
        NotificationType.INVENTORY_REQUEST_PROCESSED,
        {
          request: updatedRequest,
          performedBy,
          status: body.status,
          userId: targetUserIdUpdate,
          email: targetEmailUpdate || undefined,
        },
      );
    }

    return updatedRequest;
  }

  private async resolveRequesterUserId(request: any): Promise<string | null> {
    if (request.userId) {
      return request.userId.toString();
    }
    if (request.requestedBy) {
      try {
        const staffList = await this.staffRepo.findAll();
        const requestedByLower = request.requestedBy.toLowerCase().trim();
        const found = staffList.find((s) => {
          const displayName = s.displayName?.toLowerCase().trim();
          const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
          return (
            displayName === requestedByLower ||
            fullName === requestedByLower ||
            s.firstName?.toLowerCase() === requestedByLower
          );
        });
        if (found && found.userId) {
          return (found.userId as any)._id
            ? (found.userId as any)._id.toString()
            : found.userId.toString();
        }
      } catch (e) {
        console.error('Failed to resolve requester user ID:', e);
      }
    }
    return null;
  }

  private async resolveRequesterEmail(request: any): Promise<string | null> {
    if (request.userId) {
      try {
        const staff = await this.staffRepo.findOne({ userId: request.userId });
        if (staff && staff.email) {
          return staff.email;
        }
        // Fallback to user collection (e.g. for admin user accounts)
        const user = await this.userRepo.findById(request.userId.toString());
        if (user && user.email) {
          return user.email;
        }
      } catch (e) {
        console.error('Failed to resolve requester email by userId:', e);
      }
    }
    if (request.requestedBy) {
      try {
        const staffList = await this.staffRepo.findAll();
        const requestedByLower = request.requestedBy.toLowerCase().trim();
        const found = staffList.find((s) => {
          const displayName = s.displayName?.toLowerCase().trim();
          const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
          return (
            displayName === requestedByLower ||
            fullName === requestedByLower ||
            s.firstName?.toLowerCase() === requestedByLower
          );
        });
        if (found && found.email) {
          return found.email;
        }
      } catch (e) {
        console.error('Failed to resolve requester email by requestedBy name:', e);
      }
    }
    return null;
  }

  private checkRole(user: any, allowedRole: 'Admin' | 'NotAdmin') {
    if (!user || !user.role) {
      throw new ForbiddenException('Invalid user context');
    }
    const isAdmin = user.role === 'Admin';

    if (allowedRole === 'Admin') {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only users with the Admin role can approve or reject inventory requests.',
        );
      }
    } else if (allowedRole === 'NotAdmin') {
      if (isAdmin) {
        throw new ForbiddenException(
          'Admin users cannot raise inventory requests.',
        );
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

      // Create transaction record as an audit log
      await this.transactionRepo.create({
        module: 'inventory',
        action: 'TRANSFER',
        message: `Transferred ${deduct} units of medicine stock from Central Store to branch "${branchId}".`,
        performedBy,
        performedByRole: 'Admin',
        metadata: {
          itemId,
          quantity: deduct,
          fromLocation: 'Central',
          toLocation: branchId,
          transactionType: TransactionType.TRANSFER,
          requestId,
        },
      });

      remaining -= deduct;
    }
  }

  private async deductAndTransferBranchStock(
    fromBranchId: string,
    toBranchId: string,
    itemId: string,
    qty: number,
    requestId: Types.ObjectId,
    performedBy: string,
  ): Promise<void> {
    const batches = await this.branchRepo.findByBranchAndItem(
      fromBranchId,
      itemId,
    );
    // FIFO: oldest expiry date first, nulls last
    batches.sort((a, b) => {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return aTime - bTime;
    });

    const totalAvailable = batches.reduce((s, b) => s + b.availableQty, 0);
    if (totalAvailable < qty) {
      throw new BadRequestException(
        `Insufficient stock at source branch. Available: ${totalAvailable}, Required: ${qty}`,
      );
    }

    let remaining = qty;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.availableQty, remaining);

      // Deduct from source branch
      await this.branchRepo.update(batch._id.toString(), {
        $inc: { availableQty: -deduct },
      });

      // Add to destination branch
      await this.branchRepo.upsertBranchStock(
        toBranchId,
        itemId,
        deduct,
        batch.batchNo,
        batch.expiryDate,
      );

      // Create transaction record as an audit log
      await this.transactionRepo.create({
        module: 'inventory',
        action: 'TRANSFER',
        message: `Transferred ${deduct} units of medicine stock from branch "${fromBranchId}" to branch "${toBranchId}".`,
        performedBy,
        performedByRole: 'Admin',
        metadata: {
          itemId,
          quantity: deduct,
          fromLocation: fromBranchId,
          toLocation: toBranchId,
          transactionType: TransactionType.TRANSFER,
          requestId,
        },
      });

      remaining -= deduct;
    }
  }
}
