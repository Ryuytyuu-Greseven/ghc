import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { BranchInventoryRepository } from '../../repositories/branch-inventory.repository';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
import { InventoryRequestRepository } from '../../repositories/inventory-request.repository';
import { InventoryMasterRepository } from '../../repositories/inventory-master.repository';
import { HospitalRepository } from '../../repositories/hospital.repository';
import { TransactionType, RequestStatus } from '../../common/enums';
import { llmInstance } from '../../google/vertex.config';

const DOS_THRESHOLD_DAYS = 7;
const ANALYSIS_WINDOW_DAYS = 30;
const SURPLUS_FORECAST_DAYS = 30;

export interface StockoutWarning {
  branchId: string;
  branchName: string;
  itemId: string;
  itemName: string;
  availableQty: number;
  dailyConsumptionRate: number;
  daysOfStock: number;
  alertType?: 'low_stock' | 'stockout' | 'expiring' | 'expired';
  expiryDate?: Date | null;
  batchNo?: string;
}

export interface DailyDataPoint {
  date: string;
  quantity: number;
}

export interface DemandForecastResult {
  itemId: string;
  branchId: string;
  itemName: string;
  branchName: string;
  averageDailyConsumption: number;
  historicalDaily: DailyDataPoint[];
  forecast7Day: DailyDataPoint[];
  forecast30Day: DailyDataPoint[];
  aiSummary: string;
}

export interface RedistributionRecommendation {
  itemId: string;
  itemName: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  recommendedQuantity: number;
  justification: string;
  isAlreadyRequested?: boolean;
}

@Injectable()
export class InventoryAnalyticsService {
  constructor(
    private readonly branchRepo: BranchInventoryRepository,
    private readonly transactionRepo: AuditLogRepository,
    private readonly requestRepo: InventoryRequestRepository,
    private readonly masterRepo: InventoryMasterRepository,
    private readonly hospitalRepo: HospitalRepository,
  ) {}

  async verifyBranchAccess(
    assignedHospitalId: string,
    branchId: string,
  ): Promise<boolean> {
    const hospital = await this.hospitalRepo.findById(branchId);
    if (!hospital) return false;
    return (
      hospital.hospitalId === assignedHospitalId ||
      hospital._id.toString() === assignedHospitalId
    );
  }

  async getLowStockWarnings(hospitalId?: string): Promise<StockoutWarning[]> {
    let targetBranchIds: string[] | null = null;
    if (hospitalId) {
      const activeHospitals = await this.hospitalRepo.findAll({
        $or: [
          { hospitalId: hospitalId },
          { _id: new Types.ObjectId(hospitalId) },
        ],
      });
      targetBranchIds = activeHospitals.map((h) => h._id.toString());
    }

    const filter = targetBranchIds
      ? {
          branchId: {
            $in: targetBranchIds.map((id) => new Types.ObjectId(id)),
          },
        }
      : {};
    const branchStock = await this.branchRepo.findAll(filter);
    const aggregated = this.aggregateBranchStock(branchStock);
    const warnings: StockoutWarning[] = [];

    // 1. Low stock / stockout warnings (based on aggregated stock)
    for (const entry of aggregated) {
      const dailyRate = await this.getDailyConsumptionRate(
        entry.itemId,
        entry.branchId,
      );

      const [item, branch] = await Promise.all([
        this.masterRepo.findById(entry.itemId),
        this.hospitalRepo.findById(entry.branchId),
      ]);

      if (entry.availableQty <= 0) {
        warnings.push({
          branchId: entry.branchId,
          branchName: branch?.name ?? entry.branchId,
          itemId: entry.itemId,
          itemName: item?.itemName ?? 'Unknown Item',
          availableQty: 0,
          dailyConsumptionRate: Math.round(dailyRate * 100) / 100,
          daysOfStock: 0,
          alertType: 'stockout',
        });
      } else if (dailyRate > 0) {
        const daysOfStock = entry.availableQty / dailyRate;
        if (daysOfStock < DOS_THRESHOLD_DAYS) {
          warnings.push({
            branchId: entry.branchId,
            branchName: branch?.name ?? entry.branchId,
            itemId: entry.itemId,
            itemName: item?.itemName ?? 'Unknown Item',
            availableQty: entry.availableQty,
            dailyConsumptionRate: Math.round(dailyRate * 100) / 100,
            daysOfStock: Math.round(daysOfStock * 10) / 10,
            alertType: 'low_stock',
          });
        }
      }
    }

    // 2. Expiration Warnings (based on individual batches)
    const now = new Date();
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    for (const batch of branchStock) {
      const itemIdStr = ((batch.itemId as any)?._id ?? batch.itemId)?.toString();
      const branchIdStr = ((batch.branchId as any)?._id ?? batch.branchId)?.toString();

      if (itemIdStr && branchIdStr && batch.availableQty > 0 && batch.expiryDate) {
        const expiry = new Date(batch.expiryDate);
        const [item, branch] = await Promise.all([
          this.masterRepo.findById(itemIdStr),
          this.hospitalRepo.findById(branchIdStr),
        ]);

        if (expiry < now) {
          warnings.push({
            branchId: branchIdStr,
            branchName: branch?.name ?? branchIdStr,
            itemId: itemIdStr,
            itemName: item?.itemName ?? 'Unknown Item',
            availableQty: batch.availableQty,
            dailyConsumptionRate: 0,
            daysOfStock: 0,
            alertType: 'expired',
            expiryDate: batch.expiryDate,
            batchNo: batch.batchNo,
          });
        } else if (expiry <= ninetyDaysFromNow) {
          const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          warnings.push({
            branchId: branchIdStr,
            branchName: branch?.name ?? branchIdStr,
            itemId: itemIdStr,
            itemName: item?.itemName ?? 'Unknown Item',
            availableQty: batch.availableQty,
            dailyConsumptionRate: 0,
            daysOfStock: daysUntilExpiry,
            alertType: 'expiring',
            expiryDate: batch.expiryDate,
            batchNo: batch.batchNo,
          });
        }
      }
    }

    return warnings.sort((a, b) => a.daysOfStock - b.daysOfStock);
  }

