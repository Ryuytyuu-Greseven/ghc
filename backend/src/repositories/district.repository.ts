import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { District, DistrictDocument } from '../schemas/district.schema';

@Injectable()
export class DistrictRepository {
  constructor(
    @InjectModel(District.name)
    private readonly districtModel: Model<DistrictDocument>,
  ) {}

  async findActiveByState(stateCode: number): Promise<DistrictDocument[]> {
    return this.districtModel
      .find({
        stateCode,
        status: { $in: ['ACTIVE', 'Active'] },
      })
      .sort({ name: 1 })
      .exec();
  }

  async findAllActive(): Promise<DistrictDocument[]> {
    return this.districtModel
      .find({ status: { $in: ['ACTIVE', 'Active'] } })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(filter: object): Promise<DistrictDocument | null> {
    return this.districtModel.findOne(filter).exec();
  }
}
