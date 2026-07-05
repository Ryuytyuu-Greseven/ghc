import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { State, StateSchema } from '../schemas/state.schema';
import { District, DistrictSchema } from '../schemas/district.schema';
import { StateRepository } from '../repositories/state.repository';
import { DistrictRepository } from '../repositories/district.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: State.name, schema: StateSchema },
      { name: District.name, schema: DistrictSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService, StateRepository, DistrictRepository],
  exports: [LocationsService, StateRepository, DistrictRepository],
})
export class LocationsModule {}
