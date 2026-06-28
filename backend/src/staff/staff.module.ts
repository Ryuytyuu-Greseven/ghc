import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffHelperService } from './staff-helper.service';
import { Staff, StaffSchema } from '../schemas/staff.schema';
import { CoverageRequest, CoverageRequestSchema } from '../schemas/coverage-request.schema';
import { StaffRepository } from '../repositories/staff.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Staff.name, schema: StaffSchema },
      { name: CoverageRequest.name, schema: CoverageRequestSchema },
    ]),
    UsersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, StaffHelperService, StaffRepository],
  exports: [StaffRepository],
})
export class StaffModule {}
