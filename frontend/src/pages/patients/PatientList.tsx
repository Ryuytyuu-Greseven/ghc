import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserRound, BedDouble, Pencil, ExternalLink, Search } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { authFetch, useApp } from '../../context/AppContext';
import type { PaginationMeta, Patient } from '../../types';
import { PatientForm } from './PatientForm';
import { clsx } from 'clsx';
import { environment } from '@env/environment';
import { useTranslation } from 'react-i18next';

const API_BASE = environment.mainBackendUrl;

function getBackendId(value: any): string {
  return value?._id ?? value?.id ?? value ?? '';
}

function mapPatientFromBackendForList(item: any): Patient {
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
    state: item.state,
    city: item.city,
    stateCode: item.stateCode,
    cityCode: item.cityCode,
    hospitalId: getBackendId(item.hospitalId),
    bedRequired: item.bedRequired ?? false,
    admittedAt: item.admittedAt ? new Date(item.admittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

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
  const { hospitals, loading: appLoading, currentUser } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'Admin';
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [filterHospital, setFilterHospital] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filterHospital, search, pageSize]);

  useEffect(() => {
    let active = true;

    async function loadPatients() {
      try {
        setLoadingPatients(true);
        const res = await authFetch(`${API_BASE}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page,
            pageSize,
            search: search.trim(),
            ...(filterHospital !== 'all' ? { hospitalId: filterHospital } : {}),
          }),
        });
        if (!res.ok) throw new Error('Failed to load patients');
        const payload = await res.json();
        if (!active) return;
        setPatients((payload.data ?? []).map(mapPatientFromBackendForList));
        setPaginationMeta(payload.pagination ?? null);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setPatients([]);
        setPaginationMeta(null);
      } finally {
        if (active) setLoadingPatients(false);
      }
    }

    loadPatients();
    return () => {
      active = false;
    };
  }, [filterHospital, page, pageSize, reloadTrigger, search]);

  const loading = appLoading || loadingPatients;
  const bedRequired = patients.filter(p => p.bedRequired).length;

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setSearch(searchInput);
    }
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('patients.title')} subtitle={t('patients.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
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
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={event => {
                  const value = event.target.value;
                  setSearchInput(value);
                  if (!value.trim()) {
                    setSearch('');
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search patients..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {t('patients.totalPatientsCount', { count: paginationMeta?.totalRecords ?? patients.length })}
              </span>
              <span className="text-slate-200 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
                <BedDouble size={14} />
                <span className="tabular-nums">{t('hospitals.detail.needBeds', { count: bedRequired })}</span>
              </span>
            </div>
            {!isAdmin && (
              <Button
                className="shrink-0"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={15} /> {t('patients.admitPatient')}
              </Button>
            )}
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
              {patients.map(p => {
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
                      {!isAdmin && (
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
                      )}
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

          {!loading && patients.length === 0 && (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <UserRound size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">{t('patients.noPatients')}</p>
              <p className="text-sm mt-1">
                {search ? 'Try relaxing your search query.' : t('patients.noPatientsDesc')}
              </p>
            </div>
          )}

          {!loading && patients.length > 0 && paginationMeta && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <PaginationControls
                meta={paginationMeta}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setReloadTrigger(prev => prev + 1);
        }}
        title={editing ? t('patients.editPatient') : t('patients.admitPatient')}
      >
        <PatientForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setReloadTrigger(prev => prev + 1);
          }}
        />
      </Modal>
    </div>
  );
}
