import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { TransactionType } from '../../common/enums';

export type InventoryTransactionDocument = InventoryTransaction & Document;

@Schema({ timestamps: true })
export class InventoryTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryMaster', required: true })
  itemId: Types.ObjectId;

  @Prop({ trim: true, default: 'Central' })
  fromLocation: string;

  @Prop({ trim: true, required: true })
  toLocation: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, enum: Object.values(TransactionType) })
  transactionType: TransactionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryRequest', default: null })
  requestId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  performedBy: string;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
InventoryTransactionSchema.index({ itemId: 1 });
InventoryTransactionSchema.index({ transactionType: 1 });
InventoryTransactionSchema.index({ createdAt: -1 });
