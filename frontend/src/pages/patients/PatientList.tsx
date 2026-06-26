import { useState } from 'react';
import { Plus, UserRound, BedDouble, Pencil, Trash2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Patient } from '../../types';
import { PatientForm } from './PatientForm';

export function PatientList() {
  const { patients, deletePatient, hospitals } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [filterHospital, setFilterHospital] = useState('all');

  const filtered = filterHospital === 'all'
    ? patients
    : patients.filter(p => p.hospitalId === filterHospital);

  const openEdit = (p: Patient) => { setEditing(p); setFormOpen(true); };

  const handleDelete = (id: string) => {
    if (confirm('Remove this patient record?')) deletePatient(id);
  };

  const bedRequired = filtered.filter(p => p.bedRequired).length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Patient Onboarding" subtitle="Manage patient admissions across facilities" />
      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterHospital('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterHospital === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Facilities
            </button>
            {hospitals.map(h => (
              <button
                key={h.id}
                onClick={() => setFilterHospital(h.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterHospital === h.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} /> Onboard Patient
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{filtered.length} patients total</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5 text-rose-500">
            <BedDouble size={14} /> {bedRequired} need beds
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const hospital = hospitals.find(h => h.id === p.hospitalId);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm">
                      {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.age} yrs · {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Condition</span>
                    <span className="text-slate-700 font-medium">{p.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facility</span>
                    <span className="text-slate-700 text-right max-w-[160px] truncate">{hospital?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admitted</span>
                    <span className="text-slate-700">{p.admittedAt}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Phone</span>
                    <span className="text-slate-700">{p.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Badge variant={p.bedRequired ? 'danger' : 'success'}>
                    <BedDouble size={11} className="mr-1" />
                    {p.bedRequired ? 'Bed Required' : 'No Bed Needed'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <UserRound size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No patients found</p>
            <p className="text-sm mt-1">Onboard your first patient to get started.</p>
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Patient' : 'Onboard Patient'}>
        <PatientForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
