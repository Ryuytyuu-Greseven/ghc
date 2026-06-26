import { useState } from 'react';
import { Plus, Building2, MapPin, Phone, Mail, BedDouble, Pencil, Trash2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Hospital } from '../../types';
import { HospitalForm } from './HospitalForm';

export function HospitalList() {
  const { hospitals, deleteHospital, staff, patients } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'hospital' | 'clinic'>('all');

  const filtered = filterType === 'all' ? hospitals : hospitals.filter(h => h.type === filterType);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (h: Hospital) => { setEditing(h); setFormOpen(true); };

  const handleDelete = (id: string) => {
    if (confirm('Delete this facility? All associated data will remain.')) deleteHospital(id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Hospitals & Clinics" subtitle="Manage all healthcare facilities" />
      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['all', 'hospital', 'clinic'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterType === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
              </button>
            ))}
          </div>
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Facility
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(h => {
            const assignedStaff = staff.filter(s => s.assignedHospitalId === h.id).length;
            const activePatients = patients.filter(p => p.hospitalId === h.id).length;
            const occupancy = h.totalBeds ? Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100) : 0;

            return (
              <div key={h.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${h.type === 'hospital' ? 'bg-cyan-50' : 'bg-violet-50'}`}>
                        <Building2 size={20} className={h.type === 'hospital' ? 'text-cyan-600' : 'text-violet-600'} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{h.name}</h3>
                        <Badge variant={h.type === 'hospital' ? 'info' : 'purple'}>
                          {h.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} />
                      <span>{h.address}, {h.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={13} />
                      <span>{h.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={13} />
                      <span>{h.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <BedDouble size={12} /> Bed Occupancy
                      </span>
                      <span className="font-medium">{h.totalBeds - h.availableBeds}/{h.totalBeds}</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${occupancy > 80 ? 'bg-red-500' : occupancy > 60 ? 'bg-amber-500' : 'bg-primary-500'}`}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-slate-500">
                      <span>{assignedStaff} staff assigned</span>
                      <span>{activePatients} patients</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No facilities found</p>
            <p className="text-sm mt-1">Add your first hospital or clinic to get started.</p>
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Facility' : 'Add New Facility'}>
        <HospitalForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
