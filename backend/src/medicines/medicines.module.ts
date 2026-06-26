import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { MedicinesHelperService } from './medicines-helper.service';
import { Medicine, MedicineSchema } from '../schemas/medicine.schema';
import { MedicineRepository } from '../repositories/medicine.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Medicine.name, schema: MedicineSchema }]),
  ],
  controllers: [MedicinesController],
  providers: [MedicinesService, MedicinesHelperService, MedicineRepository],
  exports: [MedicineRepository],
})
export class MedicinesModule {}
