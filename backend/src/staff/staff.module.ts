import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffHelperService } from './staff-helper.service';
import { Staff, StaffSchema } from '../schemas/staff.schema';
import { StaffRepository } from '../repositories/staff.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]),
  ],
  controllers: [StaffController],
  providers: [StaffService, StaffHelperService, StaffRepository],
  exports: [StaffRepository],
})
export class StaffModule {}
