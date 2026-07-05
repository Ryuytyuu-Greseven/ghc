import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { UsersService } from '../users/users.service';
import {
  ClinicalReportQueryDto,
  OccupancyReportQueryDto,
  StaffingReportQueryDto,
  InventoryReportQueryDto,
} from './dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('clinical')
  async getClinicalReport(
    @Req() req: any,
    @Query() query: ClinicalReportQueryDto,
  ) {
    const user = req.user;
    if (user.role !== 'Admin' && user.role !== 'Doctor') {
      throw new ForbiddenException(
        'Access denied. Only Administrators and Doctors can access the clinical report.',
      );
    }
    const assignedHospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    const branchId = assignedHospitalId || query.branchId;
    return this.reportsService.getClinicalReport(
      branchId,
      query.fromDate,
      query.toDate,
    );
  }

  @Get('occupancy')
  async getOccupancyReport(
    @Req() req: any,
    @Query() query: OccupancyReportQueryDto,
  ) {
    const user = req.user;
    const allowed = ['Admin', 'Doctor'];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        'Access denied. Only Doctors and Administrators can access the bed occupancy report.',
      );
    }
    const assignedHospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    const branchId = assignedHospitalId || query.branchId;
    const parsedPage = query.page ? parseInt(query.page, 10) : undefined;
    const parsedPageSize = query.pageSize ? parseInt(query.pageSize, 10) : undefined;
    return this.reportsService.getOccupancyReport(
      branchId,
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
    const user = req.user;
    if (user.role !== 'Admin' && user.role !== 'Doctor') {
      throw new ForbiddenException(
        'Access denied. Only Doctors and Administrators can access the inventory status report.',
      );
    }
    const assignedHospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    const branchId = assignedHospitalId || query.branchId;
    return this.reportsService.getInventoryReport(branchId);
  }
}
