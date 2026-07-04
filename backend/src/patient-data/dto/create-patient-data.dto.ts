class PatientMedicineDto {
  name: string;
  quantity: number;
}

export class CreatePatientDataDto {
  patientId: string;
  problem: string;
  visitDate: string | Date;
  category?: string;
  medicines?: PatientMedicineDto[];
  doctor: string;
  doctorUserId?: string;
  notes?: string;
  isActive?: boolean;
}
