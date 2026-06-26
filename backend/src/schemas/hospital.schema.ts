import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { FacilityType } from '../shared/facility-type.enum';

export type HospitalDocument = Hospital & Document;

@Schema({ timestamps: true })
export class Hospital {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, enum: Object.values(FacilityType) })
  type: FacilityType;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true, lowercase: true })
  email: string;

  @Prop({ default: 0 })
  totalBeds: number;

  @Prop({ default: 0 })
  availableBeds: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hospital', default: null })
  parentCHCId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  medicalOfficer: string | null;

  @Prop({ type: [String], default: [] })
  specialists: string[];

  @Prop({ default: false })
  hasOT: boolean;

  @Prop({ default: false })
  hasXRay: boolean;

  @Prop({ default: false })
  hasAmbulance: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);
