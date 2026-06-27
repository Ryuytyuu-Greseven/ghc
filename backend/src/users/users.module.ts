import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { UserRepository } from '../repositories/user.repository';
import { UsersService } from './users.service';
import { Staff, StaffSchema } from '../schemas/staff.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Staff.name, schema: StaffSchema },
    ]),
  ],
  providers: [UserRepository, UsersService],
  exports: [UserRepository, UsersService, MongooseModule],
})
export class UsersModule {}
