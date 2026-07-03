import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryAnalyticsService } from './inventory-analytics.service';

@Controller('inventory-analytics')
@UseGuards(JwtAuthGuard)
export class InventoryAnalyticsController {
  constructor(private readonly service: InventoryAnalyticsService) {}

  @Get('stockout-warnings')
  getStockoutWarnings() {
    return this.service.getLowStockWarnings();
  }

  @Get('forecast/:itemId/:branchId')
  getDemandForecast(
    @Param('itemId') itemId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.getDemandForecast(itemId, branchId);
  }

  @Get('redistribution-recommendations')
  getRedistributionRecommendations() {
    return this.service.getRedistributionRecommendations();
  }

  @Post('redistribution/apply')
  applyRedistribution(@Body() body: Record<string, any>) {
    return this.service.applyRecommendation(
      body.fromBranchId,
      body.toBranchId,
      body.itemId,
      Number(body.quantity),
      body.performedBy,
    );
  }
}
