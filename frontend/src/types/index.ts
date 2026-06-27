export type FacilityType = 'PHC' | 'CHC';

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
  parentCHCId?: string | null;
  medicalOfficer?: string | null;
  specialists?: string[];
  hasOT?: boolean;
  hasXRay?: boolean;
  hasAmbulance?: boolean;
}

export type StaffRole = 'Doctor' | 'Nurse' | 'Receptionist' | 'Pharmacist' | 'Lab Technician' | 'Compounder' | 'Cashier';

export type Department =
  | 'General'
  | 'Cardiology'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Gynecology'
  | 'Dermatology'
  | 'Neurology'
  | 'Radiology'
  | 'Laboratory'
  | 'Pharmacy'
  | 'Emergency'
  | 'ICU'
  | 'Operation Theatre'
  | 'Administration';

export interface Staff {
  id: string;
  name: string; // compatibility
  phone: string; // compatibility
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  mobileNumber?: string;
  email?: string;
  role: StaffRole;
  department?: Department;
  designation?: string;
  joiningDate?: string;
  employmentType?: 'Full Time' | 'Part Time' | 'Visiting';
  isActive?: boolean;
  username?: string;
  password?: string;
  // Doctor details
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  experience?: number;
  // Pharmacist details
  licenseNumber?: string;
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactMobile?: string;
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  assignedHospitalId: string | null;
  isMedicalIncharge?: boolean;
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
