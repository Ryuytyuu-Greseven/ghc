import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { HospitalRepository } from '../repositories/hospital.repository';
import { QueryService } from '../common/services/query.service';
import { HospitalsCommonService } from '../common/services/hospitals.service';
import { BedAllocation, BedAllocationSchema } from '../schemas/bed-allocation.schema';
import { BedAllocationRepository } from '../repositories/bed-allocation.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Hospital.name, schema: HospitalSchema },
      { name: BedAllocation.name, schema: BedAllocationSchema },
    ]),
    UsersModule,
  ],
  controllers: [HospitalsController],
  providers: [
    HospitalsService,
    HospitalRepository,
    QueryService,
    HospitalsCommonService,
    BedAllocationRepository,
  ],
  exports: [HospitalRepository, HospitalsCommonService, BedAllocationRepository],
})
export class HospitalsModule {}


