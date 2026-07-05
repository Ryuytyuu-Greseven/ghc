import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  })
  bloodGroup: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true, unique: true })
  aadhaarNumber: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ type: Number })
  state: number;

  @Prop({ type: Number })
  city: number;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  hospitalId: Types.ObjectId;

  @Prop({ default: false })
  bedRequired: boolean;

  @Prop({ type: Date, default: () => new Date() })
  admittedAt: Date;

  @Prop({ type: Date })
  dischargedAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
