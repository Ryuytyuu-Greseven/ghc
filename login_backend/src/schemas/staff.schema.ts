import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffDocument = Staff & Document;

@Schema({ collection: 'staffs', timestamps: true })
export class Staff {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    trim: true,
    lowercase: true,
  })
  email?: string;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
