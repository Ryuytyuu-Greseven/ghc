import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserRound, BedDouble, Pencil, ExternalLink } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Patient } from '../../types';
import { PatientForm } from './PatientForm';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

function PatientCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-700/70" />
          </div>
        </div>
        <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex justify-between gap-4">
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-700/70" />
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="h-7 w-28 rounded-full bg-slate-100 dark:bg-slate-700/70" />
      </div>
    </div>
  );
}

export function PatientList() {
  const { t } = useTranslation();
  const { patients, hospitals, loading } = useApp();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [filterHospital, setFilterHospital] = useState('all');

  const filtered =
    filterHospital === 'all'
      ? patients
      : patients.filter(p => p.hospitalId === filterHospital);

  const openEdit = (p: Patient) => {
    setEditing(p);
    setFormOpen(true);
  };

  const bedRequired = filtered.filter(p => p.bedRequired).length;

  return (
    <div className="flex flex-col h-full">
      <Header title={t('patients.title')} subtitle={t('patients.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterHospital('all')}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  filterHospital === 'all'
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {t('patients.allFacilities')}
              </button>
              {hospitals.map(h => (
                <button
                  key={h.id}
                  onClick={() => setFilterHospital(h.id)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterHospital === h.id
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">{t('patients.totalPatientsCount', { count: filtered.length })}</span>
              <span className="text-slate-200 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <BedDouble size={14} />
                <span className="tabular-nums">{t('hospitals.detail.needBeds', { count: bedRequired })}</span>
              </span>
            </div>
            <Button
              className="shrink-0"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={15} /> {t('patients.admitPatient')}
            </Button>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <PatientCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map(p => {
                const hospital = hospitals.find(h => h.id === p.hospitalId);
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow flex flex-col cursor-pointer"
                  >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-bold text-sm shrink-0">
                        {p.name
                          .split(' ')
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.age} {t('dashboard.yrs')} · {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/patients/${p.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                        title={t('common.viewDetails')}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(p);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                        title={t('common.edit')}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.bloodGroup')}</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-right">
                        {p.bloodGroup}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.facility')}</span>
                      <span className="text-slate-700 dark:text-slate-200 text-right truncate">
                        {hospital?.name ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.admitted')}</span>
                      <span className="text-slate-700 dark:text-slate-200 tabular-nums">{p.admittedAt}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.phoneLabel')}</span>
                      <span className="text-slate-700 dark:text-slate-200">{p.phone}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.emailLabel')}</span>
                      <span className="text-slate-700 dark:text-slate-200 text-right truncate">{p.email || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('patients.aadhaarLabel')}</span>
                      <span className="text-slate-700 dark:text-slate-200 tabular-nums">{p.aadhaarNumber || '—'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <Badge variant={p.bedRequired ? 'danger' : 'success'}>
                      <BedDouble size={11} className="mr-1" />
                      {p.bedRequired ? t('patients.bedAllocated') : t('patients.noBedNeeded')}
                    </Badge>
                  </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <UserRound size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">{t('patients.noPatients')}</p>
              <p className="text-sm mt-1">{t('patients.noPatientsDesc')}</p>
            </div>
          )}

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('patients.editPatient') : t('patients.admitPatient')}
      >
        <PatientForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
