import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hospitalApi } from '../services/hospitalApi';
import type { ReactNode } from 'react';
import { environment } from '@env/environment';
import type { Hospital, Staff, Patient, PatientDraft, Medicine, HospitalMedicine } from '../types';
import {
  mockHospitals,
  mockStaff,
  mockPatients,
  mockHospitalMedicines,
} from '../data/mockData';

interface AppContextValue {
  hospitals: Hospital[];
  staff: Staff[];
  patients: Patient[];
  medicines: Medicine[];
  dbHospitals?: Hospital[];
  dbStaff?: Staff[];
  dbPatients?: Patient[];
  dbMedicines?: Medicine[];
  hospitalMedicines: HospitalMedicine[];
  currentUser: { id: string; username: string; role: string } | null;
  loading: boolean;

  addHospital: (h: Omit<Hospital, 'id' | 'createdAt'>) => Promise<void>;
  updateHospital: (id: string, h: Partial<Hospital>) => Promise<void>;
  deleteHospital: (id: string) => void;
  getHospitalHistory: (id: string) => Promise<Hospital[]>;
  getBedAllocationHistory: (id: string) => Promise<any[]>;

  addStaff: (s: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, s: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  assignStaff: (staffId: string, hospitalId: string | null) => void;

  addPatient: (p: PatientDraft) => Promise<void>;
  updatePatient: (id: string, p: PatientDraft) => Promise<void>;

  addMedicine: (m: Omit<Medicine, 'id' | 'createdAt'>) => void;
  updateMedicine: (id: string, m: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;

  assignMedicine: (hospitalId: string, medicineId: string, quantity: number) => void;
  updateMedicineAssignment: (id: string, quantity: number) => void;
  removeMedicineAssignment: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const API_BASE = environment.mainBackendUrl;

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('ghc_auth_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await window.fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('ghc_auth_token');
    window.location.replace(environment.loginFrontendUrl);
    throw new Error('Unauthorized');
  }
  return response;
}

// Preserve backend validation/conflict messages so forms can show them directly.
async function getApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string') return data.message;
  } catch {
    return fallback;
  }
  return fallback;
}

function mapHospitalFromBackend(item: any): Hospital {
  return {
    id: item.hospitalId ?? item._id ?? item.id ?? '',
    _id: item._id ?? item.id ?? '',
    name: item.name,
    type: item.type,
    address: item.address,
    city: item.city,
    phone: item.phone ?? '',
    email: item.email ?? '',
    totalBeds: item.totalBeds ?? 0,
    availableBeds: item.availableBeds ?? 0,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    parentCHCId: item.parentCHCId ?? null,
    medicalOfficer: item.medicalOfficer ?? null,
    specialists: item.specialists ?? [],
    hasOT: item.hasOT ?? false,
    hasXRay: item.hasXRay ?? false,
    hasAmbulance: item.hasAmbulance ?? false,
    hospitalId: item.hospitalId ?? null,
    version: item.version ?? 1,
    isCurrent: item.isCurrent ?? true,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : undefined,
  };
}

function mapRoleFromBackend(backendRole: string): any {
  if (!backendRole) return 'Doctor';
  const normalized = backendRole.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'doctor') return 'Doctor';
  if (lower === 'nurse') return 'Nurse';
  if (lower === 'receptionist') return 'Receptionist';
  if (lower === 'pharmacist') return 'Pharmacist';
  if (lower === 'lab technician' || lower === 'technician') return 'Lab Technician';
  if (lower === 'compounder') return 'Compounder';
  if (lower === 'cashier') return 'Cashier';
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

function mapStaffFromBackend(item: any): Staff {
  return {
    id: item._id ?? item.id ?? '',
    name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed',
    role: mapRoleFromBackend(item.role),
    phone: item.phone ?? item.mobileNumber ?? '',
    email: item.email ?? '',
    assignedHospitalId: item.hospitalId?._id ?? item.hospitalId ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],

    firstName: item.firstName,
    lastName: item.lastName,
    displayName: item.displayName,
    gender: item.gender,
    dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth).toISOString().split('T')[0] : undefined,
    mobileNumber: item.mobileNumber,
    department: item.department,
    userId: item.userId,
    designation: item.designation,
    joiningDate: item.joiningDate ? new Date(item.joiningDate).toISOString().split('T')[0] : undefined,
    employmentType: item.employmentType,
    username: item.username,
    specialization: item.specialization,
    qualification: item.qualification,
    registrationNumber: item.registrationNumber,
    experience: item.experience,
    licenseNumber: item.licenseNumber,
    emergencyContactName: item.emergencyContactName,
    emergencyContactRelationship: item.emergencyContactRelationship,
    emergencyContactMobile: item.emergencyContactMobile,
    addressLine1: item.addressLine1,
    addressLine2: item.addressLine2,
    city: item.city,
    state: item.state,
    pincode: item.pincode,
    isMedicalIncharge: item.isMedicalIncharge ?? false,
    isActive: item.isActive ?? true,
    unavailableOnDays: item.unavailableOnDays || [],
  };
}

