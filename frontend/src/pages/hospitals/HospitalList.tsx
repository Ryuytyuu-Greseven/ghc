import { useState } from 'react';
import { Plus, Building2, MapPin, Phone, Mail, BedDouble, Pencil, Trash2, ExternalLink, Stethoscope, Truck, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Hospital, FacilityType } from '../../types';
import { HospitalForm } from './HospitalForm';
import { clsx } from 'clsx';

const filterTypes = ['all', 'PHC', 'CHC'] as const;
type FilterType = (typeof filterTypes)[number];

const typeStyles: Record<FacilityType, { bg: string; text: string; badge: 'info' | 'purple' | 'success' | 'warning'; label: string }> = {
  PHC: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', badge: 'success', label: 'PHC' },
  CHC: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', badge: 'warning', label: 'CHC' },
};

export function HospitalList() {
  const { hospitals, deleteHospital, staff, patients } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null);

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

  const handleDelete = (h: Hospital) => {
    setDeleteTarget(h);
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteHospital(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Hospitals & Clinics" subtitle="Manage primary and community healthcare networks" />

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
                  {t === 'all'
                    ? 'All'
                    : t === 'PHC'
                    ? 'PHCs (Primary)'
                    : 'CHCs (Community)'}
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
              const styles = typeStyles[h.type] || typeStyles.PHC;
              const parentCHC = h.parentCHCId ? hospitals.find(x => x.id === h.parentCHCId) : null;

              return (
                <div
                  key={h.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow flex flex-col"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={clsx('p-2.5 rounded-xl shrink-0', styles.bg)}>
                          <Building2 size={20} className={styles.text} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {h.name}
                          </h3>
                          <Badge variant={styles.badge}>
                            {styles.label}
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
                          onClick={() => handleDelete(h)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="shrink-0 mt-0.5" />
                        <span className="truncate">{h.address}, {h.city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="shrink-0" />
                        <span>{h.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="shrink-0" />
                        <span className="truncate">{h.email || 'No email'}</span>
                      </div>
                    </div>

                    {/* PHC Specific Render */}
                    {h.type === 'PHC' && (
                      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 text-xs space-y-2">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Stethoscope size={13} className="text-emerald-500" />
                          <span>
                            Medical Officer:{' '}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {h.medicalOfficer ?? 'Unassigned'}
                            </span>
                          </span>
                        </div>
                        {parentCHC ? (
                          <Link
                            to={`/hospitals/${parentCHC.id}`}
                            className="flex items-center gap-1.5 text-primary-700 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10 px-2 py-1 rounded border border-primary-100 dark:border-primary-900/30 inline-flex w-full hover:underline"
                          >
                            <span className="font-semibold">Referral CHC:</span>
                            <span className="truncate">{parentCHC.name}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded inline-flex w-full">
                            <span>Unlinked Chain (No CHC)</span>
                          </div>
                        )}
                        {h.hasAmbulance && (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit uppercase tracking-wider">
                            <Truck size={10} /> Ambulance Active
                          </div>
                        )}
                      </div>
                    )}

                    {/* CHC Specific Render */}
                    {h.type === 'CHC' && (
                      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 text-xs space-y-2">
                        {h.medicalOfficer && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-1">
                            <Stethoscope size={13} className="text-amber-500" />
                            <span>
                              Medical Officer:{' '}
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {h.medicalOfficer}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                            Specialist Services:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {h.specialists && h.specialists.length > 0 ? (
                              h.specialists.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">
                                None registered
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {h.hasOT && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                              OT
                            </span>
                          )}
                          {h.hasXRay && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                              X-Ray
                            </span>
                          )}
                          {h.hasAmbulance && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                              Ambulance
                            </span>
                          )}
                        </div>
                      </div>
                    )}

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
              <p className="text-sm mt-1">Add your first primary or community health centre to get started.</p>
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertTriangle size={32} className="text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
              Delete <span className="text-red-600 dark:text-red-400">{deleteTarget?.name}</span>?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              This action will permanently remove this {deleteTarget?.type} facility. Staff and patients linked to it will remain in the system.
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>
              <Trash2 size={14} /> Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
