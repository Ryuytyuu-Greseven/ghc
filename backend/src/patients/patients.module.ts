import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsHelperService } from './patients-helper.service';
import { Patient, PatientSchema } from '../schemas/patient.schema';
import { PatientData, PatientDataSchema } from '../schemas/patient-data.schema';
import { PatientRepository } from '../repositories/patient.repository';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: PatientData.name, schema: PatientDataSchema },
    ]),
    HospitalsModule,
    UsersModule,
    NotificationsModule,
    LocationsModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsHelperService, PatientRepository],
  exports: [PatientRepository, MongooseModule],
})
export class PatientsModule {}
