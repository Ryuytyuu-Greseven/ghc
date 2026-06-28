import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Phone, Mail, BedDouble, Pencil, Trash2, ExternalLink, Stethoscope, AlertTriangle, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useApp } from '../../context/AppContext';
import type { Hospital, FacilityType, PaginationMeta } from '../../types';
import { HospitalForm } from './HospitalForm';
import { hospitalApi } from '../../services/hospitalApi';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

const filterTypes = ['all', 'PHC', 'CHC'] as const;
type FilterType = (typeof filterTypes)[number];

const typeStyles: Record<FacilityType, { bg: string; text: string; badge: 'info' | 'purple' | 'success' | 'warning'; label: string }> = {
  PHC: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', badge: 'success', label: 'PHC' },
  CHC: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', badge: 'warning', label: 'CHC' },
};

export function HospitalList() {
  const { deleteHospital, staff, patients, hospitals } = useApp();
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null);
  const [activeSpecialistOverlay, setActiveSpecialistOverlay] = useState<string | null>(null);

  // Pagination states
  const [paginatedHospitals, setPaginatedHospitals] = useState<Hospital[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const itemsPerPage = 8;

  // Close specialists overlay on clicking anywhere
  useEffect(() => {
    if (!activeSpecialistOverlay) return;
    const handleGlobalClick = () => {
      setActiveSpecialistOverlay(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [activeSpecialistOverlay]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, appliedSearchQuery]);

  // Load paginated data from backend using QueryService logic
  useEffect(() => {
    let active = true;
    const fetchHospitals = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage.toString());
        queryParams.append('pageSize', itemsPerPage.toString());
        if (appliedSearchQuery.trim()) {
          queryParams.append('search', appliedSearchQuery.trim());
        }
        if (filterType !== 'all') {
          queryParams.append('type', filterType);
        }
        const result = await hospitalApi.getHospitals(queryParams.toString());
        if (active) {
          if (result && Array.isArray(result.data)) {
            setPaginatedHospitals(result.data.map((item: any) => ({
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
            })));
            setTotalRecords(result.pagination.totalRecords);
          } else {
            setPaginatedHospitals([]);
            setTotalRecords(0);
          }
        }
      } catch (err) {
        console.error('Failed to load paginated hospitals:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHospitals();
    return () => {
      active = false;
    };
  }, [currentPage, filterType, appliedSearchQuery, reloadTrigger]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

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

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteHospital(deleteTarget.id);
      setReloadTrigger(prev => prev + 1);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('hospitals.title')} subtitle={t('hospitals.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {filterTypes.map(tOption => (
                <button
                  key={tOption}
                  onClick={() => setFilterType(tOption)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterType === tOption
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {tOption === 'all'
                    ? t('common.all')
                    : tOption === 'PHC'
                      ? t('common.phcs')
                      : t('common.chcs')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Field */}
              <div className="relative w-52 max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={16} className="text-slate-400 dark:text-slate-500" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim()) {
                      setAppliedSearchQuery('');
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setAppliedSearchQuery(searchQuery);
                    }
                  }}
                  placeholder={t('common.searchFacilities')}
                  className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
              </div>

              <Button onClick={openAdd} className="shrink-0">
                <Plus size={15} /> {t('common.addFacility')}
              </Button>
            </div>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
              <span className="text-sm">{t('common.loading')}</span>
            </div>
          ) : paginatedHospitals.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">{t('common.noFacilities')}</p>
              <p className="text-sm mt-1">{t('common.tryRelaxing')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {paginatedHospitals.map(h => {
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

                      {/* Info lines */}
                      <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 flex-1">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{h.address}, {h.city}</span>
                        </div>

                        {(h.phone || h.email) && (
                          <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                            {h.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-slate-400 shrink-0" />
                                <span className="tabular-nums">{h.phone}</span>
                              </div>
                            )}
                            {h.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate">{h.email}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {h.medicalOfficer && (
                          <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                            <Stethoscope size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{t('common.medicalOfficer')}: {h.medicalOfficer}</span>
                          </div>
                        )}

                        {h.type === 'PHC' && parentCHC && (
                          <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{t('common.parentChc')}: {parentCHC.name}</span>
                          </div>
                        )}

                        {/* Specialist Services Display */}
                        {h.type === 'CHC' && (
                          <div className="text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                              {t('common.specialists')}:
                            </span>
                            <div className="flex flex-wrap gap-1 items-center">
                              {h.specialists && h.specialists.length > 0 ? (
                                <>
                                  {h.specialists.slice(0, 4).map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    >
                                      {s}
                                    </span>
                                  ))}

                                  {h.specialists.length > 4 && (
                                    <div className="relative inline-block">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveSpecialistOverlay(activeSpecialistOverlay === h.id ? null : h.id);
                                        }}
                                        className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition shrink-0"
                                      >
                                        +{h.specialists.length - 4}
                                      </button>

                                      {activeSpecialistOverlay === h.id && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute left-0 bottom-full mb-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 w-56 max-h-48 overflow-y-auto"
                                        >
                                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                              {t('common.specialists')} ({h.specialists.length})
                                            </span>
                                            <button
                                              onClick={() => setActiveSpecialistOverlay(null)}
                                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded p-0.5"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {h.specialists.map((s, idx) => (
                                              <span
                                                key={idx}
                                                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                              >
                                                {s}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 italic">{t('common.none')}</span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {h.hasOT && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                                  {t('common.ot')}
                                </span>
                              )}
                              {h.hasXRay && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                                  {t('common.xray')}
                                </span>
                              )}
                              {h.hasAmbulance && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                                  {t('common.ambulance')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Occupancy */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="flex items-center gap-1">
                              <BedDouble size={12} /> {t('dashboard.bed_occupancy')}
                            </span>
                            <span className="font-medium tabular-nums">
                              {h.totalBeds - h.availableBeds}/{h.totalBeds}
                            </span>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${occupancy > 80
                                ? 'bg-red-500'
                                : occupancy > 60
                                  ? 'bg-amber-500'
                                  : 'bg-primary-500'
                                }`}
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{assignedStaff} {t('common.staff')} {t('dashboard.assigned')}</span>
                            <span>{activePatients} {t('common.patients')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          <PaginationControls
            meta={{
              page: activePage,
              pageSize: itemsPerPage,
              totalRecords,
              totalPages,
              hasNext: activePage < totalPages,
              hasPrevious: activePage > 1,
            } as PaginationMeta}
            onPageChange={setCurrentPage}
          />

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setReloadTrigger(prev => prev + 1);
        }}
        title={editing ? t('hospitals.form.editFacility') : t('hospitals.form.addFacility')}
      >
        <HospitalForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setReloadTrigger(prev => prev + 1);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('hospitals.confirmDelete')}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
            <AlertTriangle size={32} className="text-red-500 dark:text-red-400" />
          </div>
          <div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
              {t('common.delete')} <span className="text-red-600 dark:text-red-400">{deleteTarget?.name}</span>?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('hospitals.deleteWarning')}
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>
              <Trash2 size={14} /> {t('common.yes')}, {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
