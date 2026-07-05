import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Staff', required: true })
  staffId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: false })
  hospitalId?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Date, default: () => new Date() })
  clockInTime: Date;

  @Prop({
    required: true,
    enum: ['Present', 'Absent', 'On Leave'],
    default: 'Present',
  })
  status: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Add compound index to prevent duplicate clock-in for the same staff member on the same day
AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
