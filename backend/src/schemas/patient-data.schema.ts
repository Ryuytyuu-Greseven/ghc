import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDataDocument = PatientData & Document;

export class PatientMedicine {
  name: string;
  quantity: number;
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
      },
    ],
    default: [],
  })
  medicines: PatientMedicine[];

  @Prop({ required: true, trim: true })
  doctor: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  doctorUserId?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientDataSchema = SchemaFactory.createForClass(PatientData);
