import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BedAllocationDocument = BedAllocation & Document;

@Schema({ timestamps: true })
export class BedAllocation {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  hospitalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['ALLOCATED', 'DEALLOCATED'],
    default: 'ALLOCATED',
  })
  status: string;

  @Prop({ type: Date, default: () => new Date() })
  allocatedAt: Date;

  @Prop({ type: Date, default: null })
  deallocatedAt: Date | null;
}

export const BedAllocationSchema = SchemaFactory.createForClass(BedAllocation);
