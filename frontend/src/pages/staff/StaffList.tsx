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

const roleVariant: Record<StaffRole, 'info' | 'success' | 'warning' | 'purple' | 'default'> = {
  doctor: 'info',
  nurse: 'success',
  technician: 'warning',
  admin: 'default',
  pharmacist: 'purple',
};

export function StaffList() {
  const { staff, deleteStaff, hospitals } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [assigning, setAssigning] = useState<Staff | null>(null);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const filtered = staff.filter(s => {
    if (filter === 'assigned') return !!s.assignedHospitalId;
    if (filter === 'unassigned') return !s.assignedHospitalId;
    return true;
  });

  const openEdit = (s: Staff) => { setEditing(s); setFormOpen(true); };
  const openAssign = (s: Staff) => { setAssigning(s); setAssignOpen(true); };

  const handleDelete = (id: string) => {
    if (confirm('Remove this staff member?')) deleteStaff(id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Staff Management" subtitle="Manage and assign hospital staff" />
      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['all', 'assigned', 'unassigned'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} /> Add Staff
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Role</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Specialization</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Assigned To</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Contact</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const hospital = hospitals.find(h => h.id === s.assignedHospitalId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                          {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={roleVariant[s.role]}>
                        {s.role.charAt(0).toUpperCase() + s.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{s.specialization}</td>
                    <td className="px-6 py-3.5">
                      {hospital ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <UserCheck size={14} />
                          <span className="text-sm font-medium">{hospital.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <UserX size={14} />
                          <span className="text-sm">Unassigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{s.phone}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openAssign(s)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition"
                          title="Assign to facility"
                        >
                          <ArrowRightLeft size={14} />
                        </button>
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Users size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No staff found</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff Member'}>
        <StaffForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Staff to Facility" size="sm">
        {assigning && <StaffAssign staff={assigning} onClose={() => setAssignOpen(false)} />}
      </Modal>
    </div>
  );
}
