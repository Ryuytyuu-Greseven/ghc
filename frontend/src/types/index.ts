export type FacilityType = 'hospital' | 'clinic';

export interface Hospital {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string;
  phone: string;
  email: string;
  totalBeds: number;
  availableBeds: number;
  createdAt: string;
}

export type StaffRole = 'doctor' | 'nurse' | 'technician' | 'admin' | 'pharmacist';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  specialization: string;
  phone: string;
  email: string;
  assignedHospitalId: string | null;
  createdAt: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  address: string;
  hospitalId: string;
  bedRequired: boolean;
  admittedAt: string;
  condition: string;
}

export type MedicineCategory = 'medication' | 'equipment' | 'consumable' | 'diagnostic';

export interface Medicine {
  id: string;
  name: string;
  category: MedicineCategory;
  unit: string;
  totalStock: number;
  createdAt: string;
}

export interface HospitalMedicine {
  id: string;
  hospitalId: string;
  medicineId: string;
  quantity: number;
  assignedAt: string;
}
