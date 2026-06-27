import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Department, UserRole } from 'src/common/enums';

export type StaffDocument = Staff & Document;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ required: true, unique: true, trim: true })
  employeeId: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
  displayName?: string;

  @Prop({
    enum: ['Male', 'Female', 'Other'],
  })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ required: true, trim: true })
  mobileNumber: string;

  @Prop({
    trim: true,
    lowercase: true,
  })
  email?: string;

  @Prop({
    required: true,
    enum: UserRole,
  })
  role: UserRole;

  @Prop({
    required: true,
    enum: Department,
  })
  department: Department;

  @Prop()
  designation?: string;

  @Prop()
  joiningDate?: Date;

  @Prop({
    enum: ['Full Time', 'Part Time', 'Visiting'],
    default: 'Full Time',
  })
  employmentType: string;



  @Prop({ trim: true })
  username?: string;

  @Prop()
  passwordHash?: string;

  // Doctor Details
  @Prop()
  specialization?: string;

  @Prop()
  qualification?: string;

  @Prop()
  registrationNumber?: string;

  @Prop()
  experience?: number;

  // Pharmacist
  @Prop()
  licenseNumber?: string;

  // Emergency Contact
  @Prop()
  emergencyContactName?: string;

  @Prop()
  emergencyContactRelationship?: string;

  @Prop()
  emergencyContactMobile?: string;

  // Address
  @Prop()
  addressLine1?: string;

  @Prop()
  addressLine2?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  pincode?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Hospital',
    required: true,
  })
  hospitalId: Types.ObjectId;

  @Prop({ default: false })
  isMedicalIncharge?: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);