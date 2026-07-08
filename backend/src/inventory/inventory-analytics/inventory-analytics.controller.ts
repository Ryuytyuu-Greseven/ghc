import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryAnalyticsService } from './inventory-analytics.service';
import { ApplyRedistributionDto } from './dto/apply-redistribution.dto';

@Controller('inventory-analytics')
@UseGuards(JwtAuthGuard)
export class InventoryAnalyticsController {
  constructor(private readonly service: InventoryAnalyticsService) {}

  private assertAdmin(user: { role?: string }) {
    if (user.role !== 'Admin') {
      throw new ForbiddenException(
        'Only Administrators can access AI inventory analytics',
      );
    }
  }

  @Get('stockout-warnings')
  async getStockoutWarnings(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.service.getLowStockWarnings();
  }

  @Get('forecast/:itemId/:branchId')
  async getDemandForecast(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Param('branchId') branchId: string,
  ) {
    this.assertAdmin(req.user);
    return this.service.getDemandForecast(itemId, branchId);
  }

  @Get('redistribution-recommendations')
  async getRedistributionRecommendations(@Req() req: any) {
    this.assertAdmin(req.user);
    return this.service.getRedistributionRecommendations();
  }

  @Post('redistribution/apply')
  async applyRedistribution(
    @Req() req: any,
    @Body() body: ApplyRedistributionDto,
  ) {
    this.assertAdmin(req.user);
    return this.service.applyRecommendation(
      body.fromBranchId,
      body.toBranchId,
      body.itemId,
      Number(body.quantity),
      body.performedBy,
    );
  }
}
