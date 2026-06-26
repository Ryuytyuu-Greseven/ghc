import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { HospitalsHelperService } from './hospitals-helper.service';
import { Hospital, HospitalSchema } from '../schemas/hospital.schema';
import { HospitalRepository } from '../repositories/hospital.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hospital.name, schema: HospitalSchema }]),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService, HospitalsHelperService, HospitalRepository],
  exports: [HospitalRepository],
})
export class HospitalsModule {}
