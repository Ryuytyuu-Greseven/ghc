import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDataDocument = PatientData & Document;

export class PatientMedicine {
  name: string;
  quantity: number;
  days?: number;
  sessions?: string[];
  quantityPerSession?: number;
}

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

  @Prop({
    type: [
      {
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        days: { type: Number },
        sessions: { type: [String] },
        quantityPerSession: { type: Number },
      },
    ],
    default: [],
  })
  medicines: PatientMedicine[];

  @Prop({ required: true, trim: true })
  doctor: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  doctorUserId?: Types.ObjectId;

  @Prop({ trim: true, default: '' })
  nurse?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  nurseUserId?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: [String], default: [] })
  recommendedTests?: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientDataSchema = SchemaFactory.createForClass(PatientData);
