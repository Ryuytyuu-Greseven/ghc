import { Controller, Get, Post, Param, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryAnalyticsService } from './inventory-analytics.service';
import { UsersService } from '../../users/users.service';

@Controller('inventory-analytics')
@UseGuards(JwtAuthGuard)
export class InventoryAnalyticsController {
  constructor(
    private readonly service: InventoryAnalyticsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('stockout-warnings')
  async getStockoutWarnings(@Req() req: any) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    return this.service.getLowStockWarnings(hospitalId || undefined);
  }

  @Get('forecast/:itemId/:branchId')
  async getDemandForecast(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Param('branchId') branchId: string,
  ) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    if (hospitalId) {
      const hasAccess = await this.service.verifyBranchAccess(hospitalId, branchId);
      if (!hasAccess) {
        throw new ForbiddenException('Access to this facility is denied.');
      }
    }
    return this.service.getDemandForecast(itemId, branchId);
  }

  @Get('redistribution-recommendations')
  async getRedistributionRecommendations(@Req() req: any) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    return this.service.getRedistributionRecommendations(hospitalId || undefined);
  }

  @Post('redistribution/apply')
  async applyRedistribution(@Req() req: any, @Body() body: Record<string, any>) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    if (hospitalId) {
      const fromBranchAccess = await this.service.verifyBranchAccess(hospitalId, body.fromBranchId);
      const toBranchAccess = await this.service.verifyBranchAccess(hospitalId, body.toBranchId);
      if (!fromBranchAccess && !toBranchAccess) {
        throw new ForbiddenException('Access to these facilities is denied.');
      }
    }
    return this.service.applyRecommendation(
      body.fromBranchId,
      body.toBranchId,
      body.itemId,
      Number(body.quantity),
      body.performedBy,
    );
  }
}
