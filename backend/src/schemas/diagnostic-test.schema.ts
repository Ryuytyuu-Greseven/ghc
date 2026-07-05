import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  DiagnosticTestCategory,
  DiagnosticTestStatus,
} from '../common/enums/diagnostic-test.enum';

export type DiagnosticTestDocument = DiagnosticTest & Document;

@Schema({ timestamps: true, collection: 'diagnosticTests' })
export class DiagnosticTest {
  @Prop({ required: true, trim: true })
  testName: string;

  @Prop({ trim: true })
  testCode?: string;

  @Prop({
    required: true,
    enum: Object.values(DiagnosticTestCategory),
    default: DiagnosticTestCategory.Lab,
  })
  category: DiagnosticTestCategory;

  @Prop({ trim: true })
  sampleType?: string;

  @Prop({
    enum: Object.values(DiagnosticTestStatus),
    default: DiagnosticTestStatus.Active,
  })
  status: DiagnosticTestStatus;
}

export const DiagnosticTestSchema =
  SchemaFactory.createForClass(DiagnosticTest);
DiagnosticTestSchema.index({ testName: 1 });
DiagnosticTestSchema.index({ status: 1, category: 1 });
