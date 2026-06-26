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
} from 'lucide-react';
import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { StaffRole, MedicineCategory } from '../../types';
import { HospitalForm } from './HospitalForm';
import { clsx } from 'clsx';

const roleVariant: Record<StaffRole, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
  doctor: 'info',
  nurse: 'success',
  technician: 'warning',
  admin: 'default',
  pharmacist: 'purple',
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
  const centralRemaining = totalStock - totalDistributed;
  const pct = totalStock > 0 ? centralRemaining / totalStock : 1;

  if (centralRemaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
        <PackageX size={10} /> Depleted
      </span>
    );
  }
  if (pct < 0.15) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
        <AlertTriangle size={10} /> Critical Low
      </span>
    );
  }
  if (pct < 0.3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">
        <AlertTriangle size={10} /> Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
      <CheckCircle size={10} /> In Stock
    </span>
  );
}

export function HospitalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hospitals, staff, patients, medicines, hospitalMedicines } = useApp();
  const [editOpen, setEditOpen] = useState(false);

  const hospital = hospitals.find(h => h.id === id);

  if (!hospital) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Facility Not Found" />
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500 dark:text-slate-400">Facility not found</p>
            <button
              onClick={() => navigate('/hospitals')}
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Back to Hospitals
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
              <ArrowLeft size={16} /> Back to Hospitals
            </button>
            <Button onClick={() => setEditOpen(true)} variant="secondary">
              <Pencil size={14} /> Edit Facility
            </Button>
          </div>

          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary-50 dark:bg-primary-900/30 p-2.5 rounded-xl shrink-0">
                  <BedDouble size={18} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Beds</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {hospital.totalBeds}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {hospital.availableBeds} available
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Staff Assigned</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {assignedStaff.length}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {Object.keys(staffByRole).length} role types
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active Patients</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {facilityPatients.length}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {bedPatientsCount} need beds
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Medicine Types</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {facilityMedicines.length}
                  </p>
                  {criticalMedicines > 0 ? (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 font-medium">
                      {criticalMedicines} need restocking
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      All stocked
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
                  Facility Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'p-2 rounded-lg shrink-0',
                      hospital.type === 'hospital'
                        ? 'bg-cyan-50 dark:bg-cyan-900/30'
                        : 'bg-violet-50 dark:bg-violet-900/30'
                    )}
                  >
                    <Building2
                      size={18}
                      className={
                        hospital.type === 'hospital'
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-violet-600 dark:text-violet-400'
                      }
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {hospital.name}
                    </p>
                    <Badge variant={hospital.type === 'hospital' ? 'info' : 'purple'}>
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
                    Registered: {hospital.createdAt}
                  </p>
                </div>
              </CardBody>
            </Card>

            {/* Bed occupancy */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Bed Status</h3>
                  <TrendingUp size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Occupancy % */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Occupancy Rate</p>
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
                      label: 'Total',
                      value: hospital.totalBeds,
                      cls: 'bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100',
                    },
                    {
                      label: 'Occupied',
                      value: occupiedBeds,
                      cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                    },
                    {
                      label: 'Available',
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
                      {bedPatientsCount} patient{bedPatientsCount > 1 ? 's' : ''} require{bedPatientsCount === 1 ? 's' : ''} a bed
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
                  Assigned Staff
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(staffByRole).map(([role, count]) => (
                    <span
                      key={role}
                      className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"
                    >
                      {count} {role}
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
                          Name
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          Specialization
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Contact
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
                              {s.role.charAt(0).toUpperCase() + s.role.slice(1)}
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
                    <span className="text-sm">No staff assigned to this facility yet</span>
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
                  Medicine & Supply Inventory
                </h3>
                {criticalMedicines > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={12} /> {criticalMedicines} item{criticalMedicines > 1 ? 's' : ''} need restocking
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
                          Item
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          Category
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          At Facility
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Central Remaining
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Status
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
                                {med.category.charAt(0).toUpperCase() + med.category.slice(1)}
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
                  <p className="text-sm">No medicines assigned to this facility yet</p>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Patients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  Active Patients
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full tabular-nums">
                  {facilityPatients.length} total
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
                          Patient
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          Condition
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Admitted
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Bed
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
                            {p.condition}
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell tabular-nums">
                            {p.admittedAt}
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant={p.bedRequired ? 'danger' : 'success'}>
                              {p.bedRequired ? 'Required' : 'Not needed'}
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
                  <span className="text-sm">No patients currently admitted</span>
                </div>
              </CardBody>
            )}
          </Card>

        </div>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Facility">
        <HospitalForm initial={hospital} onClose={() => setEditOpen(false)} />
      </Modal>
    </div>
  );
}
