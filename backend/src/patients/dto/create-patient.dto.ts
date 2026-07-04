export type PatientGender = 'male' | 'female' | 'other';
export type PatientBloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

export class CreatePatientDto {
  name: string;
  age: number;
  gender: PatientGender;
  bloodGroup: PatientBloodGroup;
  phone: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  hospitalId: string;
  bedRequired: boolean;
  admittedAt?: Date | string;
  isActive?: boolean;
}