function mapStaffToBackend(s: any): any {
  const capRole = s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : 'Doctor';
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    displayName: s.displayName,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : undefined,
    mobileNumber: s.mobileNumber || s.phone,
    email: s.email,
    role: capRole,
    department: s.department ?? s.specialization ?? 'General',
    designation: s.designation,
    joiningDate: s.joiningDate ? new Date(s.joiningDate) : undefined,
    employmentType: s.employmentType || 'Full Time',
    username: s.username,
    passwordHash: s.password,
    specialization: s.specialization ?? s.department,
    qualification: s.qualification,
    registrationNumber: s.registrationNumber,
    experience: s.experience ? Number(s.experience) : undefined,
    licenseNumber: s.licenseNumber,
    emergencyContactName: s.emergencyContactName,
    emergencyContactRelationship: s.emergencyContactRelationship,
    emergencyContactMobile: s.emergencyContactMobile,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    city: s.city,
    state: s.state,
    pincode: s.pincode,
    hospitalId: s.assignedHospitalId || s.hospitalId || null,
    isActive: s.isActive ?? true,
    isMedicalIncharge: s.isMedicalIncharge ?? false,
    unavailableOnDays: s.unavailableOnDays || [],

    name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
    phone: s.phone || s.mobileNumber,
  };
}

function getPatientHospitalId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.hospitalId ?? value._id?.toString?.() ?? value.id ?? '';
}

