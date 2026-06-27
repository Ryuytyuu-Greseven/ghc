import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findOneByUsername(username: string): Promise<any> {
    if (typeof username !== 'string') {
      return null;
    }
    return this.userRepository.findOne({ username: username.trim() });
  }

  async create(data: Partial<User>): Promise<any> {
    return this.userRepository.create(data);
  }
}
