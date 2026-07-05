import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsHelperService } from './patients-helper.service';
import { Patient, PatientSchema } from '../schemas/patient.schema';
import { PatientRepository } from '../repositories/patient.repository';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
    HospitalsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsHelperService, PatientRepository],
  exports: [PatientRepository, MongooseModule],
})
export class PatientsModule {}