  async getDemandForecast(
    itemId: string,
    branchId: string,
  ): Promise<DemandForecastResult> {
    const [item, branch] = await Promise.all([
      this.masterRepo.findById(itemId),
      this.hospitalRepo.findById(branchId),
    ]);
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    if (!branch) throw new NotFoundException(`Branch ${branchId} not found`);

    const historicalDaily = await this.buildHistoricalDailyDistribution(
      itemId,
      branchId,
    );
    const averageDailyConsumption = await this.getDailyConsumptionRate(
      itemId,
      branchId,
    );
    const aiForecast = await this.generateAiForecast(
      item.itemName,
      branch.name,
      historicalDaily,
      averageDailyConsumption,
    );

    return {
      itemId,
      branchId,
      itemName: item.itemName,
      branchName: branch.name,
      averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
      historicalDaily,
      forecast7Day: aiForecast.forecast7Day,
      forecast30Day: aiForecast.forecast30Day,
      aiSummary: aiForecast.summary,
    };
  }

  async getRedistributionRecommendations(
    hospitalId?: string,
  ): Promise<RedistributionRecommendation[]> {
    const branchStock = await this.branchRepo.findAll({});
    const aggregated = this.aggregateBranchStock(branchStock);
    const hospitalNames = await this.buildHospitalNameMap(
      aggregated.map((e) => e.branchId),
    );
    const itemNames = await this.buildItemNameMap(
      aggregated.map((e) => e.itemId),
    );

    const recipients: {
      branchId: string;
      itemId: string;
      deficit: number;
      daysOfStock: number;
      forecast7DayTotal: number;
    }[] = [];
    const surplus: {
      branchId: string;
      itemId: string;
      excessQty: number;
    }[] = [];

    for (const entry of aggregated) {
      const dailyRate = await this.getDailyConsumptionRate(
        entry.itemId,
        entry.branchId,
      );
      const forecast30Total = dailyRate * SURPLUS_FORECAST_DAYS;
      const forecast7Total = dailyRate * 7;
      const daysOfStock =
        dailyRate > 0 ? entry.availableQty / dailyRate : (entry.availableQty === 0 ? 0 : Infinity);

      if (
        entry.availableQty === 0 ||
        daysOfStock < DOS_THRESHOLD_DAYS ||
        entry.availableQty < forecast7Total
      ) {
        const needed = Math.max(
          Math.ceil(forecast7Total - entry.availableQty),
          dailyRate > 0
            ? Math.ceil(DOS_THRESHOLD_DAYS * dailyRate - entry.availableQty)
            : 10,
        );
        if (needed > 0) {
          recipients.push({
            branchId: entry.branchId,
            itemId: entry.itemId,
            deficit: needed,
            daysOfStock,
            forecast7DayTotal: forecast7Total,
          });
        }
      }

      const excess = entry.availableQty - forecast30Total;
      if (excess > 0 && (dailyRate > 0 || entry.availableQty > 0)) {
        surplus.push({
          branchId: entry.branchId,
          itemId: entry.itemId,
          excessQty: Math.floor(excess),
        });
      }
    }

    const recommendations: RedistributionRecommendation[] = [];

    for (const recipient of recipients) {
      const donors = surplus
        .filter(
          (s) =>
            s.itemId === recipient.itemId &&
            s.branchId !== recipient.branchId &&
            s.excessQty > 0,
        )
        .sort((a, b) => b.excessQty - a.excessQty);

      let remainingDeficit = recipient.deficit;
      for (const donor of donors) {
        if (remainingDeficit <= 0) break;
        const transferQty = Math.min(remainingDeficit, donor.excessQty);
        if (transferQty <= 0) continue;

        const toName =
          hospitalNames.get(recipient.branchId) ?? recipient.branchId;
        const fromName = hospitalNames.get(donor.branchId) ?? donor.branchId;
        const itemName = itemNames.get(recipient.itemId) ?? 'Unknown Item';

        recommendations.push({
          itemId: recipient.itemId,
          itemName,
          fromBranchId: donor.branchId,
          fromBranchName: fromName,
          toBranchId: recipient.branchId,
          toBranchName: toName,
          recommendedQuantity: transferQty,
          justification: `${toName} has ${recipient.daysOfStock === Infinity ? 'unknown' : recipient.daysOfStock.toFixed(1)} days of stock (forecasted 7-day need: ${Math.ceil(recipient.forecast7DayTotal)}). ${fromName} has surplus above ${SURPLUS_FORECAST_DAYS}-day forecast.`,
        });

        donor.excessQty -= transferQty;
        remainingDeficit -= transferQty;
      }
    }

    // Populate isAlreadyRequested flag dynamically by matching with pending request database entries
    const pendingRequests = await this.requestRepo.findAll({
      status: RequestStatus.PENDING,
    });

    for (const rec of recommendations) {
      const match = pendingRequests.find((req) => {
        const fromId = req.fromBranchId ? String(req.fromBranchId._id || req.fromBranchId) : '';
        const toId = req.branchId ? String(req.branchId._id || req.branchId) : '';
        const fromMatch = fromId === rec.fromBranchId;
        const toMatch = toId === rec.toBranchId;
        const itemMatch = req.items && req.items.some((i) => {
          const itemIdStr = i.itemId ? String((i.itemId as any)._id || i.itemId) : '';
          return itemIdStr === rec.itemId;
        });
        return fromMatch && toMatch && itemMatch;
      });
      if (match) {
        rec.isAlreadyRequested = true;
      }
    }

    let targetBranchIds: string[] | null = null;
    if (hospitalId) {
      const activeHospitals = await this.hospitalRepo.findAll({
        $or: [
          { hospitalId: hospitalId },
          { _id: new Types.ObjectId(hospitalId) },
        ],
      });
      targetBranchIds = activeHospitals.map((h) => h._id.toString());
    }

    const filteredRecommendations = recommendations.filter((rec) => {
      if (!targetBranchIds) return true;
      return (
        targetBranchIds.includes(rec.fromBranchId) ||
        targetBranchIds.includes(rec.toBranchId)
      );
    });

    return filteredRecommendations;
  }

