import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema({ collection: 'states' })
export class State {
  @Prop({ required: true })
  code: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  localName: string;

  @Prop()
  type: string;

  @Prop({ required: true, default: 'ACTIVE' })
  status: string;
}

export const StateSchema = SchemaFactory.createForClass(State);
