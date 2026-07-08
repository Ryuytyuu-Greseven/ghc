jest.mock('../../repositories/branch-inventory.repository', () => ({
  BranchInventoryRepository: class {
    findAll = jest.fn();
    findByBranchAndItem = jest.fn();
  },
}));

jest.mock('../../repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    findAll = jest.fn();
  },
}));

jest.mock('../../repositories/inventory-request.repository', () => ({
  InventoryRequestRepository: class {
    generateRequestNumber = jest.fn();
    create = jest.fn();
    findAll = jest.fn();
    findOne = jest.fn();
  },
}));

jest.mock('../../repositories/inventory-master.repository', () => ({
  InventoryMasterRepository: class {
    findById = jest.fn();
  },
}));

jest.mock('../../repositories/hospital.repository', () => ({
  HospitalRepository: class {
    findById = jest.fn();
  },
}));

jest.mock('../../google/vertex.config', () => ({
  llmInstance: { invoke: jest.fn() },
}));

import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '../../common/enums';
import { InventoryAnalyticsService } from './inventory-analytics.service';

describe('InventoryAnalyticsService', () => {
  let service: InventoryAnalyticsService;
  let branchRepo: any;
  let transactionRepo: any;
  let requestRepo: any;
  let masterRepo: any;
  let hospitalRepo: any;

  beforeEach(() => {
    branchRepo = {
      findAll: jest.fn(),
      findByBranchAndItem: jest.fn(),
    };
    transactionRepo = {
      findAll: jest.fn(),
    };
    requestRepo = {
      generateRequestNumber: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    masterRepo = {
      findById: jest.fn(),
    };
    hospitalRepo = {
      findById: jest.fn(),
    };

    service = new InventoryAnalyticsService(
      branchRepo,
      transactionRepo,
      requestRepo,
      masterRepo,
      hospitalRepo,
    );
  });

  describe('aggregateBranchStock', () => {
    it('sums available quantities across batches for the same branch and item', () => {
      const aggregated = service.aggregateBranchStock([
        { branchId: 'b1', itemId: 'i1', availableQty: 10 },
        { branchId: 'b1', itemId: 'i1', availableQty: 5 },
        { branchId: 'b2', itemId: 'i1', availableQty: 20 },
      ] as any);

      expect(aggregated).toEqual([
        { branchId: 'b1', itemId: 'i1', availableQty: 15 },
        { branchId: 'b2', itemId: 'i1', availableQty: 20 },
      ]);
    });
  });

  describe('getDailyConsumptionRate', () => {
    it('calculates average daily consumption from issue transactions', async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 5);

      transactionRepo.findAll.mockResolvedValue([
        {
          metadata: {
            fromLocation: 'branch1',
            transactionType: TransactionType.ISSUE,
            quantity: 30,
          },
          createdAt: cutoff,
        },
        {
          metadata: {
            fromLocation: 'branch1',
            transactionType: TransactionType.ISSUE,
            quantity: 30,
          },
          createdAt: cutoff,
        },
      ]);

      const rate = await service.getDailyConsumptionRate('item1', 'branch1');
      expect(rate).toBe(2);
    });

    it('returns zero when there is no stock and no consumption history', async () => {
      transactionRepo.findAll.mockResolvedValue([]);
      branchRepo.findByBranchAndItem.mockResolvedValue([]);

      const rate = await service.getDailyConsumptionRate('item1', 'branch1');
      expect(rate).toBe(0);
    });
  });

  describe('getLowStockWarnings', () => {
    it('flags items with days of stock below 7', async () => {
      branchRepo.findAll.mockResolvedValue([
        { branchId: 'branch1', itemId: 'item1', availableQty: 10 },
      ]);
      jest.spyOn(service, 'getDailyConsumptionRate').mockResolvedValue(2);
      masterRepo.findById.mockResolvedValue({ itemName: 'Paracetamol' });
      hospitalRepo.findById.mockResolvedValue({ name: 'PHC A' });

      const warnings = await service.getLowStockWarnings();

      expect(warnings.filter(w => w.alertType === 'low_stock')).toHaveLength(1);
      expect(warnings.find(w => w.alertType === 'low_stock')).toMatchObject({
        branchId: 'branch1',
        itemId: 'item1',
        itemName: 'Paracetamol',
        branchName: 'PHC A',
        availableQty: 10,
        dailyConsumptionRate: 2,
        daysOfStock: 5,
        alertType: 'low_stock',
      });
    });

    it('does not flag items with sufficient days of stock', async () => {
      branchRepo.findAll.mockResolvedValue([
        { branchId: 'branch1', itemId: 'item1', availableQty: 100 },
      ]);
      jest.spyOn(service, 'getDailyConsumptionRate').mockResolvedValue(2);

      const warnings = await service.getLowStockWarnings();
      expect(warnings.filter(w => w.alertType === 'low_stock')).toHaveLength(0);
    });

    it('flags stockout (0 available qty) even if daily rate is zero', async () => {
      branchRepo.findAll.mockResolvedValue([
        { branchId: 'branch1', itemId: 'item1', availableQty: 0 },
      ]);
      jest.spyOn(service, 'getDailyConsumptionRate').mockResolvedValue(0);
      masterRepo.findById.mockResolvedValue({ itemName: 'Paracetamol' });
      hospitalRepo.findById.mockResolvedValue({ name: 'PHC A' });

      const warnings = await service.getLowStockWarnings();
      expect(warnings.filter(w => w.alertType === 'stockout')).toHaveLength(1);
      expect(warnings.find(w => w.alertType === 'stockout')).toMatchObject({
        branchId: 'branch1',
        itemId: 'item1',
        itemName: 'Paracetamol',
        branchName: 'PHC A',
        availableQty: 0,
        daysOfStock: 0,
        alertType: 'stockout',
      });
    });

    it('flags expired and expiring batches', async () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const expiringSoonDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      branchRepo.findAll.mockResolvedValue([
        { branchId: 'branch1', itemId: 'item1', availableQty: 10, expiryDate: expiredDate, batchNo: 'B1' },
        { branchId: 'branch1', itemId: 'item2', availableQty: 15, expiryDate: expiringSoonDate, batchNo: 'B2' },
      ]);
      jest.spyOn(service, 'getDailyConsumptionRate').mockResolvedValue(10);
      masterRepo.findById.mockImplementation(async (id) => ({
        itemName: id === 'item1' ? 'Paracetamol' : 'Aspirin',
      }));
      hospitalRepo.findById.mockResolvedValue({ name: 'PHC A' });

      const warnings = await service.getLowStockWarnings();

      const expiredWarning = warnings.find(w => w.alertType === 'expired');
      const expiringWarning = warnings.find(w => w.alertType === 'expiring');

      expect(expiredWarning).toMatchObject({
        itemId: 'item1',
        itemName: 'Paracetamol',
        availableQty: 10,
        daysOfStock: 0,
        alertType: 'expired',
        batchNo: 'B1',
      });

      expect(expiringWarning).toMatchObject({
        itemId: 'item2',
        itemName: 'Aspirin',
        availableQty: 15,
        alertType: 'expiring',
        batchNo: 'B2',
      });
      expect(expiringWarning.daysOfStock).toBeGreaterThan(0);
    });
  });

  describe('getRedistributionRecommendations', () => {
    it('matches deficit branches with surplus branches for the same item', async () => {
      branchRepo.findAll.mockResolvedValue([
        { branchId: 'low-branch', itemId: 'item1', availableQty: 5 },
        { branchId: 'surplus-branch', itemId: 'item1', availableQty: 200 },
      ]);

      jest
        .spyOn(service, 'getDailyConsumptionRate')
        .mockImplementation(async (_itemId, branchId) =>
          branchId === 'low-branch' ? 2 : 1,
        );

      masterRepo.findById.mockResolvedValue({ itemName: 'Saline' });
      hospitalRepo.findById.mockImplementation(async (id: string) => ({
        name: id === 'low-branch' ? 'PHC Low' : 'PHC Surplus',
      }));

      const recommendations = await service.getRedistributionRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toMatchObject({
        itemId: 'item1',
        fromBranchId: 'surplus-branch',
        toBranchId: 'low-branch',
      });
    });

    it('recommends redistribution for stockout items even with zero consumption rate', async () => {
      branchRepo.findAll.mockResolvedValue([
        { branchId: 'stockout-branch', itemId: 'item1', availableQty: 0 },
        { branchId: 'surplus-branch', itemId: 'item1', availableQty: 200 },
      ]);

      jest.spyOn(service, 'getDailyConsumptionRate').mockResolvedValue(0);

      masterRepo.findById.mockResolvedValue({ itemName: 'Saline' });
      hospitalRepo.findById.mockImplementation(async (id: string) => ({
        name: id === 'stockout-branch' ? 'PHC Stockout' : 'PHC Surplus',
      }));

      const recommendations = await service.getRedistributionRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toMatchObject({
        itemId: 'item1',
        fromBranchId: 'surplus-branch',
        toBranchId: 'stockout-branch',
        recommendedQuantity: 10,
      });
    });
  });

  describe('applyRecommendation', () => {
    const fromBranchId = '507f1f77bcf86cd799439011';
    const toBranchId = '507f1f77bcf86cd799439012';
    const itemId = '507f1f77bcf86cd799439013';

    it('creates a pending inventory request when source stock is sufficient', async () => {
      masterRepo.findById.mockResolvedValue({ itemName: 'Paracetamol' });
      hospitalRepo.findById.mockImplementation(async (id: string) => ({
        name: id === fromBranchId ? 'PHC Source' : 'PHC Target',
      }));
      branchRepo.findByBranchAndItem.mockResolvedValue([{ availableQty: 50 }]);
      requestRepo.generateRequestNumber.mockResolvedValue('REQ-2026-000001');
      requestRepo.create.mockResolvedValue({
        _id: 'req1',
        requestNumber: 'REQ-2026-000001',
      });

      const result = await service.applyRecommendation(
        fromBranchId,
        toBranchId,
        itemId,
        20,
      );

      expect(requestRepo.create).toHaveBeenCalled();
      expect(result.requestNumber).toBe('REQ-2026-000001');
    });

    it('throws when source branch lacks sufficient stock', async () => {
      masterRepo.findById.mockResolvedValue({ itemName: 'Paracetamol' });
      hospitalRepo.findById.mockResolvedValue({ name: 'PHC Source' });
      branchRepo.findByBranchAndItem.mockResolvedValue([{ availableQty: 5 }]);

      await expect(
        service.applyRecommendation(fromBranchId, toBranchId, itemId, 20),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('buildStatisticalForecast', () => {
    it('projects daily demand using recent historical average', () => {
      const historical = Array.from({ length: 30 }, (_, index) => ({
        date: `2026-01-${String(index + 1).padStart(2, '0')}`,
        quantity: index < 23 ? 0 : 10,
      }));

      const forecast = service.buildStatisticalForecast(historical, 2);

      expect(forecast.forecast7Day).toHaveLength(7);
      expect(forecast.forecast30Day).toHaveLength(30);
      expect(forecast.forecast7Day[0].quantity).toBe(10);
    });
  });
});
