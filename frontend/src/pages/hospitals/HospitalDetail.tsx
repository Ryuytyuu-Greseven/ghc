import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  BedDouble,
  Users,
  Pill,
  UserRound,
  UserCheck,
  UserX,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  PackageX,
  Pencil,
  History,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { hospitalApi } from '../../services/hospitalApi';
import type { StaffRole, MedicineCategory, Hospital } from '../../types';
import { HospitalForm } from './HospitalForm';
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

const categoryVariant: Record<MedicineCategory, 'success' | 'info' | 'warning' | 'purple'> = {
  medication: 'success',
  equipment: 'info',
  consumable: 'warning',
  diagnostic: 'purple',
};

function StockStatusBadge({
  totalStock,
  totalDistributed,
}: {
  totalStock: number;
  totalDistributed: number;
}) {
  const { t } = useTranslation();
  const centralRemaining = totalStock - totalDistributed;
  const pct = totalStock > 0 ? centralRemaining / totalStock : 1;

  if (centralRemaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
        <PackageX size={10} /> {t('hospitals.detail.depleted')}
      </span>
    );
  }
  if (pct < 0.15) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
        <AlertTriangle size={10} /> {t('hospitals.detail.criticalLow')}
      </span>
    );
  }
  if (pct < 0.3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
        <AlertTriangle size={10} /> {t('hospitals.detail.lowStock')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
      <CheckCircle size={10} /> {t('hospitals.detail.inStock')}
    </span>
  );
}

