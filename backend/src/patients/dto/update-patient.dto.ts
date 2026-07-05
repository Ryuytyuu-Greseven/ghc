import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto implements Partial<CreatePatientDto> {
  name?: string;
  age?: number;
  gender?: CreatePatientDto['gender'];
  bloodGroup?: CreatePatientDto['bloodGroup'];
  phone?: string;
  email?: string;
  aadhaarNumber?: string;
  address?: string;
  state?: number;
  city?: number;
  hospitalId?: string;
  bedRequired?: boolean;
  admittedAt?: Date | string;
  dischargedAt?: Date | string;
  isActive?: boolean;
}
