import { CreatePatientDataDto } from './create-patient-data.dto';

export class UpdatePatientDataDto implements Partial<CreatePatientDataDto> {
  patientId?: string;
  problem?: string;
  visitDate?: string | Date;
  category?: string;
  medicines?: any;
  doctor?: string;
  doctorUserId?: string;
  notes?: string;
  isActive?: boolean;
}
