import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'auditlogs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, trim: true })
  module: string;

  @Prop({ required: true, trim: true })
  action: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ required: true, trim: true })
  performedBy: string;

  @Prop({ trim: true, default: null })
  performedByRole?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  metadata?: any;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
