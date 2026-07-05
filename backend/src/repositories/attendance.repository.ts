import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from '../schemas/attendance.schema';

@Injectable()
export class AttendanceRepository {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
  ) {}

  async create(data: Partial<Attendance>): Promise<AttendanceDocument> {
    return this.attendanceModel.create(data);
  }

  async findOne(filter: object): Promise<AttendanceDocument | null> {
    return this.attendanceModel.findOne(filter).exec();
  }

  async find(filter: object): Promise<AttendanceDocument[]> {
    return this.attendanceModel.find(filter).sort({ date: 1 }).exec();
  }

  async findByStaffAndDateRange(
    staffId: string,
    start: Date,
    end: Date,
  ): Promise<AttendanceDocument[]> {
    return this.attendanceModel
      .find({
        staffId: new Types.ObjectId(staffId),
        date: { $gte: start, $lte: end },
      })
      .sort({ date: 1 })
      .exec();
  }

  async deleteByStaffAndDate(staffId: string, date: Date): Promise<boolean> {
    const res = await this.attendanceModel.deleteOne({
      staffId: new Types.ObjectId(staffId),
      date,
    }).exec();
    return res.deletedCount > 0;
  }
}
