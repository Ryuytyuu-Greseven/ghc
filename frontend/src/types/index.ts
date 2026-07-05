export type FacilityType = 'PHC' | 'CHC';

export interface Hospital {
  id: string;
  _id?: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string | number;
  state?: string | number | null;
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
  hospitalId?: string | null;
  version?: number;
  isCurrent?: boolean;
  updatedAt?: string;
  stateCode?: number;
  cityCode?: number;
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
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  mobileNumber?: string;
  email?: string;
  role: StaffRole;
  department?: Department;
  userId?: string;
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
  city?: string | number;
  state?: string | number;
  pincode?: string;
  assignedHospitalId: string | null;
  isMedicalIncharge?: boolean;
  unavailableOnDays?: string[];
  createdAt: string;
  stateCode?: number;
  cityCode?: number;
}

export type Gender = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  phone: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  state?: string | number;
  city?: string | number;
  stateCode?: number;
  cityCode?: number;
  hospitalId: string;
  bedRequired: boolean;
  admittedAt: string;
}

export type PatientDraft = Omit<Patient, 'id' | 'admittedAt'>;

export interface PatientFormValues {
  name: string;
  age: string;
  gender: Gender | '';
  bloodGroup: BloodGroup | '';
  phone: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  state: string;
  city: string;
  hospitalId: string;
  bedRequired: boolean;
}

export interface PatientMedicine {
  name: string;
  quantity: number;
  days?: number;
  sessions?: string[];
  quantityPerSession?: number;
}

export interface PatientData {
  id: string;
  patientId: string;
  problem: string;
  visitDate: string;
  category: string;
  medicines: PatientMedicine[];
  doctor?: string;
  nurse?: string;
  nurseUserId?: string;
  nurse?: string;
  notes?: string;
  recommendedTests?: string[];
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

// ── Inventory Module ──────────────────────────────────────────────────────────

export type InventoryCategory =
  | 'Medicine'
  | 'Equipment'
  | 'Consumable'
  | 'Surgical'
  | 'Diagnostic'
  | 'Other';

export type InventoryStatus = 'Active' | 'Inactive';

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Partial';

export type TransactionType =
  | 'Purchase'
  | 'Transfer'
  | 'Issue'
  | 'Return'
  | 'Damage'
  | 'Expiry'
  | 'Adjustment';

export interface InventoryMaster {
  _id: string;
  itemName: string;
  category: InventoryCategory;
  status: InventoryStatus;
  createdAt: string;
}

export interface PopulatedItem {
  _id: string;
  itemName: string;
  category: InventoryCategory;
}

export interface CentralInventoryEntry {
  _id: string;
  itemId: PopulatedItem;
  availableQty: number;
  damagedQty: number;
  batchNo: string;
  expiryDate: string | null;
  updatedAt: string;
}

export interface BranchInventoryEntry {
  _id: string;
  branchId: string;
  itemId: PopulatedItem;
  availableQty: number;
  damagedQty: number;
  batchNo: string;
  expiryDate: string | null;
  updatedAt: string;
}

export interface RequestItem {
  itemId: PopulatedItem;
  requestedQty: number;
  approvedQty: number;
  issuedQty: number;
}

export interface PopulatedBranch {
  _id: string;
  name: string;
  city: string;
}

export interface InventoryRequest {
  _id: string;
  requestNumber: string;
  branchId: PopulatedBranch;
  fromBranchId?: PopulatedBranch | null;
  requestedBy: string;
  status: RequestStatus;
  remarks: string;
  items: RequestItem[];
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  module: string;
  action: string;
  message: string;
  performedBy: string;
  performedByRole?: string;
  metadata?: any;
  createdAt: string;
}


export type NotificationCategory = 'info' | 'success' | 'warning';

export interface AppNotification {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface StockoutWarning {
  branchId: string;
  branchName: string;
  itemId: string;
  itemName: string;
  availableQty: number;
  dailyConsumptionRate: number;
  daysOfStock: number;
}

export interface DailyDataPoint {
  date: string;
  quantity: number;
}

export interface DemandForecast {
  itemId: string;
  branchId: string;
  itemName: string;
  branchName: string;
  averageDailyConsumption: number;
  historicalDaily: DailyDataPoint[];
  forecast7Day: DailyDataPoint[];
  forecast30Day: DailyDataPoint[];
  aiSummary: string;
}

export interface RedistributionRecommendation {
  itemId: string;
  itemName: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  recommendedQuantity: number;
  justification: string;
  isAlreadyRequested?: boolean;
}

// ── Diagnostic Test Tracking ──────────────────────────────────────────────────

export type DiagnosticTestCategory = 'Lab' | 'Imaging' | 'Pathology' | 'Other';
export type DiagnosticTestStatus = 'Active' | 'Inactive';
export type TestAvailabilityStatus =
  | 'Available'
  | 'Unavailable'
  | 'Partial'
  | 'OutOfOrder'
  | 'NotAudited';

export type WritableTestAvailabilityStatus = Exclude<
  TestAvailabilityStatus,
  'NotAudited'
>;

export interface FacilityAvailabilityEntry {
  hospitalId: string;
  status: WritableTestAvailabilityStatus;
  reason?: string;
}

export interface DiagnosticTest {
  _id: string;
  testName: string;
  testCode?: string;
  category: DiagnosticTestCategory;
  sampleType?: string;
  status: DiagnosticTestStatus;
  createdAt?: string;
  facilityAvailabilities?: FacilityAvailabilityEntry[];
}

export interface FacilityTestAvailabilityRow {
  testId: string;
  testName: string;
  testCode?: string;
  category: DiagnosticTestCategory;
  sampleType?: string;
  status: TestAvailabilityStatus;
  reason?: string;
  lastAuditedAt?: string | null;
  availabilityId?: string | null;
}

export interface TestAvailabilityAudit {
  _id: string;
  hospitalId: string | PopulatedBranch;
  testId: string | { _id: string; testName: string; testCode?: string; category?: string };
  previousStatus: TestAvailabilityStatus;
  newStatus: TestAvailabilityStatus;
  reason?: string;
  auditedAt: string;
  createdAt?: string;
}
