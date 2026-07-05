import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Patient, Gender, BloodGroup, PatientDraft, PatientFormValues } from '../../types';
import { Pencil, Plus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { locationApi } from '../../services/locationApi';

interface Props {
  initial: Patient | null;
  onClose: () => void;
}

type RequiredPatientField = Exclude<keyof PatientFormValues, 'bedRequired'>;
type PatientFormErrors = Partial<Record<RequiredPatientField, string>>;
type PatientFormTouched = Partial<Record<RequiredPatientField, boolean>>;

// Bed requirement is a valid false/true choice, so only text/select fields need required checks.
const requiredFields: RequiredPatientField[] = [
  'name',
  'age',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'aadhaarNumber',
  'address',
  'state',
  'city',
  'hospitalId',
];

const bloodGroupOptions: { value: BloodGroup; label: string }[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

function validatePatientForm(form: PatientFormValues, t: any): PatientFormErrors {
  const errors: PatientFormErrors = {};

  requiredFields.forEach(field => {
    const value = form[field];
    if (typeof value === 'string' && value.trim() === '') {
      errors[field] = t('patients.form.fieldRequired', { field: t(`patients.form.labels.${field}`) });
    }
  });

  if (form.age.trim() !== '') {
    const age = Number(form.age);
    if (!Number.isFinite(age) || age <= 0) {
      errors.age = t('patients.form.ageError');
    }
  }

  if (form.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = t('patients.form.emailError');
  }

  if (form.aadhaarNumber.trim() !== '' && !/^\d{12}$/.test(form.aadhaarNumber.trim())) {
    errors.aadhaarNumber = t('patients.form.aadhaarError');
  }

  return errors;
}

export function PatientForm({ initial, onClose }: Props) {
  const { t } = useTranslation();
  const { addPatient, updatePatient, hospitals } = useApp();

  const genderOptions = [
    { value: 'male', label: t('patients.form.genders.male') },
    { value: 'female', label: t('patients.form.genders.female') },
    { value: 'other', label: t('patients.form.genders.other') },
  ];

  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  const [form, setForm] = useState<PatientFormValues>({
    name: initial?.name ?? '',
    age: String(initial?.age ?? ''),
    gender: initial?.gender ?? '',
    bloodGroup: initial?.bloodGroup ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    aadhaarNumber: initial?.aadhaarNumber ?? '',
    address: initial?.address ?? '',
    state: (initial as any)?.stateCode ? String((initial as any).stateCode) : '',
    city: (initial as any)?.cityCode ? String((initial as any).cityCode) : '',
    hospitalId: initial?.hospitalId ?? '',
    bedRequired: initial?.bedRequired ?? false,
  });

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
  const [touched, setTouched] = useState<PatientFormTouched>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingData, setPendingData] = useState<PatientDraft | null>(null);

  const errors = validatePatientForm(form, t);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const set = <K extends keyof PatientFormValues>(key: K, value: PatientFormValues[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const touch = (field: RequiredPatientField) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const errorFor = (field: RequiredPatientField) => (touched[field] ? errors[field] : undefined);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Reveal every missing required field after submit, even if the user never focused it.
    const nextTouched = requiredFields.reduce<PatientFormTouched>(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setTouched(nextTouched);

    if (Object.keys(errors).length > 0) return;

    const data: PatientDraft = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender as Gender,
      bloodGroup: form.bloodGroup as BloodGroup,
      phone: form.phone.trim(),
      email: form.email.trim(),
      aadhaarNumber: form.aadhaarNumber.trim(),
      address: form.address.trim(),
      state: form.state ? Number(form.state) : undefined,
      city: form.city ? Number(form.city) : undefined,
      hospitalId: form.hospitalId,
      bedRequired: form.bedRequired,
    };

    setPendingData(data);
  };

  const confirmSave = async () => {
    if (!pendingData) return;

    try {
      setSaving(true);
      setToast(null);
      if (initial) {
        await updatePatient(initial.id, pendingData);
      } else {
        await addPatient(pendingData);
      }
      setPendingData(null);
      onClose();
    } catch (err) {
      // Backend duplicate Aadhaar conflicts are surfaced here as a toast.
      setToast(err instanceof Error ? err.message : t('patients.form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const hospitalOptions = hospitals.map(h => ({ value: h.id, label: `${h.name} — ${h.city}` }));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {toast && (
          <div className="fixed right-6 top-6 z-[100] max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {toast}
          </div>
        )}

      <Input
        label={t('patients.form.labels.name')}
        required
        value={form.name}
        onChange={e => set('name', e.target.value)}
        onBlur={() => touch('name')}
        error={errorFor('name')}
        placeholder={t('patients.form.placeholders.name')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('patients.form.labels.age')}
          type="number"
          min="0"
          max="150"
          required
          value={form.age}
          onChange={e => set('age', e.target.value)}
          onBlur={() => touch('age')}
          error={errorFor('age')}
          placeholder={t('patients.form.placeholders.age')}
        />
        <Select
          label={t('patients.form.labels.gender')}
          required
          value={form.gender}
          onChange={e => set('gender', e.target.value as PatientFormValues['gender'])}
          onBlur={() => touch('gender')}
          error={errorFor('gender')}
          options={genderOptions}
          placeholder={t('patients.form.placeholders.gender')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('patients.form.labels.bloodGroup')}
          required
          value={form.bloodGroup}
          onChange={e => set('bloodGroup', e.target.value as PatientFormValues['bloodGroup'])}
          onBlur={() => touch('bloodGroup')}
          error={errorFor('bloodGroup')}
          options={bloodGroupOptions}
          placeholder={t('patients.form.placeholders.bloodGroup')}
        />
        <Input
          label={t('patients.form.labels.email')}
          type="email"
          required
          value={form.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => touch('email')}
          error={errorFor('email')}
          placeholder={t('patients.form.placeholders.email')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('patients.form.labels.phone')}
          inputMode="numeric"
          required
          value={form.phone}
          onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
          onBlur={() => touch('phone')}
          error={errorFor('phone')}
          placeholder={t('patients.form.placeholders.phone')}
        />
        <Input
          label={t('patients.form.labels.aadhaarNumber')}
          inputMode="numeric"
          maxLength={12}
          required
          value={form.aadhaarNumber}
          onChange={e => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
          onBlur={() => touch('aadhaarNumber')}
          error={errorFor('aadhaarNumber')}
          placeholder={t('patients.form.placeholders.aadhaarNumber')}
        />
      </div>

      <Select
        label={t('patients.form.labels.hospitalId')}
        required
        value={form.hospitalId}
        onChange={e => set('hospitalId', e.target.value)}
        onBlur={() => touch('hospitalId')}
        error={errorFor('hospitalId')}
        options={hospitalOptions}
        placeholder={t('patients.form.placeholders.hospitalId')}
      />

      <Input
        label={t('patients.form.labels.address')}
        required
        value={form.address}
        onChange={e => set('address', e.target.value)}
        onBlur={() => touch('address')}
        error={errorFor('address')}
        placeholder={t('patients.form.placeholders.address')}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('staff.form.labels.state', 'State')}
          required
          value={form.state}
          onChange={e => handleStateChange(e.target.value)}
          onBlur={() => touch('state')}
          error={errorFor('state')}
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
          onBlur={() => touch('city')}
          error={errorFor('city')}
          options={[
            { value: '', label: '— Select District —' },
            ...districts.map(d => ({ value: String(d.code), label: d.name })),
          ]}
        />
      </div>


        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : initial ? t('common.saveChanges') : t('patients.admitPatient')}
          </Button>
        </div>
      </form>

      <Modal
        open={!!pendingData}
        onClose={() => setPendingData(null)}
        title={initial ? t('hospitals.form.confirmSave') : t('patients.form.confirmAdmit')}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            {initial ? (
              <Pencil size={32} className="text-blue-500 dark:text-blue-400" />
            ) : (
              <UserRound size={32} className="text-primary-500 dark:text-primary-400" />
            )}
          </div>
          <div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
              {initial ? t('hospitals.form.saveTo') : t('patients.form.admitNew')}
              <span className="text-primary-600 dark:text-primary-400">
                {pendingData?.name || initial?.name}
              </span>
              ?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {initial
                ? t('patients.form.updateWarning')
                : t('patients.form.registerWarning')}
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPendingData(null)}>
              {t('hospitals.form.goBack')}
            </Button>
            <Button variant="primary" className="flex-1" onClick={confirmSave} disabled={saving}>
              {initial ? (
                <>
                  <Pencil size={14} /> {saving ? t('common.saving') : t('hospitals.form.yesSave')}
                </>
              ) : (
                <>
                  <Plus size={14} /> {saving ? t('patients.form.admitting') : t('patients.form.yesAdmit')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
