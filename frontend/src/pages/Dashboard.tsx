import { Building2, Users, UserRound, Pill, BedDouble, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useApp } from '../context/AppContext';

export function Dashboard() {
  const { hospitals, staff, patients, medicines } = useApp();

  const totalBeds = hospitals.reduce((s, h) => s + h.totalBeds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.availableBeds, 0);
  const unassignedStaff = staff.filter(s => !s.assignedHospitalId).length;
  const bedPatients = patients.filter(p => p.bedRequired).length;

  const recentPatients = [...patients].sort((a, b) => b.admittedAt.localeCompare(a.admittedAt)).slice(0, 5);
  const recentHospitals = [...hospitals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="GHC Health Care Management Overview" />
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Hospitals & Clinics"
            value={hospitals.length}
            icon={<Building2 size={20} className="text-primary-600" />}
            color="bg-primary-50"
            sub={`${hospitals.filter(h => h.type === 'hospital').length} hospitals, ${hospitals.filter(h => h.type === 'clinic').length} clinics`}
          />
          <StatCard
            label="Total Staff"
            value={staff.length}
            icon={<Users size={20} className="text-violet-600" />}
            color="bg-violet-50"
            sub={`${unassignedStaff} unassigned`}
          />
          <StatCard
            label="Active Patients"
            value={patients.length}
            icon={<UserRound size={20} className="text-cyan-600" />}
            color="bg-cyan-50"
            sub={`${bedPatients} requiring beds`}
          />
          <StatCard
            label="Medicine Items"
            value={medicines.length}
            icon={<Pill size={20} className="text-amber-600" />}
            color="bg-amber-50"
            sub="in inventory"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 col-span-1">
            <div className="bg-rose-50 p-3 rounded-xl">
              <BedDouble size={20} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">Bed Occupancy</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">
                {totalBeds - availableBeds}
                <span className="text-sm text-slate-400 font-normal"> / {totalBeds}</span>
              </p>
              <div className="mt-2 bg-slate-100 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full"
                  style={{ width: `${totalBeds ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 col-span-1">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Staff Assignment Rate</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">
                {staff.length ? Math.round(((staff.length - unassignedStaff) / staff.length) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {staff.length - unassignedStaff} of {staff.length} assigned
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-5 text-white col-span-1">
            <p className="text-primary-100 text-sm font-medium">Available Beds</p>
            <p className="text-4xl font-bold mt-1">{availableBeds}</p>
            <p className="text-primary-200 text-xs mt-1">across all facilities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-800">Recent Patients</h3>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-2 text-slate-500 font-medium">Patient</th>
                    <th className="text-left px-6 py-2 text-slate-500 font-medium">Admitted</th>
                    <th className="text-left px-6 py-2 text-slate-500 font-medium">Bed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.condition}</p>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{p.admittedAt}</td>
                      <td className="px-6 py-3">
                        <Badge variant={p.bedRequired ? 'danger' : 'success'}>
                          {p.bedRequired ? 'Required' : 'Not needed'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-800">Facilities</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {recentHospitals.map(h => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.city}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={h.type === 'hospital' ? 'info' : 'purple'}>
                      {h.type}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">{h.availableBeds}/{h.totalBeds} beds free</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
