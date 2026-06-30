import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'auditlogs', timestamps: true })
export class AuditLog {
  @Prop({ required: true, trim: true })
  module: string; // e.g. 'inventory', 'patients', 'hospitals', 'staff', 'auth'

  @Prop({ required: true, trim: true })
  action: string; // e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'TRANSFER', 'PURCHASE'

  @Prop({ required: true, trim: true })
  message: string; // human-readable descriptive message

  @Prop({ required: true, trim: true })
  performedBy: string; // username

  @Prop({ trim: true, default: null })
  performedByRole?: string; // e.g. 'Admin', 'Doctor'

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  metadata?: any; // extra details (e.g. quantity, items, custom data)
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ createdAt: -1 });