export function HospitalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    hospitals,
    staff,
    patients,
    medicines,
    hospitalMedicines,
    getHospitalHistory,
    getBedAllocationHistory,
    currentUser,
  } = useApp();
  const isAdmin = currentUser?.role === 'Admin';
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<Hospital[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Hospital | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fetchedHospital, setFetchedHospital] = useState<Hospital | null>(null);
  const [loadingHospital, setLoadingHospital] = useState(false);

  const [bedHistoryOpen, setBedHistoryOpen] = useState(false);
  const [bedHistoryRecords, setBedHistoryRecords] = useState<any[]>([]);
  const [loadingBedHistory, setLoadingBedHistory] = useState(false);

  const contextHospital = hospitals.find(h => h.id === id);
  const hospital = contextHospital ?? fetchedHospital;

  // If not found in context (e.g. direct URL navigation / page refresh), fetch directly
  useEffect(() => {
    if (!contextHospital && id) {
      setLoadingHospital(true);
      hospitalApi.getHospital(id)
        .then(data => {
          const h = data as any;
          setFetchedHospital({
            ...h,
            id: h.hospitalId ?? h._id ?? h.id ?? '',
          });
        })
        .catch(() => setFetchedHospital(null))
        .finally(() => setLoadingHospital(false));
    }
  }, [id, contextHospital]);

  if (loadingHospital) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t('common.loading')} />
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenHistory = async () => {
    if (!hospital) return;
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const recordId = (hospital as any).hospitalId || hospital.id;
      const history = await getHospitalHistory(recordId);
      setHistoryRecords(history);
      setSelectedRecord(history.length > 0 ? history[0] : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenBedHistory = async () => {
    if (!hospital) return;
    setBedHistoryOpen(true);
    setLoadingBedHistory(true);
    try {
      const recordId = (hospital as any).hospitalId || hospital.id;
      const history = await getBedAllocationHistory(recordId);
      setBedHistoryRecords(history);
    } catch (err) {
      console.error('Failed to load bed history:', err);
    } finally {
      setLoadingBedHistory(false);
    }
  };

  if (!hospital) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t('hospitals.detail.noHistory')} />
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500 dark:text-slate-400">{t('hospitals.detail.noHistory')}</p>
            <button
              onClick={() => navigate('/hospitals')}
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('hospitals.detail.backToHospitals')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignedStaff = staff.filter(s => s.assignedHospitalId === hospital.id);
  const facilityPatients = patients.filter(p => p.hospitalId === hospital.id);
  const facilityMedicines = hospitalMedicines.filter(hm => hm.hospitalId === hospital.id);

  const occupiedBeds = hospital.totalBeds - hospital.availableBeds;
  const occupancyPct = hospital.totalBeds
    ? Math.round((occupiedBeds / hospital.totalBeds) * 100)
    : 0;
  const bedPatientsCount = facilityPatients.filter(p => p.bedRequired).length;

  const staffByRole = assignedStaff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});

  const criticalMedicines = facilityMedicines.filter(hm => {
    const med = medicines.find(m => m.id === hm.medicineId);
    if (!med) return false;
    const totalDist = hospitalMedicines
      .filter(x => x.medicineId === hm.medicineId)
      .reduce((s, x) => s + x.quantity, 0);
    const pct = med.totalStock > 0 ? (med.totalStock - totalDist) / med.totalStock : 1;
    return pct < 0.3 || med.totalStock - totalDist <= 0;
  }).length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title={hospital.name}
        subtitle={`${hospital.city} · ${hospital.type.charAt(0).toUpperCase() + hospital.type.slice(1)}`}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">

          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => navigate('/hospitals')}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft size={16} /> {t('hospitals.detail.backToHospitals')}
            </button>
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenHistory} variant="secondary">
                <History size={14} /> {t('hospitals.detail.viewHistory')}
              </Button>
              {isAdmin && (
                <Button onClick={() => setEditOpen(true)} variant="secondary">
                  <Pencil size={14} /> {t('hospitals.form.editFacility')}
                </Button>
              )}
            </div>
          </div>

          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/30 p-2.5 rounded-xl shrink-0">
                  <BedDouble size={18} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.totalBeds')}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {hospital.totalBeds}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {hospital.availableBeds} {t('common.available')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="bg-violet-50 dark:bg-violet-900/30 p-2.5 rounded-xl shrink-0">
                  <Users size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('hospitals.detail.assignedStaff')}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {assignedStaff.length}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {t('hospitals.detail.roleTypes', { count: Object.keys(staffByRole).length })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="bg-cyan-50 dark:bg-cyan-900/30 p-2.5 rounded-xl shrink-0">
                  <UserRound size={18} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('hospitals.detail.activePatients')}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {facilityPatients.length}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {t('hospitals.detail.needBeds', { count: bedPatientsCount })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    'p-2.5 rounded-xl shrink-0',
                    criticalMedicines > 0
                      ? 'bg-red-50 dark:bg-red-900/30'
                      : 'bg-amber-50 dark:bg-amber-900/30'
                  )}
                >
                  <Pill
                    size={18}
                    className={
                      criticalMedicines > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.medicines')}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {facilityMedicines.length}
                  </p>
                  {criticalMedicines > 0 ? (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 font-medium">
                      {t('hospitals.detail.restockingWarning', { count: criticalMedicines })}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {t('hospitals.detail.allStocked')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facility info + Bed occupancy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Facility info */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {t('hospitals.detail.facilityInfo')}
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'p-2 rounded-lg shrink-0',
                      hospital.type === 'CHC'
                        ? 'bg-cyan-50 dark:bg-cyan-900/30'
                        : 'bg-violet-50 dark:bg-violet-900/30'
                    )}
                  >
                    <Building2
                      size={18}
                      className={
                        hospital.type === 'CHC'
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-violet-600 dark:text-violet-400'
                      }
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {hospital.name}
                    </p>
                    <Badge variant={hospital.type === 'CHC' ? 'info' : 'purple'}>
                      {hospital.type}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin size={15} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-300">
                      {hospital.address}, {hospital.city}
                    </span>
                  </div>
                  {hospital.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{hospital.phone}</span>
                    </div>
                  )}
                  {hospital.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{hospital.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t('hospitals.detail.registered')}: {hospital.createdAt}
                  </p>
                </div>
              </CardBody>
            </Card>

            {/* Bed occupancy */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('hospitals.detail.bedStatus')}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenBedHistory}
                      className="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      title={t('hospitals.detail.bedHistory')}
                    >
                      <History size={16} />
                    </button>
                    <TrendingUp size={16} className="text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Occupancy % */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('hospitals.detail.occupancyRate')}</p>
                    <p
                      className={clsx(
                        'text-2xl font-bold tabular-nums',
                        occupancyPct > 80
                          ? 'text-red-600 dark:text-red-400'
                          : occupancyPct > 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {occupancyPct}%
                    </p>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        occupancyPct > 80
                          ? 'bg-red-500'
                          : occupancyPct > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      )}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                {/* Bed breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: t('common.total'),
                      value: hospital.totalBeds,
                      cls: 'bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100',
                    },
                    {
                      label: t('dashboard.occupied'),
                      value: occupiedBeds,
                      cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                    },
                    {
                      label: t('common.available'),
                      value: hospital.availableBeds,
                      cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={clsx(
                        'rounded-lg p-3 text-center border border-transparent',
                        item.cls
                      )}
                    >
                      <p className="text-xl font-bold tabular-nums">{item.value}</p>
                      <p className="text-xs mt-0.5 opacity-75">{item.label}</p>
                    </div>
                  ))}
                </div>

                {bedPatientsCount > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} />
                    <span>
                      {t('hospitals.detail.needBeds', { count: bedPatientsCount })}
                    </span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Staff section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {t('hospitals.detail.assignedStaff')}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(staffByRole).map(([role, count]) => (
                    <span
                      key={role}
                      className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"
                    >
                      {count} {t(`roles.${role}`)}
                      {count > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            {assignedStaff.length > 0 ? (
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.patient')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.role')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          {t('hospitals.detail.specialization')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          {t('hospitals.detail.contact')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {assignedStaff.map(s => (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-400 text-xs font-bold shrink-0">
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
                          <td className="px-6 py-3">
                            <Badge variant={roleVariant[s.role]}>
                              {t(`roles.${s.role}`)}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {s.specialization || '—'}
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                            {s.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            ) : (
              <CardBody>
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-2 justify-center">
                    <UserX size={18} />
                    <span className="text-sm">{t('hospitals.detail.noStaff')}</span>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Medicine inventory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {t('hospitals.detail.medicineInventory')}
                </h3>
                {criticalMedicines > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={12} /> {t('hospitals.detail.restockingWarning', { count: criticalMedicines })}
                  </span>
                )}
              </div>
            </CardHeader>
            {facilityMedicines.length > 0 ? (
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.item')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          {t('hospitals.detail.category')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.atFacility')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          {t('hospitals.detail.centralRemaining')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {facilityMedicines.map(hm => {
                        const med = medicines.find(m => m.id === hm.medicineId);
                        if (!med) return null;
                        const totalDist = hospitalMedicines
                          .filter(x => x.medicineId === hm.medicineId)
                          .reduce((s, x) => s + x.quantity, 0);
                        const centralRemaining = med.totalStock - totalDist;
                        return (
                          <tr
                            key={hm.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <Pill size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {med.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 hidden sm:table-cell">
                              <Badge variant={categoryVariant[med.category]}>
                                {t(`medicines.categories.${med.category}`)}
                              </Badge>
                            </td>
                            <td className="px-6 py-3">
                              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                                {hm.quantity.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                                {med.unit}
                              </span>
                            </td>
                            <td className="px-6 py-3 hidden md:table-cell">
                              <span
                                className={clsx(
                                  'font-medium tabular-nums',
                                  centralRemaining <= 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : centralRemaining / med.totalStock < 0.3
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                {centralRemaining.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                                / {med.totalStock.toLocaleString()} {med.unit}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <StockStatusBadge
                                totalStock={med.totalStock}
                                totalDistributed={totalDist}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            ) : (
              <CardBody>
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <Pill size={18} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('hospitals.detail.noMedicines')}</p>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Patients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {t('hospitals.detail.activePatients')}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full tabular-nums">
                  {facilityPatients.length} {t('common.total')}
                </span>
              </div>
            </CardHeader>
            {facilityPatients.length > 0 ? (
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.patient')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          {t('hospitals.detail.condition')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          {t('hospitals.detail.admitted')}
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {t('hospitals.detail.bed')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {facilityPatients.map(p => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-700 dark:text-cyan-400 text-xs font-bold shrink-0">
                                {p.name
                                  .split(' ')
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {p.name}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  {p.age} yrs · {p.gender}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell truncate max-w-[160px]">
                            {p.bloodGroup}
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell tabular-nums">
                            {p.admittedAt}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={p.bedRequired ? 'danger' : 'success'}>
                              {p.bedRequired ? t('hospitals.detail.required') : t('hospitals.detail.notNeeded')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            ) : (
              <CardBody>
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400 dark:text-slate-500">
                  <UserCheck size={18} />
                  <span className="text-sm">{t('hospitals.detail.noPatients')}</span>
                </div>
              </CardBody>
            )}
          </Card>

        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('hospitals.form.editFacility')}>
        <HospitalForm initial={hospital} onClose={() => setEditOpen(false)} />
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('hospitals.detail.updateHistory')}
        size="lg"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : historyRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <History size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium">{t('hospitals.detail.noHistory')}</p>
            <p className="text-xs mt-1">{t('hospitals.detail.noHistoryDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-h-[70vh]">
            {/* Left list: Timestamps & Versions */}
            <div className="md:col-span-2 border-r border-slate-100 dark:border-slate-700 pr-4 overflow-y-auto space-y-2 h-[50vh] max-h-[50vh]">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                {t('hospitals.detail.updatesLog')}
              </h3>
              {historyRecords.map((rec, index) => {
                const isSelected = selectedRecord?._id === rec._id;
                return (
                  <button
                    key={rec._id || `${rec.id}-${rec.version}`}
                    onClick={() => setSelectedRecord(rec)}
                    className={clsx(
                      'w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5',
                      isSelected
                        ? 'border-primary-600 bg-primary-600 dark:bg-primary-500 dark:border-primary-500 text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={clsx(
                        'text-xs font-bold',
                        isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                      )}>
                        {rec.version === 1 ? t('common.created') : t('common.updated')}
                      </span>
                      {rec.isCurrent && index === 0 && (
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border',
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-350 border-emerald-200/60 dark:border-emerald-800/40'
                        )}>
                          {t('common.active')}
                        </span>
                      )}
                    </div>
                    <div className={clsx(
                      'flex items-center gap-1.5 text-xs',
                      isSelected ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400'
                    )}>
                      <Clock size={11} className={clsx('shrink-0', isSelected ? 'text-primary-200' : 'text-slate-400')} />
                      <span>{rec.updatedAt || rec.createdAt || 'N/A'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right panel: Details of selected snapshot */}
            <div className="md:col-span-3 overflow-y-auto h-[50vh] max-h-[50vh] space-y-4">
              {selectedRecord ? (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {selectedRecord.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedRecord.version === 1 ? t('hospitals.detail.snapshotCreation') : t('hospitals.detail.snapshotVersion', { version: selectedRecord.version })} ({selectedRecord.type})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">{t('hospitals.address')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {selectedRecord.address}, {selectedRecord.city}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">{t('hospitals.detail.contact')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {selectedRecord.phone || t('hospitals.detail.noPhone')}
                        {selectedRecord.email && ` · ${selectedRecord.email}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">{t('hospitals.detail.bedStatus')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {t('hospitals.detail.bedsOccupied', { occupied: selectedRecord.totalBeds - selectedRecord.availableBeds, total: selectedRecord.totalBeds })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">{t('common.medicalOfficer')}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {selectedRecord.medicalOfficer || t('hospitals.detail.unassigned')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t('hospitals.detail.servicesEquipment')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecord.hasOT && (
                        <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          OT
                        </span>
                      )}
                      {selectedRecord.hasXRay && (
                        <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          X-Ray
                        </span>
                      )}
                      {selectedRecord.hasAmbulance && (
                        <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          Ambulance
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedRecord.specialists && selectedRecord.specialists.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {t('hospitals.detail.specialistsRegistered')}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRecord.specialists.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <span className="text-sm">{t('hospitals.detail.selectVersion')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Bed allocation history modal */}
      <Modal
        open={bedHistoryOpen}
        onClose={() => setBedHistoryOpen(false)}
        title={t('hospitals.detail.bedHistory')}
        size="lg"
      >
        {loadingBedHistory ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-505 dark:text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : bedHistoryRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <History size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium">{t('hospitals.detail.noBedHistory')}</p>
            <p className="text-xs mt-1">{t('hospitals.detail.noBedHistoryDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bedHistoryRecords.map((record) => (
              <div
                key={record._id}
                className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {record.patientId?.name || t('hospitals.detail.unknownPatient')}
                    </span>
                    <Badge variant={record.status === 'ALLOCATED' ? 'danger' : 'success'}>
                      {t(`hospitals.detail.${record.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('hospitals.detail.condition')}: {record.patientId?.condition || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500">
                    Patient ID: {record.patientId?._id || 'N/A'}
                  </p>
                </div>
                <div className="text-xs text-slate-550 dark:text-slate-400 space-y-1 md:text-right shrink-0">
                  <div className="flex items-center gap-1.5 md:justify-end">
                    <Clock size={12} className="text-slate-400" />
                    <span>{t('hospitals.detail.allocated')}: {record.allocatedAt ? new Date(record.allocatedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  {record.status === 'DEALLOCATED' && record.deallocatedAt && (
                    <div className="flex items-center gap-1.5 md:justify-end text-emerald-600 dark:text-emerald-400 font-medium">
                      <Clock size={12} className="text-emerald-500" />
                      <span>{t('hospitals.detail.deallocated')}: {new Date(record.deallocatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
