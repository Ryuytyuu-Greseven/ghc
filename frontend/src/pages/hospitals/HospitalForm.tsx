import { useState } from 'react';
import { ShieldCheck, Pencil, Building2, Plus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { SPECIALIST_LIST } from '../../data/specialists';
import type { Hospital, FacilityType } from '../../types';

interface Props {
  initial: Hospital | null;
  onClose: () => void;
}

export function HospitalForm({ initial, onClose }: Props) {
  const { addHospital, updateHospital, hospitals, staff } = useApp();

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
    specialists: initial?.specialists ?? [],
    hasOT: initial?.hasOT ?? false,
    hasXRay: initial?.hasXRay ?? false,
    hasAmbulance: initial?.hasAmbulance ?? false,
  });

  const [pendingData, setPendingData] = useState<Partial<Hospital> | null>(null);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const chcs = hospitals.filter(h => h.type === 'CHC' && h.id !== initial?.id);
  const doctors = staff.filter(s => s.isMedicalIncharge === true);

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
      specialists: form.type === 'CHC' ? form.specialists : [],
      hasOT: form.type === 'CHC' ? form.hasOT : false,
      hasXRay: form.type === 'CHC' ? form.hasXRay : false,
      hasAmbulance: (form.type === 'CHC' || form.type === 'PHC') ? form.hasAmbulance : false,
    };
    // Always show confirmation modal before submitting to backend
    setPendingData(data);
  };

  const confirmSave = async () => {
    if (!pendingData) return;

    if (initial) {
      await updateHospital(initial.id, pendingData);
    } else {
      await addHospital(pendingData as Omit<Hospital, 'id' | 'createdAt'>);
    }
    setPendingData(null);
    onClose();
  };

  return (<>
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
          <Select
            label="Medical Officer In-Charge"
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            options={[
              { value: '', label: '— Select Medical Officer —' },
              ...doctors.map(d => ({ value: d.name, label: `${d.name}${d.specialization ? ` (${d.specialization})` : ''}` })),
            ]}
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
          <Select
            label="Medical Officer In-Charge"
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            options={[
              { value: '', label: '— Select Medical Officer —' },
              ...doctors.map(d => ({ value: d.name, label: `${d.name}${d.specialization ? ` (${d.specialization})` : ''}` })),
            ]}
          />
          <MultiSelect
            label="Available Specialists"
            options={SPECIALIST_LIST}
            selected={form.specialists}
            onChange={val => set('specialists', val)}
            placeholder="No specialists registered"
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

    {/* Save/Add Confirmation Modal */}
    <Modal
      open={!!pendingData}
      onClose={() => setPendingData(null)}
      title={initial ? 'Confirm Save Changes' : 'Confirm Add Facility'}
      size="sm"
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
          {initial ? (
            <ShieldCheck size={32} className="text-blue-500 dark:text-blue-400" />
          ) : (
            <Building2 size={32} className="text-primary-500 dark:text-primary-400" />
          )}
        </div>
        <div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
            {initial ? 'Save changes to ' : 'Add new facility '}
            <span className="text-primary-600 dark:text-primary-400">
              {pendingData?.name || initial?.name}
            </span>
            ?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {initial
              ? `This will update the details of this ${initial.type} facility in the database.`
              : `This will register a new ${pendingData?.type} facility in the database.`}
          </p>
        </div>
        <div className="flex gap-3 w-full pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPendingData(null)}>
            Go Back
          </Button>
          <Button variant="primary" className="flex-1" onClick={confirmSave}>
            {initial ? (
              <>
                <Pencil size={14} /> Yes, Save
              </>
            ) : (
              <>
                <Plus size={14} /> Yes, Add
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  </>);
}
