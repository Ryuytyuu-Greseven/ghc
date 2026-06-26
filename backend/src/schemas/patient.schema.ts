import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  age: number;

  @Prop({ required: true, enum: ['male', 'female', 'other'], default: 'male' })
  gender: string;

  @Prop({ required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: 'O+' })
  bloodGroup: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true, lowercase: true })
  email: string;

  @Prop({ trim: true })
  address: string;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  hospitalId: Types.ObjectId;

  @Prop({ default: false })
  bedRequired: boolean;

  @Prop({ type: Date, default: () => new Date() })
  admittedAt: Date;

  @Prop({ trim: true, default: '' })
  condition: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
