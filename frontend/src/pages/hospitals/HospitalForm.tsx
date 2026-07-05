import { useState, useEffect } from 'react';
import { ShieldCheck, Pencil, Building2, Plus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { SPECIALIST_LIST } from '../../data/specialists';
import { useTranslation } from 'react-i18next';
import { locationApi } from '../../services/locationApi';
import type { Hospital, FacilityType } from '../../types';

interface Props {
  initial: Hospital | null;
  onClose: () => void;
}

export function HospitalForm({ initial, onClose }: Props) {
  const { t } = useTranslation();
  const { addHospital, updateHospital, hospitals, staff } = useApp();

  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? ('PHC' as FacilityType),
    address: initial?.address ?? '',
    state: (initial as any)?.stateCode ? String((initial as any).stateCode) : '',
    city: (initial as any)?.cityCode ? String((initial as any).cityCode) : '',
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

  const handleStateChange = (stateCode: string) => {
    setForm(f => ({
      ...f,
      state: stateCode,
      city: '',
    }));
  };

  useEffect(() => {
    async function loadStates() {
      try {
        const data = await locationApi.getStates();
        setStates(data);
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    }
    loadStates();
  }, []);

  useEffect(() => {
    if (!form.state) {
      setDistricts([]);
      return;
    }
    async function loadDistricts() {
      try {
        const data = await locationApi.getDistricts(form.state);
        setDistricts(data);
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    }
    loadDistricts();
  }, [form.state]);

  const chcs = hospitals.filter(h => h.type === 'CHC' && h.id !== initial?.id);
  const doctors = staff.filter(s => s.isMedicalIncharge === true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      type: form.type,
      address: form.address,
      state: form.state ? Number(form.state) : null,
      city: Number(form.city),
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
        label={t('hospitals.form.facilityName')}
        required
        value={form.name}
        onChange={e => set('name', e.target.value)}
        placeholder={t('hospitals.form.facilityNamePlaceholder')}
      />

      <Select
        label={t('hospitals.form.type')}
        value={form.type}
        onChange={e => set('type', e.target.value)}
        options={[
          { value: 'PHC', label: t('hospitals.form.phc') },
          { value: 'CHC', label: t('hospitals.form.chc') },
        ]}
      />

      <Input
        label={t('hospitals.form.address')}
        required
        value={form.address}
        onChange={e => set('address', e.target.value)}
        placeholder={t('hospitals.form.addressPlaceholder')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('staff.form.labels.state', 'State')}
          required
          value={form.state}
          onChange={e => handleStateChange(e.target.value)}
          options={[
            { value: '', label: '— Select State —' },
            ...states.map(s => ({ value: String(s.code), label: s.name })),
          ]}
        />

        <Select
          label={t('staff.form.labels.city', 'District')}
          required
          disabled={!form.state}
          value={form.city}
          onChange={e => set('city', e.target.value)}
          options={[
            { value: '', label: '— Select District —' },
            ...districts.map(d => ({ value: String(d.code), label: d.name })),
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('hospitals.form.phone')}
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder={t('hospitals.form.phonePlaceholder')}
        />
        <Input
          label={t('hospitals.form.email')}
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder={t('hospitals.form.emailPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('hospitals.form.totalBeds')}
          type="number"
          min="0"
          value={form.totalBeds}
          onChange={e => set('totalBeds', e.target.value)}
          placeholder="0"
        />
        <Input
          label={t('hospitals.form.availableBeds')}
          type="number"
          min="0"
          value={form.availableBeds}
          onChange={e => set('availableBeds', e.target.value)}
          placeholder="0"
        />
      </div>

      {form.type === 'PHC' && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">{t('hospitals.form.phcDetails')}</h4>
          <Select
            label={t('hospitals.form.medicalOfficer')}
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            options={[
              { value: '', label: t('hospitals.form.selectMedicalOfficer') },
              ...doctors.map(d => ({ value: d.name, label: `${d.name}${d.specialization ? ` (${d.specialization})` : ''}` })),
            ]}
          />
          <Select
            label={t('hospitals.form.parentChc')}
            value={form.parentCHCId}
            onChange={e => set('parentCHCId', e.target.value)}
            options={[
              { value: '', label: t('hospitals.form.unlinked') },
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
              {t('hospitals.form.ambulanceAvailable')}
            </label>
          </div>
        </div>
      )}

      {form.type === 'CHC' && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">{t('hospitals.form.chcDetails')}</h4>
          <Select
            label={t('hospitals.form.medicalOfficer')}
            value={form.medicalOfficer}
            onChange={e => set('medicalOfficer', e.target.value)}
            options={[
              { value: '', label: t('hospitals.form.selectMedicalOfficer') },
              ...doctors.map(d => ({ value: d.name, label: `${d.name}${d.specialization ? ` (${d.specialization})` : ''}` })),
            ]}
          />
          <MultiSelect
            label={t('hospitals.form.availableSpecialists')}
            options={SPECIALIST_LIST}
            selected={form.specialists}
            onChange={val => set('specialists', val)}
            placeholder={t('hospitals.form.noSpecialists')}
          />
          <div className="space-y-2 mt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{t('hospitals.form.facilitiesAvailable')}</label>
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
                  {t('hospitals.form.ot')}
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
                  {t('hospitals.form.xray')}
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
                  {t('hospitals.form.ambulance')}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{initial ? t('hospitals.form.saveChanges') : t('hospitals.form.addFacility')}</Button>
      </div>
    </form>

    {/* Save/Add Confirmation Modal */}
    <Modal
      open={!!pendingData}
      onClose={() => setPendingData(null)}
      title={initial ? t('hospitals.form.confirmSave') : t('hospitals.form.confirmAdd')}
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
            {initial ? t('hospitals.form.saveTo') : t('hospitals.form.addNew')}
            <span className="text-primary-600 dark:text-primary-400">
              {pendingData?.name || initial?.name}
            </span>
            ?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {initial
              ? t('hospitals.form.updateWarning', { type: initial.type })
              : t('hospitals.form.registerWarning', { type: pendingData?.type })}
          </p>
        </div>
        <div className="flex gap-3 w-full pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPendingData(null)}>
            {t('hospitals.form.goBack')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={confirmSave}>
            {initial ? (
              <>
                <Pencil size={14} /> {t('hospitals.form.yesSave')}
              </>
            ) : (
              <>
                <Plus size={14} /> {t('hospitals.form.yesAdd')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  </>);
}
