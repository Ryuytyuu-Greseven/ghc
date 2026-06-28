import { Building2, Users, UserRound, Pill, BedDouble, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { hospitals, staff, patients, medicines } = useApp();
  const { t } = useTranslation();

  const totalBeds = hospitals.reduce((s, h) => s + h.totalBeds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.availableBeds, 0);
  const unassignedStaff = staff.filter(s => !s.assignedHospitalId).length;
  const bedPatients = patients.filter(p => p.bedRequired).length;

  const recentPatients = [...patients]
    .sort((a, b) => b.admittedAt.localeCompare(a.admittedAt))
    .slice(0, 5);
  const recentHospitals = [...hospitals]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const occupancyPct = totalBeds
    ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100)
    : 0;
  const assignmentPct = staff.length
    ? Math.round(((staff.length - unassignedStaff) / staff.length) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <Header title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label={t('common.hospitals')}
              value={hospitals.length}
              icon={<Building2 size={20} className="text-primary-600 dark:text-primary-400" />}
              color="bg-primary-50 dark:bg-primary-900/30"
              sub={`${hospitals.filter(h => h.type === 'CHC').length} CHCs · ${hospitals.filter(h => h.type === 'PHC').length} PHCs`}
            />
            <StatCard
              label={t('common.staff')}
              value={staff.length}
              icon={<Users size={20} className="text-violet-600 dark:text-violet-400" />}
              color="bg-violet-50 dark:bg-violet-900/30"
              sub={`${unassignedStaff} unassigned`}
            />
            <StatCard
              label={t('common.patients')}
              value={patients.length}
              icon={<UserRound size={20} className="text-cyan-600 dark:text-cyan-400" />}
              color="bg-cyan-50 dark:bg-cyan-900/30"
              sub={`${bedPatients} requiring beds`}
            />
            <StatCard
              label={t('common.medicines')}
              value={medicines.length}
              icon={<Pill size={20} className="text-amber-600 dark:text-amber-400" />}
              color="bg-amber-50 dark:bg-amber-900/30"
              sub={t('dashboard.in_inventory')}
            />
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Bed occupancy */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
              <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-xl shrink-0">
                <BedDouble size={20} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.bed_occupancy')}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5 tabular-nums">
                  {totalBeds - availableBeds}
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-normal"> / {totalBeds}</span>
                </p>
                <div className="mt-2 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      occupancyPct > 80
                        ? 'bg-red-500'
                        : occupancyPct > 60
                        ? 'bg-amber-500'
                        : 'bg-primary-500'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{occupancyPct}% {t('dashboard.occupied')}</p>
              </div>
            </div>

            {/* Staff assignment */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl shrink-0">
                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.staff_assignment')}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5 tabular-nums">
                  {assignmentPct}%
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {staff.length - unassignedStaff} {t('common.of')} {staff.length} {t('dashboard.assigned')}
                </p>
              </div>
            </div>

            {/* Available beds highlight */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-5 text-white shadow-sm shadow-primary-600/20">
              <p className="text-primary-100 text-sm font-medium">{t('dashboard.available_beds')}</p>
              <p className="text-4xl font-bold mt-1 tabular-nums">{availableBeds}</p>
              <p className="text-primary-200 text-xs mt-1">{t('dashboard.across_all_facilities')}</p>
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent patients */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.recent_patients')}</h3>
              </CardHeader>
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[380px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Admitted
                        </th>
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Bed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPatients.map(p => (
                        <tr
                          key={p.id}
                          className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{p.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {p.age} yrs · {p.gender}
                            </p>
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 tabular-nums">
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
            </Card>

            {/* Facilities */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Facilities</h3>
              </CardHeader>
              <CardBody className="space-y-1 py-3">
                {recentHospitals.map(h => (
                  <Link
                    key={h.id}
                    to={`/hospitals/${h.id}`}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{h.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{h.city}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={h.type === 'CHC' ? 'warning' : 'success'}>{h.type}</Badge>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {h.availableBeds}/{h.totalBeds} beds free
                      </p>
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