function mapPatientFromBackend(item: any): Patient {
  return {
    id: item._id ?? item.id ?? '',
    name: item.name,
    age: item.age ?? 0,
    gender: item.gender ?? 'male',
    bloodGroup: item.bloodGroup,
    phone: item.phone ?? '',
    email: item.email ?? '',
    aadhaarNumber: item.aadhaarNumber ?? '',
    address: item.address ?? '',
    hospitalId: getPatientHospitalId(item.hospitalId),
    bedRequired: item.bedRequired ?? false,
    admittedAt: item.admittedAt ? new Date(item.admittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

function mapPatientToBackend(p: any): any {
  return {
    name: p.name,
    age: p.age,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    phone: p.phone ?? '',
    email: p.email ?? '',
    aadhaarNumber: p.aadhaarNumber ?? '',
    address: p.address ?? '',
    hospitalId: p.hospitalId || null,
    bedRequired: p.bedRequired ?? false,
    ...(p.admittedAt ? { admittedAt: new Date(p.admittedAt) } : {}),
    isActive: true,
  };
}

function mapMedicineFromBackend(item: any): Medicine {
  return {
    id: item._id ?? item.id ?? '',
    name: item.name,
    category: item.category ?? 'medication',
    unit: item.unit ?? 'units',
    totalStock: item.stock ?? item.totalStock ?? 0,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

function mapMedicineToBackend(m: any): any {
  return {
    name: m.name,
    dosage: m.dosage ?? 'N/A',
    stock: m.totalStock ?? m.stock ?? 0,
    manufacturer: m.manufacturer ?? 'N/A',
    category: m.category ?? 'medication',
    unit: m.unit ?? 'units',
    expiryDate: m.expiryDate ? new Date(m.expiryDate) : null,
    pricePerUnit: m.pricePerUnit ?? 0,
    isAvailable: true,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [dbHospitals, setDbHospitals] = useState<Hospital[]>([]);
  const [dbStaff, setDbStaff] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ghc_auth_token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadDecoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
          const parsed = JSON.parse(payloadDecoded);
          if (parsed && parsed.sub) {
            setCurrentUser({
              id: parsed.sub,
              username: parsed.username || '',
              role: parsed.role || 'Doctor',
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse token in AppContext', e);
      }
    }
  }, []);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dbPatients, setDbPatients] = useState<Patient[]>([]);
  const [dbMedicines, setDbMedicines] = useState<Medicine[]>([]);
  const [hospitalMedicines, setHospitalMedicines] = useState<HospitalMedicine[]>(() => {
    const local = localStorage.getItem('hospitalMedicines');
    return local ? JSON.parse(local) : mockHospitalMedicines;
  });

  useEffect(() => {
    localStorage.setItem('hospitalMedicines', JSON.stringify(hospitalMedicines));
  }, [hospitalMedicines]);

  async function loadData() {
    try {
      setLoading(true);

      const token = localStorage.getItem('ghc_auth_token');
      let role = 'Admin';
      if (token) {
        try {
          const payloadBase64 = token.split('.')[1];
          if (payloadBase64) {
            const payloadDecoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
            const parsed = JSON.parse(payloadDecoded);
            role = parsed?.role || 'Admin';
          }
        } catch (e) {
          console.error('Failed to parse token for role optimization', e);
        }
      }

      const [hRes, sRes, pRes, mRes] = await Promise.all([
        authFetch(`${API_BASE}/hospitals`),
        authFetch(`${API_BASE}/staff`),
        authFetch(`${API_BASE}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: 1, pageSize: 1000 }),
        }),
        authFetch(`${API_BASE}/medicines`),
      ]);

      let hData = await hRes.json();
      let sData = await sRes.json();
      const pPayload = await pRes.json();
      let pData = Array.isArray(pPayload) ? pPayload : pPayload.data ?? [];
      let mData = await mRes.json();

      let dbHData = hData;
      let dbSData = sData;
      let dbPData = pData;
      let dbMData = mData;

      if (role !== 'Admin') {
        const [dbSRes, dbMRes] = await Promise.all([
          authFetch(`${API_BASE}/staff?dashboard=true`),
          authFetch(`${API_BASE}/medicines?dashboard=true`),
        ]);
        dbSData = await dbSRes.json();
        dbMData = await dbMRes.json();
      }

      if (hData.length === 0 && sData.length === 0) {
        console.log('Database empty. Seeding initial data...');

        const seededHospitals: Hospital[] = [];
        for (const h of mockHospitals) {
          const { id, createdAt, ...rest } = h;
          const res = await authFetch(`${API_BASE}/hospitals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rest),
          });
          const created = await res.json();
          seededHospitals.push(mapHospitalFromBackend(created));
        }
        hData = seededHospitals;

        const seededStaff: Staff[] = [];
        for (const s of mockStaff) {
          const originalHospital = mockHospitals.find(h => h.id === s.assignedHospitalId);
          const newHospital = originalHospital ? hData.find((h: any) => h.name === originalHospital.name) : null;
          const body = mapStaffToBackend({ ...s, assignedHospitalId: newHospital ? newHospital.id : null });

          const res = await authFetch(`${API_BASE}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const created = await res.json();
          seededStaff.push(mapStaffFromBackend(created));
        }
        sData = seededStaff;

        const seededPatients: Patient[] = [];
        for (const p of mockPatients) {
          const originalHospital = mockHospitals.find(h => h.id === p.hospitalId);
          const newHospital = originalHospital ? hData.find((h: any) => h.name === originalHospital.name) : null;
          const body = mapPatientToBackend({ ...p, hospitalId: newHospital ? newHospital.id : null });

          const res = await authFetch(`${API_BASE}/patients/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const created = await res.json();
          seededPatients.push(mapPatientFromBackend(created));
        }
        pData = seededPatients;

        dbHData = seededHospitals;
        dbSData = seededStaff;
        dbPData = seededPatients;
      }

      setHospitals(hData.map(mapHospitalFromBackend));
      setStaff(sData.map(mapStaffFromBackend));
      setPatients(pData.map(mapPatientFromBackend));
      setMedicines(mData.map(mapMedicineFromBackend));
      setDbHospitals(dbHData.map(mapHospitalFromBackend));
      setDbStaff(dbSData.map(mapStaffFromBackend));
      setDbPatients(dbPData.map(mapPatientFromBackend));
      setDbMedicines(dbMData.map(mapMedicineFromBackend));
    } catch (err) {
      console.error('Failed to load data from NestJS backend:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const addHospital = async (h: Omit<Hospital, 'id' | 'createdAt'>) => {
    try {
      const created = await hospitalApi.createHospital(h);
      setHospitals(prev => [...prev, mapHospitalFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create hospital in backend:', err);
    }
  };

  const updateHospital = async (id: string, h: Partial<Hospital>) => {
    try {
      const updated = await hospitalApi.updateHospital(id, h);
      setHospitals(prev => prev.map(x => (x.id === id ? mapHospitalFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update hospital in backend:', err);
    }
  };

  const deleteHospital = async (id: string) => {
    try {
      await hospitalApi.deleteHospital(id);
      setHospitals(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete hospital in backend:', err);
    }
  };

  const getHospitalHistory = async (id: string): Promise<Hospital[]> => {
    try {
      const data = await hospitalApi.getHospitalHistory(id);
      return Array.isArray(data) ? data.map(mapHospitalFromBackend) : [];
    } catch (err) {
      console.error('Failed to fetch hospital history:', err);
      return [];
    }
  };

  const getBedAllocationHistory = async (id: string): Promise<any[]> => {
    try {
      return await hospitalApi.getBedAllocationHistory(id);
    } catch (err) {
      console.error('Failed to fetch bed allocation history:', err);
      return [];
    }
  };

  const addStaff = async (s: Omit<Staff, 'id' | 'createdAt'>) => {
    try {
      const body = mapStaffToBackend(s);
      const res = await authFetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setStaff(prev => [...prev, mapStaffFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create staff in backend:', err);
    }
  };

  const updateStaff = async (id: string, s: Partial<Staff>) => {
    try {
      const body = mapStaffToBackend(s);
      const res = await authFetch(`${API_BASE}/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setStaff(prev => prev.map(x => (x.id === id ? mapStaffFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update staff in backend:', err);
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await authFetch(`${API_BASE}/staff/${id}`, {
        method: 'DELETE',
      });
      setStaff(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete staff in backend:', err);
    }
  };

  const assignStaff = async (staffId: string, hospitalId: string | null) => {
    try {
      const staffMember = staff.find(s => s.id === staffId);
      if (!staffMember) return;
      const body = mapStaffToBackend({ ...staffMember, assignedHospitalId: hospitalId });
      const res = await authFetch(`${API_BASE}/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setStaff(prev => prev.map(x => (x.id === staffId ? mapStaffFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to assign staff in backend:', err);
    }
  };

  const addPatient = async (p: PatientDraft) => {
    try {
      const body = mapPatientToBackend(p);
      const res = await authFetch(`${API_BASE}/patients/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'Failed to create patient in backend'));
      }
      const created = await res.json();
      setPatients(prev => [...prev, mapPatientFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create patient in backend:', err);
      throw err;
    }
  };

  const updatePatient = async (id: string, p: PatientDraft) => {
    try {
      const body = mapPatientToBackend(p);
      const res = await authFetch(`${API_BASE}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, 'Failed to update patient in backend'));
      }
      const updated = await res.json();
      setPatients(prev => prev.map(x => (x.id === id ? mapPatientFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update patient in backend:', err);
      throw err;
    }
  };

  const addMedicine = async (m: Omit<Medicine, 'id' | 'createdAt'>) => {
    try {
      const body = mapMedicineToBackend(m);
      const res = await authFetch(`${API_BASE}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setMedicines(prev => [...prev, mapMedicineFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create medicine in backend:', err);
    }
  };

  const updateMedicine = async (id: string, m: Partial<Medicine>) => {
    try {
      const body = mapMedicineToBackend(m);
      const res = await authFetch(`${API_BASE}/medicines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setMedicines(prev => prev.map(x => (x.id === id ? mapMedicineFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update medicine in backend:', err);
    }
  };

  const deleteMedicine = async (id: string) => {
    try {
      await authFetch(`${API_BASE}/medicines/${id}`, {
        method: 'DELETE',
      });
      setMedicines(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete medicine in backend:', err);
    }
  };

  const assignMedicine = (hospitalId: string, medicineId: string, quantity: number) => {
    const nextId = String(Date.now());
    setHospitalMedicines(prev => [
      ...prev,
      { id: nextId, hospitalId, medicineId, quantity, assignedAt: new Date().toISOString().split('T')[0] },
    ]);
  };

  const updateMedicineAssignment = (id: string, quantity: number) =>
    setHospitalMedicines(prev => prev.map(x => (x.id === id ? { ...x, quantity } : x)));

  const removeMedicineAssignment = (id: string) =>
    setHospitalMedicines(prev => prev.filter(x => x.id !== id));

  return (
    <AppContext.Provider
      value={{
        hospitals,
        staff,
        patients,
        medicines,
        dbHospitals,
        dbStaff,
        dbPatients,
        dbMedicines,
        hospitalMedicines,
        currentUser,
        loading,
        addHospital,
        updateHospital,
        deleteHospital,
        getHospitalHistory,
        getBedAllocationHistory,
        addStaff,
        updateStaff,
        deleteStaff,
        assignStaff,
        addPatient,
        updatePatient,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        assignMedicine,
        updateMedicineAssignment,
        removeMedicineAssignment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');

  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return {
    ...ctx,
    hospitals: isDashboard ? (ctx.dbHospitals || ctx.hospitals) : ctx.hospitals,
    staff: isDashboard ? (ctx.dbStaff || ctx.staff) : ctx.staff,
    patients: isDashboard ? (ctx.dbPatients || ctx.patients) : ctx.patients,
    medicines: isDashboard ? (ctx.dbMedicines || ctx.medicines) : ctx.medicines,
  };
}
