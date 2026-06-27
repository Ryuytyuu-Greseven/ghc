import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { HospitalRepository } from '../repositories/hospital.repository';
import { QueryService } from '../common/services/query.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Hospital.name, schema: HospitalSchema }]),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService, HospitalRepository, QueryService],
  exports: [HospitalRepository],
})
export class HospitalsModule {}
