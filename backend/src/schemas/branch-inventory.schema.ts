import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type BranchInventoryDocument = BranchInventory & Document;

@Schema({ timestamps: true })
export class BranchInventory {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  })
  branchId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'InventoryMaster',
    required: true,
  })
  itemId: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  availableQty: number;

  @Prop({ default: 0, min: 0 })
  damagedQty: number;

  @Prop({ required: true, trim: true })
  batchNo: string;

  @Prop({ type: Date, default: null })
  expiryDate: Date;
}

export const BranchInventorySchema =
  SchemaFactory.createForClass(BranchInventory);
BranchInventorySchema.index(
  { branchId: 1, itemId: 1, batchNo: 1 },
  { unique: true },
);
