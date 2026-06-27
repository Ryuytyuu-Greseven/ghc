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
  const { addHospital, updateHospital, hospitals } = useApp();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? ('PHC' as FacilityType),
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    totalBeds: String(initial?.totalBeds ?? ''),
    availableBeds: String(initial?.availableBeds ?? ''),
    parentCHCId: initial?.parentCHCId ?? '',
    medicalOfficer: initial?.medicalOfficer ?? '',
    specialists: initial?.specialists?.join(', ') ?? '',
    hasOT: initial?.hasOT ?? false,
    hasXRay: initial?.hasXRay ?? false,
    hasAmbulance: initial?.hasAmbulance ?? false,
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const chcs = hospitals.filter(h => h.type === 'CHC' && h.id !== initial?.id);

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
      parentCHCId: form.type === 'PHC' && form.parentCHCId ? form.parentCHCId : null,
      medicalOfficer: (form.type === 'PHC' || form.type === 'CHC') && form.medicalOfficer ? form.medicalOfficer : null,
      specialists: form.type === 'CHC' ? form.specialists.split(',').map(s => s.trim()).filter(Boolean) : [],
      hasOT: form.type === 'CHC' ? form.hasOT : false,
      hasXRay: form.type === 'CHC' ? form.hasXRay : false,
      hasAmbulance: (form.type === 'CHC' || form.type === 'PHC') ? form.hasAmbulance : false,
    };
    if (initial) {
      updateHospital(initial.id, data);
    } else {
      addHospital(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <Input
        label="Facility Name"
        required
        value={form.name}
        onChange={e => set('name', e.target.value)}
        placeholder="e.g. GHC City Hospital"
      />

      <Select
        label="Type"
        value={form.type}
        onChange={e => set('type', e.target.value)}
        options={[
          { value: 'PHC', label: 'Primary Health Centre (PHC)' },
          { value: 'CHC', label: 'Community Health Centre (CHC)' },
        ]}
      />

      <Input
        label="Address"
        required
        value={form.address}
        onChange={e => set('address', e.target.value)}
        placeholder="Street address"
      />
      <Input
        label="City"
        required
        value={form.city}
        onChange={e => set('city', e.target.value)}
        placeholder="City"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="+91 98000 00000"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="facility@ghc.health"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Total Beds"
          type="number"
          min="0"
          value={form.totalBeds}
          onChange={e => set('totalBeds', e.target.value)}
          placeholder="0"
        />
        <Input
          label="Available Beds"
          type="number"
          min="0"
          value={form.availableBeds}
          onChange={e => set('availableBeds', e.target.value)}
          placeholder="0"
        />
      </div>

      {form.type === 'PHC' && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Primary Health Centre (PHC) Details</h4>
          <Input
            label="Medical Officer In-Charge"
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            placeholder="Dr. Rajesh Kumar"
          />
          <Select
            label="Parent CHC (Referral Link)"
            value={form.parentCHCId}
            onChange={e => set('parentCHCId', e.target.value)}
            options={[
              { value: '', label: 'None (Unlinked)' },
              ...chcs.map(chc => ({ value: chc.id, label: `${chc.name} (${chc.city})` })),
            ]}
          />
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="phc-ambulance"
              checked={form.hasAmbulance}
              onChange={e => set('hasAmbulance', e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="phc-ambulance" className="text-sm text-slate-600 font-medium select-none">
              Dedicated Ambulance Available
            </label>
          </div>
        </div>
      )}

      {form.type === 'CHC' && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Community Health Centre (CHC) Details</h4>
          <Input
            label="Medical Officer In-Charge"
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            placeholder="Dr. Rajesh Kumar"
          />
          <Input
            label="Available Specialists (Comma-separated)"
            value={form.specialists}
            onChange={e => set('specialists', e.target.value)}
            placeholder="e.g. Surgeon, Gynecologist, Pediatrician, Physician"
          />
          <div className="space-y-2 mt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Facilities Available</label>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chc-ot"
                  checked={form.hasOT}
                  onChange={e => set('hasOT', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="chc-ot" className="text-sm text-slate-600 font-medium select-none">
                  OT
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chc-xray"
                  checked={form.hasXRay}
                  onChange={e => set('hasXRay', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="chc-xray" className="text-sm text-slate-600 font-medium select-none">
                  X-Ray
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chc-ambulance"
                  checked={form.hasAmbulance}
                  onChange={e => set('hasAmbulance', e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="chc-ambulance" className="text-sm text-slate-600 font-medium select-none">
                  Ambulance
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Facility'}</Button>
      </div>
    </form>
  );
}
