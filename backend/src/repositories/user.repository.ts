import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<UserDocument[]> {
    return this.userModel.find(filter).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findOne(filter: object): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).exec();
  }

  async findOneByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: username.trim().toLowerCase() }).exec();
  }

  async create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async updateByUsername(
    username: string,
    data: UpdateQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate({ username: username.trim().toLowerCase() }, data, { new: true }).exec();
  }

  async delete(id: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async deleteByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOneAndDelete({ username: username.trim().toLowerCase() }).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.userModel.countDocuments(filter).exec();
  }
}
