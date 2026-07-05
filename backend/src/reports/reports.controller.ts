import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import {
  ClinicalReportQueryDto,
  OccupancyReportQueryDto,
  StaffingReportQueryDto,
  InventoryReportQueryDto,
} from './dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('clinical')
  async getClinicalReport(
    @Req() req: any,
    @Query() query: ClinicalReportQueryDto,
  ) {
    return this.reportsService.getClinicalReport(
      req.user,
      query.branchId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('occupancy')
  async getOccupancyReport(
    @Req() req: any,
    @Query() query: OccupancyReportQueryDto,
  ) {
    const parsedPage = query.page ? parseInt(query.page, 10) : undefined;
    const parsedPageSize = query.pageSize ? parseInt(query.pageSize, 10) : undefined;
    return this.reportsService.getOccupancyReport(
      req.user,
      query.branchId,
      parsedPage,
      parsedPageSize,
    );
  }

  @Get('staffing')
  async getStaffingReport(
    @Req() req: any,
    @Query() query: StaffingReportQueryDto,
  ) {
    return this.reportsService.getStaffingReport(req.user, query.branchId);
  }

  @Get('inventory')
  async getInventoryReport(
    @Req() req: any,
    @Query() query: InventoryReportQueryDto,
  ) {
    return this.reportsService.getInventoryReport(req.user, query.branchId);
  }
}
