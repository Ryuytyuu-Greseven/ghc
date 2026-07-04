import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true, trim: true, lowercase: true })
  username?: string;

  @Prop()
  passwordHash?: string;

  @Prop({
    required: true,
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop()
  otpCode?: string;

  @Prop()
  otpExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
