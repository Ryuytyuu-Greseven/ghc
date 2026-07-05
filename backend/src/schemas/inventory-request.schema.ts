import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { RequestStatus } from '../common/enums';

@Schema({ _id: false })
class RequestItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'InventoryMaster',
    required: true,
  })
  itemId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  requestedQty: number;

  @Prop({ default: 0, min: 0 })
  approvedQty: number;

  @Prop({ default: 0, min: 0 })
  issuedQty: number;
}

const RequestItemSchema = SchemaFactory.createForClass(RequestItem);

export type InventoryRequestDocument = InventoryRequest & Document;

@Schema({ timestamps: true })
export class InventoryRequest {
  @Prop({ required: true, unique: true, trim: true })
  requestNumber: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  })
  branchId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hospital',
    required: false,
    default: null,
  })
  fromBranchId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  requestedBy: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  })
  userId?: Types.ObjectId | null;

  @Prop({ enum: Object.values(RequestStatus), default: RequestStatus.PENDING })
  status: RequestStatus;

  @Prop({ trim: true, default: '' })
  remarks: string;

  @Prop({ type: [RequestItemSchema], default: [] })
  items: RequestItem[];
}

export const InventoryRequestSchema =
  SchemaFactory.createForClass(InventoryRequest);
InventoryRequestSchema.index({ branchId: 1 });
InventoryRequestSchema.index({ status: 1 });
InventoryRequestSchema.index({ createdAt: -1 });
