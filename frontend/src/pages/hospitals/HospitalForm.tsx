import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Hospital, FacilityType } from '../../types';

interface Props {
  initial: Hospital | null;
  onClose: () => void;
}

export function HospitalForm({ initial, onClose }: Props) {
  const { addHospital, updateHospital } = useApp();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'hospital' as FacilityType,
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    totalBeds: String(initial?.totalBeds ?? ''),
    availableBeds: String(initial?.availableBeds ?? ''),
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      type: form.type,
      address: form.address,
      city: form.city,
      phone: form.phone,
      email: form.email,
      totalBeds: Number(form.totalBeds),
      availableBeds: Number(form.availableBeds),
    };
    if (initial) {
      updateHospital(initial.id, data);
    } else {
      addHospital(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Facility Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. GHC City Hospital" />

      <Select
        label="Type"
        value={form.type}
        onChange={e => set('type', e.target.value)}
        options={[
          { value: 'hospital', label: 'Hospital' },
          { value: 'clinic', label: 'Clinic' },
        ]}
      />

      <Input label="Address" required value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
      <Input label="City" required value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98000 00000" />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="facility@ghc.health" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Total Beds" type="number" min="0" value={form.totalBeds} onChange={e => set('totalBeds', e.target.value)} placeholder="0" />
        <Input label="Available Beds" type="number" min="0" value={form.availableBeds} onChange={e => set('availableBeds', e.target.value)} placeholder="0" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Facility'}</Button>
      </div>
    </form>
  );
}
