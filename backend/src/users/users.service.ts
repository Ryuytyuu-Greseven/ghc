import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../schemas/user.schema';
import { Staff, StaffDocument } from '../schemas/staff.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
  ) {}

  async getAssignedHospitalId(
    userId: string,
    role: string,
  ): Promise<string | null> {
    if (role === 'Admin') {
      return null;
    }
    const staff = await this.staffModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
    return staff?.hospitalId ? staff.hospitalId.toString() : null;
  }

  async findOneByUsername(username: string): Promise<any> {
    if (typeof username !== 'string') {
      return null;
    }
    return this.userRepository.findOneByUsername(username);
  }

  async create(data: Partial<User>): Promise<any> {
    return this.userRepository.create(data);
  }

  async update(username: string, data: Partial<User>): Promise<any> {
    return this.userRepository.updateByUsername(username, data);
  }

  async updateById(id: string, data: Partial<User>): Promise<any> {
    return this.userRepository.update(id, data);
  }

  async findById(id: string): Promise<any> {
    return this.userRepository.findById(id);
  }

  async delete(username: string): Promise<any> {
    const user = await this.findOneByUsername(username);
    if (user) {
      await this.staffModel.deleteMany({ userId: user._id });
    }
    return this.userRepository.deleteByUsername(username);
  }

  async deleteById(id: string): Promise<any> {
    await this.staffModel.deleteMany({ userId: id });
    return this.userRepository.delete(id);
  }
}
