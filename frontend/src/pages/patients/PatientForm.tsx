import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Patient, Gender } from '../../types';

interface Props {
  initial: Patient | null;
  onClose: () => void;
}

export function PatientForm({ initial, onClose }: Props) {
  const { addPatient, updatePatient, hospitals } = useApp();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    age: String(initial?.age ?? ''),
    gender: initial?.gender ?? 'male' as Gender,
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    hospitalId: initial?.hospitalId ?? '',
    condition: initial?.condition ?? '',
    bedRequired: initial?.bedRequired ?? false,
  });

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      age: Number(form.age),
      gender: form.gender,
      phone: form.phone,
      address: form.address,
      hospitalId: form.hospitalId,
      condition: form.condition,
      bedRequired: form.bedRequired,
    };
    if (initial) {
      updatePatient(initial.id, data);
    } else {
      addPatient(data);
    }
    onClose();
  };

  const hospitalOptions = hospitals.map(h => ({ value: h.id, label: `${h.name} — ${h.city}` }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Patient Full Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Kavitha Nair" />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Age" type="number" min="0" max="150" required value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age in years" />
        <Select
          label="Gender"
          value={form.gender}
          onChange={e => set('gender', e.target.value)}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 99000 00000" />
        <Select
          label="Assign to Facility"
          required
          value={form.hospitalId}
          onChange={e => set('hospitalId', e.target.value)}
          options={hospitalOptions}
          placeholder="— Select facility —"
        />
      </div>

      <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Home address" />
      <Input label="Condition / Reason for Visit" value={form.condition} onChange={e => set('condition', e.target.value)} placeholder="e.g. Cardiac monitoring" />

      <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
        <input
          type="checkbox"
          id="bedRequired"
          checked={form.bedRequired}
          onChange={e => set('bedRequired', e.target.checked)}
          className="w-4 h-4 accent-primary-600 cursor-pointer"
        />
        <label htmlFor="bedRequired" className="text-sm font-medium text-slate-700 cursor-pointer">
          Bed required (inpatient admission)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Onboard Patient'}</Button>
      </div>
    </form>
  );
}