  async applyRecommendation(
    fromBranchId: string,
    toBranchId: string,
    itemId: string,
    quantity: number,
    performedBy = 'AI Analytics',
  ) {
    if (fromBranchId === toBranchId) {
      throw new BadRequestException(
        'Source and destination branches must be different.',
      );
    }
    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number.');
    }

    const [item, fromBranch, toBranch] = await Promise.all([
      this.masterRepo.findById(itemId),
      this.hospitalRepo.findById(fromBranchId),
      this.hospitalRepo.findById(toBranchId),
    ]);
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    if (!fromBranch)
      throw new NotFoundException(`Source branch ${fromBranchId} not found`);
    if (!toBranch)
      throw new NotFoundException(`Destination branch ${toBranchId} not found`);

    // Check for an existing pending request with same fromBranch, toBranch and item
    const existingPendingRequest = await this.requestRepo.findOne({
      fromBranchId: new Types.ObjectId(fromBranchId),
      branchId: new Types.ObjectId(toBranchId),
      status: RequestStatus.PENDING,
      'items.itemId': new Types.ObjectId(itemId),
    });

    if (existingPendingRequest) {
      throw new BadRequestException(
        `A pending transfer request for ${item.itemName} from ${fromBranch.name} to ${toBranch.name} already exists.`,
      );
    }

