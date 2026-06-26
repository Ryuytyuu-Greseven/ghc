import { createContext, useContext, useState } from 'react';
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

let nextId = 100;
const uid = () => String(++nextId);
const today = () => new Date().toISOString().split('T')[0];

export function AppProvider({ children }: { children: ReactNode }) {
  const [hospitals, setHospitals] = useState<Hospital[]>(mockHospitals);
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [medicines, setMedicines] = useState<Medicine[]>(mockMedicines);
  const [hospitalMedicines, setHospitalMedicines] = useState<HospitalMedicine[]>(mockHospitalMedicines);

  const addHospital = (h: Omit<Hospital, 'id' | 'createdAt'>) =>
    setHospitals(prev => [...prev, { ...h, id: uid(), createdAt: today() }]);

  const updateHospital = (id: string, h: Partial<Hospital>) =>
    setHospitals(prev => prev.map(x => (x.id === id ? { ...x, ...h } : x)));

  const deleteHospital = (id: string) =>
    setHospitals(prev => prev.filter(x => x.id !== id));

  const addStaff = (s: Omit<Staff, 'id' | 'createdAt'>) =>
    setStaff(prev => [...prev, { ...s, id: uid(), createdAt: today() }]);

  const updateStaff = (id: string, s: Partial<Staff>) =>
    setStaff(prev => prev.map(x => (x.id === id ? { ...x, ...s } : x)));

  const deleteStaff = (id: string) =>
    setStaff(prev => prev.filter(x => x.id !== id));

  const assignStaff = (staffId: string, hospitalId: string | null) =>
    setStaff(prev => prev.map(x => (x.id === staffId ? { ...x, assignedHospitalId: hospitalId } : x)));

  const addPatient = (p: Omit<Patient, 'id' | 'admittedAt'>) =>
    setPatients(prev => [...prev, { ...p, id: uid(), admittedAt: today() }]);

  const updatePatient = (id: string, p: Partial<Patient>) =>
    setPatients(prev => prev.map(x => (x.id === id ? { ...x, ...p } : x)));

  const deletePatient = (id: string) =>
    setPatients(prev => prev.filter(x => x.id !== id));

  const addMedicine = (m: Omit<Medicine, 'id' | 'createdAt'>) =>
    setMedicines(prev => [...prev, { ...m, id: uid(), createdAt: today() }]);

  const updateMedicine = (id: string, m: Partial<Medicine>) =>
    setMedicines(prev => prev.map(x => (x.id === id ? { ...x, ...m } : x)));

  const deleteMedicine = (id: string) =>
    setMedicines(prev => prev.filter(x => x.id !== id));

  const assignMedicine = (hospitalId: string, medicineId: string, quantity: number) =>
    setHospitalMedicines(prev => [
      ...prev,
      { id: uid(), hospitalId, medicineId, quantity, assignedAt: today() },
    ]);

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
