import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { FacilityAlertsService } from './facility-alerts/facility-alerts.service';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { HospitalRepository } from '../repositories/hospital.repository';
import { QueryService } from '../common/services/query.service';
import { HospitalsCommonService } from '../common/services/hospitals.service';
import { BedAllocation, BedAllocationSchema } from '../schemas/bed-allocation.schema';
import { BedAllocationRepository } from '../repositories/bed-allocation.repository';
import { BranchInventory, BranchInventorySchema } from '../schemas/branch-inventory.schema';
import { BranchInventoryRepository } from '../repositories/branch-inventory.repository';
import { Staff, StaffSchema } from '../schemas/staff.schema';
import { StaffRepository } from '../repositories/staff.repository';
import { Patient, PatientSchema } from '../schemas/patient.schema';
import { PatientRepository } from '../repositories/patient.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Hospital.name, schema: HospitalSchema },
      { name: BedAllocation.name, schema: BedAllocationSchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
      { name: Staff.name, schema: StaffSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
    UsersModule,
  ],
  controllers: [HospitalsController],
  providers: [
    HospitalsService,
    FacilityAlertsService,
    HospitalRepository,
    QueryService,
    HospitalsCommonService,
    BedAllocationRepository,
    BranchInventoryRepository,
    StaffRepository,
    PatientRepository,
  ],
  exports: [
    HospitalRepository,
    HospitalsCommonService,
    BedAllocationRepository,
    FacilityAlertsService,
  ],
})
export class HospitalsModule {}


