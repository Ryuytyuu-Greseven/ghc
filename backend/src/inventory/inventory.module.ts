import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { QueryService } from '../common/services/query.service';

import { InventoryMaster, InventoryMasterSchema } from '../schemas/inventory-master.schema';
import { CentralInventory, CentralInventorySchema } from '../schemas/central-inventory.schema';
import { BranchInventory, BranchInventorySchema } from '../schemas/branch-inventory.schema';
import { InventoryRequest, InventoryRequestSchema } from '../schemas/inventory-request.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../schemas/inventory-transaction.schema';

import { InventoryMasterController } from './inventory-master/inventory-master.controller';
import { CentralInventoryController } from './central-inventory/central-inventory.controller';
import { BranchInventoryController } from './branch-inventory/branch-inventory.controller';
import { InventoryRequestsController } from './inventory-requests/inventory-requests.controller';
import { InventoryTransactionsController } from './inventory-transactions/inventory-transactions.controller';

import { InventoryMasterRepository } from '../repositories/inventory-master.repository';
import { CentralInventoryRepository } from '../repositories/central-inventory.repository';
import { BranchInventoryRepository } from '../repositories/branch-inventory.repository';
import { InventoryRequestRepository } from '../repositories/inventory-request.repository';
import { InventoryTransactionRepository } from '../repositories/inventory-transaction.repository';

import { InventoryMasterService } from './inventory-master/inventory-master.service';
import { InventoryMasterHelperService } from './inventory-master/inventory-master-helper.service';
import { CentralInventoryService } from './central-inventory/central-inventory.service';
import { CentralInventoryHelperService } from './central-inventory/central-inventory-helper.service';
import { BranchInventoryService } from './branch-inventory/branch-inventory.service';
import { BranchInventoryHelperService } from './branch-inventory/branch-inventory-helper.service';
import { InventoryRequestsService } from './inventory-requests/inventory-requests.service';
import { InventoryRequestsHelperService } from './inventory-requests/inventory-requests-helper.service';
import { InventoryTransactionsService } from './inventory-transactions/inventory-transactions.service';
import { InventoryAnalyticsController } from './inventory-analytics/inventory-analytics.controller';
import { InventoryAnalyticsService } from './inventory-analytics/inventory-analytics.service';
import { AuthModule } from '../auth/auth.module';
import { HospitalsModule } from '../hospitals/hospitals.module';

@Module({
  imports: [
    AuthModule,
    HospitalsModule,
    MongooseModule.forFeature([
      { name: InventoryMaster.name, schema: InventoryMasterSchema },
      { name: CentralInventory.name, schema: CentralInventorySchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
      { name: InventoryRequest.name, schema: InventoryRequestSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
  ],
  controllers: [
    InventoryMasterController,
    CentralInventoryController,
    BranchInventoryController,
    InventoryRequestsController,
    InventoryTransactionsController,
    InventoryAnalyticsController,
  ],
  providers: [
    QueryService,
    InventoryMasterRepository,
    InventoryMasterService,
    InventoryMasterHelperService,
    CentralInventoryRepository,
    CentralInventoryService,
    CentralInventoryHelperService,
    BranchInventoryRepository,
    BranchInventoryService,
    BranchInventoryHelperService,
    InventoryRequestRepository,
    InventoryRequestsService,
    InventoryRequestsHelperService,
    InventoryTransactionRepository,
    InventoryTransactionsService,
    InventoryAnalyticsService,
  ],
  exports: [
    InventoryMasterRepository,
    CentralInventoryRepository,
    BranchInventoryRepository,
    InventoryRequestRepository,
    InventoryTransactionRepository,
  ],
})
export class InventoryModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    try {
      const db = this.connection.db;
      if (!db) return;

      // Migrate string itemIds to ObjectIds in central stock
      const centralStockList = await db.collection('centralinventories').find({ itemId: { $type: 'string' } }).toArray();
      for (const entry of centralStockList) {
        if (entry.itemId && entry.itemId.length === 24) {
          await db.collection('centralinventories').updateOne(
            { _id: entry._id },
            { $set: { itemId: new Types.ObjectId(entry.itemId) } }
          );
        }
      }

      // Migrate string itemIds in branch stock
      const branchStockList = await db.collection('branchinventories').find({ itemId: { $type: 'string' } }).toArray();
      for (const entry of branchStockList) {
        if (entry.itemId && entry.itemId.length === 24) {
          await db.collection('branchinventories').updateOne(
            { _id: entry._id },
            { $set: { itemId: new Types.ObjectId(entry.itemId) } }
          );
        }
      }

      // Migrate string branchId/itemId in inventory requests
      const requestsList = await db.collection('inventoryrequests').find({
        $or: [
          { branchId: { $type: 'string' } },
          { 'items.itemId': { $type: 'string' } }
        ]
      }).toArray();
      for (const req of requestsList) {
        let needsUpdate = false;
        const updateObj: any = {};
        if (typeof req.branchId === 'string' && req.branchId.length === 24) {
          updateObj.branchId = new Types.ObjectId(req.branchId);
          needsUpdate = true;
        }
        if (Array.isArray(req.items)) {
          updateObj.items = req.items.map((item: any) => {
            if (typeof item.itemId === 'string' && item.itemId.length === 24) {
              return { ...item, itemId: new Types.ObjectId(item.itemId) };
            }
            return item;
          });
          needsUpdate = true;
        }
        if (needsUpdate) {
          await db.collection('inventoryrequests').updateOne(
            { _id: req._id },
            { $set: updateObj }
          );
        }
      }

      // Migrate string itemId/requestId in inventory transactions
      const transactionsList = await db.collection('inventorytransactions').find({
        $or: [
          { itemId: { $type: 'string' } },
          { requestId: { $type: 'string' } }
        ]
      }).toArray();
      for (const tx of transactionsList) {
        let needsUpdate = false;
        const updateObj: any = {};
        if (typeof tx.itemId === 'string' && tx.itemId.length === 24) {
          updateObj.itemId = new Types.ObjectId(tx.itemId);
          needsUpdate = true;
        }
        if (typeof tx.requestId === 'string' && tx.requestId.length === 24) {
          updateObj.requestId = new Types.ObjectId(tx.requestId);
          needsUpdate = true;
        }
        if (needsUpdate) {
          await db.collection('inventorytransactions').updateOne(
            { _id: tx._id },
            { $set: updateObj }
          );
        }
      }
    } catch (error) {
      console.error('[InventoryModule] Failed to run database migrations:', error);
    }
  }
}
