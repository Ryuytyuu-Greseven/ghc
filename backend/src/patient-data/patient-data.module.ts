import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientDataController } from './patient-data.controller';
import { PatientDataService } from './patient-data.service';
import { PatientData, PatientDataSchema } from '../schemas/patient-data.schema';
import { PatientDataRepository } from '../repositories/patient-data.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { PatientsModule } from '../patients/patients.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientData.name, schema: PatientDataSchema },
    ]),
    InventoryModule,
    PatientsModule,
    NotificationsModule,
    StaffModule,
  ],
  controllers: [PatientDataController],
  providers: [PatientDataService, PatientDataRepository],
  exports: [PatientDataRepository],
})
export class PatientDataModule {}
