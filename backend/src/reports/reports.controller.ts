import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
    const userRole = req.user.role;
    if (userRole !== 'Admin' && userRole !== 'Doctor') {
      throw new ForbiddenException(
        'Access denied. Only Administrators and Doctors can access the clinical report.',
      );
    }
    return this.reportsService.getClinicalReport(
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
    const userRole = req.user.role;
    const allowed = ['Admin', 'Doctor', 'Nurse', 'Receptionist'];
    if (!allowed.includes(userRole)) {
      throw new ForbiddenException(
        'Access denied. Only clinical staff and Administrators can access the bed occupancy report.',
      );
    }
    const parsedPage = query.page ? parseInt(query.page, 10) : undefined;
    const parsedPageSize = query.pageSize ? parseInt(query.pageSize, 10) : undefined;
    return this.reportsService.getOccupancyReport(
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
    const userRole = req.user.role;
    if (userRole !== 'Admin') {
      throw new ForbiddenException(
        'Access denied. Only Administrators can access the staffing report.',
      );
    }
    return this.reportsService.getStaffingReport(query.branchId);
  }

  @Get('inventory')
  async getInventoryReport(
    @Req() req: any,
    @Query() query: InventoryReportQueryDto,
  ) {
    const userRole = req.user.role;
    if (userRole !== 'Admin' && userRole !== 'Pharmacist') {
      throw new ForbiddenException(
        'Access denied. Only Pharmacists and Administrators can access the inventory status report.',
      );
    }
    return this.reportsService.getInventoryReport(query.branchId);
  }
}
