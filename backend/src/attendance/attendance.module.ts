import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../schemas/attendance.schema';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Attendance.name, schema: AttendanceSchema }]),
    StaffModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceRepository, AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
