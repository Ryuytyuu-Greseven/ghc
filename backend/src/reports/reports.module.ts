import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PatientData, PatientDataSchema } from '../schemas/patient-data.schema';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { Staff, StaffSchema } from '../schemas/staff.schema';
import { Patient, PatientSchema } from '../schemas/patient.schema';
import { BranchInventory, BranchInventorySchema } from '../schemas/branch-inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientData.name, schema: PatientDataSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: Staff.name, schema: StaffSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
