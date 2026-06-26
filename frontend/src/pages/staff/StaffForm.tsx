import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Staff, StaffRole } from '../../types';

const roleOptions = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'technician', label: 'Technician' },
  { value: 'admin', label: 'Admin' },
  { value: 'pharmacist', label: 'Pharmacist' },
];

interface Props {
  initial: Staff | null;
  onClose: () => void;
}

export function StaffForm({ initial, onClose }: Props) {
  const { addStaff, updateStaff, hospitals } = useApp();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    role: initial?.role ?? 'doctor' as StaffRole,
    specialization: initial?.specialization ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    assignedHospitalId: initial?.assignedHospitalId ?? '',
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      role: form.role,
      specialization: form.specialization,
      phone: form.phone,
      email: form.email,
      assignedHospitalId: form.assignedHospitalId || null,
    };
    if (initial) {
      updateStaff(initial.id, data);
    } else {
      addStaff(data);
    }
    onClose();
  };

  const hospitalOptions = hospitals.map(h => ({ value: h.id, label: `${h.name} (${h.city})` }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Full Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Priya Sharma" />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Role"
          value={form.role}
          onChange={e => set('role', e.target.value)}
          options={roleOptions}
        />
        <Input label="Specialization" value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="e.g. Cardiology" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98000 00000" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@ghc.health" />
      </div>

      <Select
        label="Assign to Facility (optional)"
        value={form.assignedHospitalId}
        onChange={e => set('assignedHospitalId', e.target.value)}
        options={hospitalOptions}
        placeholder="— Leave unassigned —"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Staff'}</Button>
      </div>
    </form>
  );
}
