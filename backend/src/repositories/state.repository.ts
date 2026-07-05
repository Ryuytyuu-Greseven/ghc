import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from '../schemas/state.schema';

@Injectable()
export class StateRepository {
  constructor(
    @InjectModel(State.name)
    private readonly stateModel: Model<StateDocument>,
  ) {}

  async findAllActive(): Promise<StateDocument[]> {
    return this.stateModel
      .find({ status: { $in: ['ACTIVE', 'Active'] } })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(filter: object): Promise<StateDocument | null> {
    return this.stateModel.findOne(filter).exec();
  }
}
