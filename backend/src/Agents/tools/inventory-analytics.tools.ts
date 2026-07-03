import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { appInstance } from '../../main';
import { InventoryAnalyticsService } from '../../inventory/inventory-analytics/inventory-analytics.service';

export const getStockoutWarnings = tool(
  async () => {
    const service = appInstance.get(InventoryAnalyticsService);
    const result = await service.getLowStockWarnings();
    return JSON.stringify(result);
  },
  {
    name: 'get_stockout_warnings',
    description: 'List critical low-stock items at branch facilities where days of stock is below 7 days',
    schema: z.object({}),
  },
);

export const getDemandForecast = tool(
  async ({ itemId, branchId }) => {
    const service = appInstance.get(InventoryAnalyticsService);
    const result = await service.getDemandForecast(itemId, branchId);
    return JSON.stringify(result);
  },
  {
    name: 'get_demand_forecast',
    description: 'Fetch AI demand forecast for a specific inventory item at a branch facility',
    schema: z.object({
      itemId: z.string().describe('MongoDB ObjectId of the inventory master item'),
      branchId: z.string().describe('MongoDB ObjectId of the branch/hospital'),
    }),
  },
);

export const getRedistributionRecommendations = tool(
  async () => {
    const service = appInstance.get(InventoryAnalyticsService);
    const result = await service.getRedistributionRecommendations();
    return JSON.stringify(result);
  },
  {
    name: 'get_redistribution_recommendations',
    description: 'Summarize recommended branch-to-branch stock transfers based on stock-out risk and surplus inventory',
    schema: z.object({}),
  },
);

export const inventoryAnalyticsTools = [
  getStockoutWarnings,
  getDemandForecast,
  getRedistributionRecommendations,
];
