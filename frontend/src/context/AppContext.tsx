import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Hospital, Staff, Patient, Medicine, HospitalMedicine } from '../types';
import {
  mockHospitals,
  mockStaff,
  mockPatients,
  mockMedicines,
  mockHospitalMedicines,
} from '../data/mockData';

interface AppContextValue {
  hospitals: Hospital[];
  staff: Staff[];
  patients: Patient[];
  medicines: Medicine[];
  hospitalMedicines: HospitalMedicine[];

  addHospital: (h: Omit<Hospital, 'id' | 'createdAt'>) => void;
  updateHospital: (id: string, h: Partial<Hospital>) => void;
  deleteHospital: (id: string) => void;

  addStaff: (s: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, s: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  assignStaff: (staffId: string, hospitalId: string | null) => void;

  addPatient: (p: Omit<Patient, 'id' | 'admittedAt'>) => void;
  updatePatient: (id: string, p: Partial<Patient>) => void;
  deletePatient: (id: string) => void;

  addMedicine: (m: Omit<Medicine, 'id' | 'createdAt'>) => void;
  updateMedicine: (id: string, m: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;

  assignMedicine: (hospitalId: string, medicineId: string, quantity: number) => void;
  updateMedicineAssignment: (id: string, quantity: number) => void;
  removeMedicineAssignment: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const API_BASE = 'http://localhost:3000';

function mapHospitalFromBackend(item: any): Hospital {
  return {
    id: item._id ?? item.id ?? '',
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
  };
}

function mapStaffFromBackend(item: any): Staff {
  const roleMap: Record<string, string> = {
    'Doctor': 'doctor',
    'Nurse': 'nurse',
    'Pharmacist': 'pharmacist',
    'Technician': 'technician',
    'Admin': 'admin',
  };
  return {
    id: item._id ?? item.id ?? '',
    name: item.name,
    role: (roleMap[item.role] || item.role || 'doctor').toLowerCase() as any,
    specialization: item.department ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    assignedHospitalId: item.hospitalId ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

function mapStaffToBackend(s: any): any {
  const capRole = s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : 'Doctor';
  return {
    name: s.name,
    role: capRole,
    department: s.specialization ?? s.department ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    hospitalId: s.assignedHospitalId || s.hospitalId || null,
    isActive: true,
  };
}

function mapPatientFromBackend(item: any): Patient {
  return {
    id: item._id ?? item.id ?? '',
    name: item.name,
    age: item.age ?? 0,
    gender: item.gender ?? 'male',
    phone: item.phone ?? '',
    address: item.address ?? '',
    hospitalId: item.hospitalId ?? '',
    bedRequired: item.bedRequired ?? false,
    admittedAt: item.admittedAt ? new Date(item.admittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    condition: item.condition ?? '',
  };
}

function mapPatientToBackend(p: any): any {
  return {
    name: p.name,
    age: p.age,
    gender: p.gender ?? 'male',
    bloodGroup: p.bloodGroup ?? 'O+',
    phone: p.phone ?? '',
    email: p.email ?? `${p.name.toLowerCase().replace(/\s/g, '')}@example.com`,
    address: p.address ?? '',
    hospitalId: p.hospitalId || null,
    bedRequired: p.bedRequired ?? false,
    admittedAt: p.admittedAt ? new Date(p.admittedAt) : new Date(),
    condition: p.condition ?? '',
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [hospitalMedicines, setHospitalMedicines] = useState<HospitalMedicine[]>(() => {
    const local = localStorage.getItem('hospitalMedicines');
    return local ? JSON.parse(local) : mockHospitalMedicines;
  });

  useEffect(() => {
    localStorage.setItem('hospitalMedicines', JSON.stringify(hospitalMedicines));
  }, [hospitalMedicines]);

  useEffect(() => {
    async function loadData() {
      try {
        const [hRes, sRes, pRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/hospitals`),
          fetch(`${API_BASE}/staff`),
          fetch(`${API_BASE}/patients`),
          fetch(`${API_BASE}/medicines`),
        ]);

        let hData = await hRes.json();
        let sData = await sRes.json();
        let pData = await pRes.json();
        let mData = await mRes.json();

        if (hData.length === 0 && sData.length === 0) {
          console.log('Database empty. Seeding initial data...');
          
          const seededHospitals: Hospital[] = [];
          for (const h of mockHospitals) {
            const { id, createdAt, ...rest } = h;
            const res = await fetch(`${API_BASE}/hospitals`, {
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
            
            const res = await fetch(`${API_BASE}/staff`, {
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
            
            const res = await fetch(`${API_BASE}/patients`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const created = await res.json();
            seededPatients.push(mapPatientFromBackend(created));
          }
          pData = seededPatients;

          const seededMedicines: Medicine[] = [];
          for (const m of mockMedicines) {
            const body = mapMedicineToBackend(m);
            const res = await fetch(`${API_BASE}/medicines`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const created = await res.json();
            seededMedicines.push(mapMedicineFromBackend(created));
          }
          mData = seededMedicines;
        }

        setHospitals(hData.map(mapHospitalFromBackend));
        setStaff(sData.map(mapStaffFromBackend));
        setPatients(pData.map(mapPatientFromBackend));
        setMedicines(mData.map(mapMedicineFromBackend));
      } catch (err) {
        console.error('Failed to load data from NestJS backend:', err);
      }
    }
    loadData();
  }, []);

  const addHospital = async (h: Omit<Hospital, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch(`${API_BASE}/hospitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(h),
      });
      const created = await res.json();
      setHospitals(prev => [...prev, mapHospitalFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create hospital in backend:', err);
    }
  };

  const updateHospital = async (id: string, h: Partial<Hospital>) => {
    try {
      const res = await fetch(`${API_BASE}/hospitals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(h),
      });
      const updated = await res.json();
      setHospitals(prev => prev.map(x => (x.id === id ? mapHospitalFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update hospital in backend:', err);
    }
  };

  const deleteHospital = async (id: string) => {
    try {
      await fetch(`${API_BASE}/hospitals/${id}`, {
        method: 'DELETE',
      });
      setHospitals(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete hospital in backend:', err);
    }
  };

  const addStaff = async (s: Omit<Staff, 'id' | 'createdAt'>) => {
    try {
      const body = mapStaffToBackend(s);
      const res = await fetch(`${API_BASE}/staff`, {
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
      const res = await fetch(`${API_BASE}/staff/${id}`, {
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
      await fetch(`${API_BASE}/staff/${id}`, {
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
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
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

  const addPatient = async (p: Omit<Patient, 'id' | 'admittedAt'>) => {
    try {
      const body = mapPatientToBackend(p);
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setPatients(prev => [...prev, mapPatientFromBackend(created)]);
    } catch (err) {
      console.error('Failed to create patient in backend:', err);
    }
  };

  const updatePatient = async (id: string, p: Partial<Patient>) => {
    try {
      const body = mapPatientToBackend(p);
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setPatients(prev => prev.map(x => (x.id === id ? mapPatientFromBackend(updated) : x)));
    } catch (err) {
      console.error('Failed to update patient in backend:', err);
    }
  };

  const deletePatient = async (id: string) => {
    try {
      await fetch(`${API_BASE}/patients/${id}`, {
        method: 'DELETE',
      });
      setPatients(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete patient in backend:', err);
    }
  };

  const addMedicine = async (m: Omit<Medicine, 'id' | 'createdAt'>) => {
    try {
      const body = mapMedicineToBackend(m);
      const res = await fetch(`${API_BASE}/medicines`, {
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
      const res = await fetch(`${API_BASE}/medicines/${id}`, {
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
      await fetch(`${API_BASE}/medicines/${id}`, {
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
        hospitals, staff, patients, medicines, hospitalMedicines,
        addHospital, updateHospital, deleteHospital,
        addStaff, updateStaff, deleteStaff, assignStaff,
        addPatient, updatePatient, deletePatient,
        addMedicine, updateMedicine, deleteMedicine,
        assignMedicine, updateMedicineAssignment, removeMedicineAssignment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
