import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InventoryCategory, InventoryStatus } from '../common/enums';

export type InventoryMasterDocument = InventoryMaster & Document;

@Schema({ timestamps: true })
export class InventoryMaster {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  itemCode: string;

  @Prop({ required: true, trim: true })
  itemName: string;

  @Prop({ required: true, enum: Object.values(InventoryCategory) })
  category: InventoryCategory;

  @Prop({ required: true, trim: true })
  unit: string;

  @Prop({ enum: Object.values(InventoryStatus), default: InventoryStatus.ACTIVE })
  status: InventoryStatus;
}

export const InventoryMasterSchema = SchemaFactory.createForClass(InventoryMaster);
InventoryMasterSchema.index({ itemName: 1 });
