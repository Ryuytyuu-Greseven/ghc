import { useState } from 'react';
import { Plus, Building2, MapPin, Phone, Mail, BedDouble, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Hospital } from '../../types';
import { HospitalForm } from './HospitalForm';
import { clsx } from 'clsx';

const filterTypes = ['all', 'hospital', 'clinic'] as const;
type FilterType = (typeof filterTypes)[number];

export function HospitalList() {
  const { hospitals, deleteHospital, staff, patients } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');

  const filtered =
    filterType === 'all' ? hospitals : hospitals.filter(h => h.type === filterType);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (h: Hospital) => {
    setEditing(h);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this facility? All associated data will remain.')) deleteHospital(id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Hospitals & Clinics" subtitle="Manage all healthcare facilities" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterType === t
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
                </button>
              ))}
            </div>
            <Button onClick={openAdd}>
              <Plus size={15} /> Add Facility
            </Button>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map(h => {
              const assignedStaff = staff.filter(s => s.assignedHospitalId === h.id).length;
              const activePatients = patients.filter(p => p.hospitalId === h.id).length;
              const occupancy = h.totalBeds
                ? Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100)
                : 0;

              return (
                <div
                  key={h.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow flex flex-col"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={clsx(
                            'p-2.5 rounded-xl shrink-0',
                            h.type === 'hospital'
                              ? 'bg-cyan-50 dark:bg-cyan-900/30'
                              : 'bg-violet-50 dark:bg-violet-900/30'
                          )}
                        >
                          <Building2
                            size={20}
                            className={
                              h.type === 'hospital'
                                ? 'text-cyan-600 dark:text-cyan-400'
                                : 'text-violet-600 dark:text-violet-400'
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {h.name}
                          </h3>
                          <Badge variant={h.type === 'hospital' ? 'info' : 'purple'}>
                            {h.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <Link
                          to={`/hospitals/${h.id}`}
                          className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                          title="View details"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => openEdit(h)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 flex-1">
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="shrink-0 mt-0.5" />
                        <span className="truncate">{h.address}, {h.city}</span>
                      </div>
                      {h.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="shrink-0" />
                          <span>{h.phone}</span>
                        </div>
                      )}
                      {h.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="shrink-0" />
                          <span className="truncate">{h.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Occupancy */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <BedDouble size={12} /> Bed Occupancy
                        </span>
                        <span className="font-medium tabular-nums">
                          {h.totalBeds - h.availableBeds}/{h.totalBeds}
                        </span>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            occupancy > 80
                              ? 'bg-red-500'
                              : occupancy > 60
                              ? 'bg-amber-500'
                              : 'bg-primary-500'
                          }`}
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
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
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">No facilities found</p>
              <p className="text-sm mt-1">Add your first hospital or clinic to get started.</p>
            </div>
          )}

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Facility' : 'Add New Facility'}
      >
        <HospitalForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
