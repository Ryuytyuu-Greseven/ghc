import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { TestAvailabilityStatus } from '../common/enums/diagnostic-test.enum';

export type TestAvailabilityAuditDocument = TestAvailabilityAudit & Document;

@Schema({ timestamps: true, collection: 'testAvailabilityAudits' })
export class TestAvailabilityAudit {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
  })
  hospitalId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'DiagnosticTest',
    required: true,
  })
  testId: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(TestAvailabilityStatus),
  })
  previousStatus: TestAvailabilityStatus;

  @Prop({
    required: true,
    enum: Object.values(TestAvailabilityStatus),
  })
  newStatus: TestAvailabilityStatus;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  auditedBy?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  auditedAt: Date;
}

export const TestAvailabilityAuditSchema = SchemaFactory.createForClass(
  TestAvailabilityAudit,
);
TestAvailabilityAuditSchema.index({ hospitalId: 1, auditedAt: -1 });
TestAvailabilityAuditSchema.index({ testId: 1, auditedAt: -1 });
