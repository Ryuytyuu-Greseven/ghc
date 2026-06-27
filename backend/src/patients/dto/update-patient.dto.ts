import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto implements Partial<CreatePatientDto> {
  name?: string;
  age?: number;
  gender?: CreatePatientDto['gender'];
  bloodGroup?: CreatePatientDto['bloodGroup'];
  phone?: string;
  email?: string;
  address?: string;
  hospitalId?: string;
  condition?: string;
  bedRequired?: boolean;
  admittedAt?: Date | string;
  isActive?: boolean;
}
