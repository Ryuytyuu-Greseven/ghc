class PatientMedicineDto {
  name: string;
  quantity: number;
  days?: number;
  sessions?: string[];
  quantityPerSession?: number;
}

export class CreatePatientDataDto {
  patientId: string;
  problem: string;
  visitDate: string | Date;
  category?: string;
  medicines?: PatientMedicineDto[];
  doctor: string;
  doctorUserId?: string;
  nurse?: string;
  nurseUserId?: string;
  notes?: string;
  recommendedTests?: string[];
  isActive?: boolean;
  bedRequired?: boolean;
  admittedAt?: string;
  dischargedAt?: string;
  status?: string;
  forceAdmit?: boolean;
}
