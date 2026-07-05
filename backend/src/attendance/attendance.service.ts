import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { Attendance } from '../schemas/attendance.schema';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly staffRepo: StaffRepository,
  ) {}

  private getTodayUtcStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  async clockIn(user: any, dateStr?: string): Promise<Attendance> {
    const staff = await this.staffRepo.findOne({
      userId: new Types.ObjectId(user.userId),
    });
    if (!staff) {
      throw new NotFoundException('No staff record found for this user.');
    }

    let todayStart: Date;
    if (dateStr) {
      todayStart = new Date(dateStr);
    } else {
      todayStart = this.getTodayUtcStart();
    }

    const existing = await this.attendanceRepo.findOne({
      staffId: staff._id,
      date: todayStart,
    });
    if (existing) {
      throw new BadRequestException('Attendance already logged for today.');
    }

    return this.attendanceRepo.create({
      staffId: staff._id as Types.ObjectId,
      hospitalId: staff.hospitalId as Types.ObjectId | undefined,
      date: todayStart,
      clockInTime: new Date(),
      status: 'Present',
    });
  }

  async getTodayStatus(user: any): Promise<{ marked: boolean; clockInTime?: Date }> {
    const staff = await this.staffRepo.findOne({
      userId: new Types.ObjectId(user.userId),
    });
    if (!staff) {
      throw new NotFoundException('No staff record found for this user.');
    }

    const todayStart = this.getTodayUtcStart();
    const existing = await this.attendanceRepo.findOne({
      staffId: staff._id,
      date: todayStart,
    });

    return {
      marked: !!existing,
      clockInTime: existing?.clockInTime,
    };
  }

  async getMyAttendance(user: any, year: number, month: number): Promise<Attendance[]> {
    const staff = await this.staffRepo.findOne({
      userId: new Types.ObjectId(user.userId),
    });
    if (!staff) {
      throw new NotFoundException('No staff record found for this user.');
    }

    // Month is 1-indexed (1 = Jan, 12 = Dec)
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return this.attendanceRepo.findByStaffAndDateRange(
      (staff._id as any).toString(),
      start,
      end,
    );
  }

  async getStaffAttendance(
    user: any,
    staffId: string,
    year: number,
    month: number,
  ): Promise<Attendance[]> {
    if (user.role !== 'Admin') {
      throw new ForbiddenException('Access denied. Only Administrators can view other staff attendance.');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return this.attendanceRepo.findByStaffAndDateRange(staffId, start, end);
  }

  async unmark(user: any, dateStr?: string, requestedStaffId?: string): Promise<{ success: boolean }> {
    let staffId: string;

    if (user.role === 'Admin' && requestedStaffId) {
      staffId = requestedStaffId;
    } else {
      const staff = await this.staffRepo.findOne({
        userId: new Types.ObjectId(user.userId),
      });
      if (!staff) {
        throw new NotFoundException('No staff record found for this user.');
      }
      staffId = (staff._id as any).toString();
    }

    let targetDate: Date;
    if (dateStr) {
      targetDate = new Date(dateStr);
    } else {
      targetDate = this.getTodayUtcStart();
    }

    const deleted = await this.attendanceRepo.deleteByStaffAndDate(staffId, targetDate);
    if (!deleted) {
      throw new NotFoundException('No attendance record found for this date.');
    }

    return { success: true };
  }

  async modifyAttendance(
    user: any,
    dateStr: string,
    status: string,
    requestedStaffId?: string,
  ): Promise<Attendance> {
    const targetDate = new Date(dateStr);
    const todayStart = this.getTodayUtcStart();

    if (targetDate > todayStart) {
      throw new BadRequestException('Cannot modify attendance logs for future dates.');
    }

    let staffId: string;
    let hospitalId: Types.ObjectId | undefined;

    if (user.role === 'Admin' && requestedStaffId) {
      staffId = requestedStaffId;
      const staff = await this.staffRepo.findById(staffId);
      if (staff) {
        hospitalId = staff.hospitalId as Types.ObjectId | undefined;
      }
    } else {
      const staff = await this.staffRepo.findOne({
        userId: new Types.ObjectId(user.userId),
      });
      if (!staff) {
        throw new NotFoundException('No staff record found for this user.');
      }
      staffId = (staff._id as any).toString();
      hospitalId = staff.hospitalId as Types.ObjectId | undefined;
    }

    const existing = await this.attendanceRepo.findOne({
      staffId: new Types.ObjectId(staffId),
      date: targetDate,
    });

    if (existing) {
      existing.status = status;
      if (status === 'Present' && !existing.clockInTime) {
        existing.clockInTime = new Date();
      }
      return (existing as any).save();
    } else {
      return this.attendanceRepo.create({
        staffId: new Types.ObjectId(staffId),
        hospitalId,
        date: targetDate,
        clockInTime: status === 'Present' ? new Date() : undefined,
        status,
      });
    }
  }
}
