import { useState } from 'react';
import { Plus, Users, Pencil, Trash2, UserCheck, UserX, ArrowRightLeft } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Staff, StaffRole } from '../../types';
import { StaffForm } from './StaffForm';
import { StaffAssign } from './StaffAssign';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

const roleVariant: Record<StaffRole, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
  Doctor: 'info',
  Nurse: 'success',
  'Lab Technician': 'warning',
  Receptionist: 'default',
  Pharmacist: 'purple',
  Compounder: 'default',
  Cashier: 'default',
};

const filterOptions = ['all', 'assigned', 'unassigned'] as const;
type Filter = (typeof filterOptions)[number];

export function StaffList() {
  const { t } = useTranslation();
  const { staff, updateStaff, deleteStaff, hospitals } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [assigning, setAssigning] = useState<Staff | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = staff.filter(s => {
    if (filter === 'assigned') return !!s.assignedHospitalId;
    if (filter === 'unassigned') return !s.assignedHospitalId;
    return true;
  });

  const openEdit = (s: Staff) => {
    setEditing(s);
    setFormOpen(true);
  };
  const openAssign = (s: Staff) => {
    setAssigning(s);
    setAssignOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('staff.deleteConfirm'))) deleteStaff(id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('staff.title')} subtitle={t('staff.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterOptions.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filter === f
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {t(`staff.filters.${f}`)}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={15} /> {t('staff.addStaff')}
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('patients.form.labels.name')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('hospitals.detail.role')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                      {t('hospitals.detail.specialization')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('staff.assignedTo')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                      {t('hospitals.detail.contact')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('hospitals.detail.status')}
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(s => {
                    const hospital = hospitals.find(h => h.id === s.assignedHospitalId);
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-400 text-xs font-bold shrink-0">
                              {s.name
                                .split(' ')
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {s.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={roleVariant[s.role]}>
                            {t(`roles.${s.role}`)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                          {s.specialization}
                        </td>
                        <td className="px-5 py-3.5">
                          {hospital ? (
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                              <UserCheck size={14} className="shrink-0" />
                              <span className="text-sm font-medium truncate">{hospital.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                              <UserX size={14} className="shrink-0" />
                              <span className="text-sm">{t('hospitals.detail.unassigned')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                          {s.phone}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => {
                              updateStaff(s.id, { ...s, isActive: !s.isActive });
                            }}
                            title={t('staff.toggleStatus')}
                            className="focus:outline-none hover:opacity-85 transition-opacity"
                          >
                            <Badge variant={s.isActive ? 'success' : 'danger'}>
                              {s.isActive ? t('common.active') : t('common.inactive')}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openAssign(s)}
                              className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                              title={t('staff.assignToFacility')}
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                              title={t('common.edit')}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500 dark:text-slate-400">{t('staff.noStaff')}</p>
                <p className="text-sm mt-1">{t('staff.noStaffDesc')}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('staff.editStaff') : t('staff.addStaff')}
      >
        <StaffForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={t('staff.assignStaffToFacility')}
        size="sm"
      >
        {assigning && <StaffAssign staff={assigning} onClose={() => setAssignOpen(false)} />}
      </Modal>
    </div>
  );
}
