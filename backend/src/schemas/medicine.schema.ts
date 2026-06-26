import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MedicineDocument = Medicine & Document;

@Schema({ timestamps: true })
export class Medicine {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, default: 'N/A' })
  dosage: string;

  @Prop({ required: true })
  stock: number;

  @Prop({ trim: true, default: 'N/A' })
  manufacturer: string;

  @Prop({ trim: true })
  category: string;

  @Prop({ trim: true, default: 'units' })
  unit: string;

  @Prop({ type: Date, default: null })
  expiryDate: Date;

  @Prop({ required: true, default: 0 })
  pricePerUnit: number;

  @Prop({ default: true })
  isAvailable: boolean;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
