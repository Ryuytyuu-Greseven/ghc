import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DistrictDocument = District & Document;

@Schema({ collection: 'districts' })
export class District {
  @Prop({ required: true })
  code: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  stateCode: number;

  @Prop()
  stateName: string;

  @Prop({ required: true, default: 'ACTIVE' })
  status: string;
}

export const DistrictSchema = SchemaFactory.createForClass(District);
