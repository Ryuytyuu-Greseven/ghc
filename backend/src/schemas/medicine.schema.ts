import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MedicineDocument = Medicine & Document;

@Schema({ timestamps: true })
export class Medicine {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  dosage: string;

  @Prop({ required: true })
  stock: number;

  @Prop({ trim: true })
  manufacturer: string;

  @Prop({ trim: true })
  category: string;

  @Prop()
  expiryDate: Date;

  @Prop({ required: true, default: 0 })
  pricePerUnit: number;

  @Prop({ default: true })
  isAvailable: boolean;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
