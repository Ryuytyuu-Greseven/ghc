import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CoverageRequestDocument = CoverageRequest & Document;

@Schema({ timestamps: true })
export class CoverageRequest {
  @Prop({ type: Types.ObjectId, ref: 'Staff', required: true })
  staffId: Types.ObjectId;

  @Prop({ required: true })
  startDate: string;

  @Prop({ required: true })
  endDate: string;

  @Prop({ type: [String], default: [] })
  dates: string[];

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  vacantHospitalId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'Pending',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Staff' })
  replacementStaffId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  originalReplacementHospitalId?: Types.ObjectId;
}

export const CoverageRequestSchema =
  SchemaFactory.createForClass(CoverageRequest);