    const batches = await this.branchRepo.findByBranchAndItem(
      fromBranchId,
      itemId,
    );
    const totalAvailable = batches.reduce(
      (sum, batch) => sum + batch.availableQty,
      0,
    );
    if (totalAvailable < quantity) {
      throw new BadRequestException(
        `Insufficient stock at ${fromBranch.name}. Available: ${totalAvailable}, Requested: ${quantity}`,
      );
    }

    const requestNumber = await this.requestRepo.generateRequestNumber();
    return this.requestRepo.create({
      requestNumber,
      branchId: new Types.ObjectId(toBranchId),
      fromBranchId: new Types.ObjectId(fromBranchId),
      requestedBy: performedBy,
      status: RequestStatus.PENDING,
      remarks: `AI redistribution: transfer ${quantity} units of ${item.itemName} from ${fromBranch.name} to ${toBranch.name}.`,
      items: [
        {
          itemId: new Types.ObjectId(itemId),
          requestedQty: quantity,
          approvedQty: 0,
          issuedQty: 0,
        },
      ],
    });
  }

  aggregateBranchStock(
    branchStock: Awaited<ReturnType<BranchInventoryRepository['findAll']>>,
  ): { branchId: string; itemId: string; availableQty: number }[] {
    const map = new Map<
      string,
      { branchId: string; itemId: string; availableQty: number }
    >();

    for (const row of branchStock) {
      const branchId = ((row.branchId as any)?._id ?? row.branchId)?.toString();
      const itemId = ((row.itemId as any)?._id ?? row.itemId)?.toString();
      if (!branchId || !itemId) continue;

      const key = `${branchId}:${itemId}`;
      const existing = map.get(key);
      if (existing) {
        existing.availableQty += row.availableQty;
      } else {
        map.set(key, { branchId, itemId, availableQty: row.availableQty });
      }
    }

    return Array.from(map.values());
  }

  async getDailyConsumptionRate(
    itemId: string,
    branchId: string,
  ): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ANALYSIS_WINDOW_DAYS);

    const transactions = await this.transactionRepo.findAll({
      module: 'inventory',
      'metadata.itemId': itemId.toString(),
    });
    const consumptionTx = transactions.filter((tx) => {
      const metadata = tx.metadata || {};
      const from = metadata.fromLocation?.toString();
      const branchMatch = from === branchId;
      const isConsumption =
        metadata.transactionType === TransactionType.ISSUE ||
        (metadata.transactionType === TransactionType.TRANSFER &&
          from !== 'Central');
      const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;
      return branchMatch && isConsumption && createdAt && createdAt >= cutoff;
    });

    const totalQty = consumptionTx.reduce((sum, tx) => {
      const metadata = tx.metadata || {};
      return sum + (metadata.quantity || 0);
    }, 0);
    if (totalQty > 0) {
      return totalQty / ANALYSIS_WINDOW_DAYS;
    }

    const batches = await this.branchRepo.findByBranchAndItem(branchId, itemId);
    const availableQty = batches.reduce(
      (sum, batch) => sum + batch.availableQty,
      0,
    );
    if (availableQty > 0) {
      return Math.max(availableQty / (ANALYSIS_WINDOW_DAYS * 2), 0.5);
    }

    return 0;
  }

  private async buildHistoricalDailyDistribution(
    itemId: string,
    branchId: string,
  ): Promise<DailyDataPoint[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ANALYSIS_WINDOW_DAYS);

    const transactions = await this.transactionRepo.findAll({
      module: 'inventory',
      'metadata.itemId': itemId.toString(),
    });
    const dailyMap = new Map<string, number>();

    for (let i = ANALYSIS_WINDOW_DAYS - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyMap.set(date.toISOString().slice(0, 10), 0);
    }

    for (const tx of transactions) {
      const metadata = tx.metadata || {};
      const from = metadata.fromLocation?.toString();
      const isConsumption =
        from === branchId &&
        (metadata.transactionType === TransactionType.ISSUE ||
          (metadata.transactionType === TransactionType.TRANSFER &&
            from !== 'Central'));
      const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;
      if (!isConsumption || !createdAt || createdAt < cutoff) continue;

      const key = createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        const qty = metadata.quantity || 0;
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + qty);
      }
    }

    return Array.from(dailyMap.entries()).map(([date, quantity]) => ({
      date,
      quantity,
    }));
  }

  private async generateAiForecast(
    itemName: string,
    branchName: string,
    historicalDaily: DailyDataPoint[],
    averageDailyConsumption: number,
  ): Promise<{
    forecast7Day: DailyDataPoint[];
    forecast30Day: DailyDataPoint[];
    summary: string;
  }> {
    const fallback = this.buildStatisticalForecast(
      historicalDaily,
      averageDailyConsumption,
    );

    try {
      const prompt = `Analyze this healthcare inventory consumption data and predict demand.

Item: ${itemName}
Branch: ${branchName}
Average daily consumption (last 30 days): ${averageDailyConsumption}
Historical daily issues (last 30 days): ${JSON.stringify(historicalDaily)}

Return ONLY valid JSON with this exact shape:
{
  "summary": "one sentence forecast explanation",
  "forecast7Day": [{"date":"YYYY-MM-DD","quantity":number}, ...7 entries starting tomorrow],
  "forecast30Day": [{"date":"YYYY-MM-DD","quantity":number}, ...30 entries starting tomorrow]
}`;

      const response = await llmInstance.invoke([
        new SystemMessage(
          'You are a healthcare inventory forecasting assistant. Respond with JSON only.',
        ),
        new HumanMessage(prompt),
      ]);

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { ...fallback, summary: fallback.summary };

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        forecast7Day: this.normalizeForecastDates(
          parsed.forecast7Day,
          7,
          historicalDaily,
        ),
        forecast30Day: this.normalizeForecastDates(
          parsed.forecast30Day,
          30,
          historicalDaily,
        ),
        summary: parsed.summary ?? fallback.summary,
      };
    } catch {
      return fallback;
    }
  }

  buildStatisticalForecast(
    historicalDaily: DailyDataPoint[],
    averageDailyConsumption: number,
  ) {
    const recentAvg =
      historicalDaily.slice(-7).reduce((sum, d) => sum + d.quantity, 0) /
      Math.max(historicalDaily.slice(-7).length, 1);
    const projectedDaily =
      recentAvg > 0 ? recentAvg : averageDailyConsumption || 1;

    const forecast7Day: DailyDataPoint[] = [];
    const forecast30Day: DailyDataPoint[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const point = {
        date: date.toISOString().slice(0, 10),
        quantity: Math.round(projectedDaily * 10) / 10,
      };
      if (i <= 7) forecast7Day.push(point);
      forecast30Day.push(point);
    }

    return {
      forecast7Day,
      forecast30Day,
      summary: `Statistical projection based on recent ${ANALYSIS_WINDOW_DAYS}-day average consumption of ${Math.round(projectedDaily * 10) / 10} units/day.`,
    };
  }

  private normalizeForecastDates(
    points: DailyDataPoint[] | undefined,
    count: number,
    historicalDaily: DailyDataPoint[],
  ): DailyDataPoint[] {
    if (Array.isArray(points) && points.length >= count) {
      return points.slice(0, count).map((p) => ({
        date: p.date,
        quantity: Number(p.quantity) || 0,
      }));
    }
    return this.buildStatisticalForecast(
      historicalDaily,
      historicalDaily.reduce((s, d) => s + d.quantity, 0) /
        Math.max(historicalDaily.length, 1),
    )[count === 7 ? 'forecast7Day' : 'forecast30Day'];
  }

  private async buildHospitalNameMap(
    branchIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(branchIds)];
    const map = new Map<string, string>();
    await Promise.all(
      unique.map(async (id) => {
        const hospital = await this.hospitalRepo.findById(id);
        if (hospital) map.set(id, hospital.name);
      }),
    );
    return map;
  }

  private async buildItemNameMap(
    itemIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(itemIds)];
    const map = new Map<string, string>();
    await Promise.all(
      unique.map(async (id) => {
        const item = await this.masterRepo.findById(id);
        if (item) map.set(id, item.itemName);
      }),
    );
    return map;
  }
}
