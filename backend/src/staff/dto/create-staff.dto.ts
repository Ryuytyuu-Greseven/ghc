import { Department } from '../../common/enums';

export class CreateStaffDto {
  userId?: string;
  username?: string;
  password?: string;
  role?: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string | Date;
  mobileNumber: string;
  email?: string;
  department: Department;
  designation?: string;
  joiningDate?: string | Date;
  employmentType?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  experience?: number;
  licenseNumber?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactMobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  hospitalId?: string;
  isMedicalIncharge?: boolean;
  unavailableOnDays?: string[];
}
