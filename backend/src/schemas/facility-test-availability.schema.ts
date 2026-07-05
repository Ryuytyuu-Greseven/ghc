import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { TestAvailabilityStatus } from '../common/enums/diagnostic-test.enum';

export type FacilityTestAvailabilityDocument = FacilityTestAvailability &
  Document;

@Schema({ timestamps: true, collection: 'facilityTestAvailability' })
export class FacilityTestAvailability {
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
    default: TestAvailabilityStatus.Available,
  })
  status: TestAvailabilityStatus;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: Date })
  lastAuditedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  lastAuditedBy?: Types.ObjectId;
}

export const FacilityTestAvailabilitySchema = SchemaFactory.createForClass(
  FacilityTestAvailability,
);
FacilityTestAvailabilitySchema.index(
  { hospitalId: 1, testId: 1 },
  { unique: true },
);
