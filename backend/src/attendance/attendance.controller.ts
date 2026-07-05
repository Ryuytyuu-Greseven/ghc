import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Req,
  Query,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  async clockIn(@Req() req: any, @Body('date') date?: string) {
    return this.attendanceService.clockIn(req.user, date);
  }

  @Get('status/today')
  async getTodayStatus(@Req() req: any) {
    return this.attendanceService.getTodayStatus(req.user);
  }

  @Get('my-attendance')
  async getMyAttendance(
    @Req() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m)) {
      throw new BadRequestException('Invalid year or month query parameters.');
    }
    return this.attendanceService.getMyAttendance(req.user, y, m);
  }

  @Get('staff/:staffId')
  async getStaffAttendance(
    @Req() req: any,
    @Param('staffId') staffId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (isNaN(y) || isNaN(m)) {
      throw new BadRequestException('Invalid year or month query parameters.');
    }
    return this.attendanceService.getStaffAttendance(req.user, staffId, y, m);
  }

  @Delete('unmark')
  async unmark(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.attendanceService.unmark(req.user, date, staffId);
  }

  @Post('modify')
  async modifyAttendance(
    @Req() req: any,
    @Body('date') date: string,
    @Body('status') status: string,
    @Body('staffId') staffId?: string,
  ) {
    if (!date || !status) {
      throw new BadRequestException('Date and status are required.');
    }
    return this.attendanceService.modifyAttendance(req.user, date, status, staffId);
  }
}
