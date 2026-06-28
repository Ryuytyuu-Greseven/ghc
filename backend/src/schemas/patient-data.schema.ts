import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDataDocument = PatientData & Document;

@Schema({ timestamps: true, collection: 'patientData' })
export class PatientData {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  problem: string;

  @Prop({ type: Date, required: true })
  visitDate: Date;

  @Prop({ trim: true, default: '' })
  category: string;

  @Prop({ type: [String], default: [] })
  medicines: string[];

  @Prop({ required: true, trim: true })
  doctor: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientDataSchema = SchemaFactory.createForClass(PatientData);
