import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Patient, Gender, BloodGroup, PatientDraft, PatientFormValues } from '../../types';

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
  'address',
  'hospitalId',
  'condition',
];

// Keep labels centralized so inline validation messages match the visible form labels.
const fieldLabels: Record<RequiredPatientField, string> = {
  name: 'Patient full name',
  age: 'Age',
  gender: 'Gender',
  bloodGroup: 'Blood group',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  hospitalId: 'Facility',
  condition: 'Condition / reason for visit',
};

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
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

function validatePatientForm(form: PatientFormValues): PatientFormErrors {
  const errors: PatientFormErrors = {};

  // Empty select values are intentional so new onboarding does not preselect a blood group.
  requiredFields.forEach(field => {
    const value = form[field];
    if (typeof value === 'string' && value.trim() === '') {
      errors[field] = `${fieldLabels[field]} is required`;
    }
  });

  if (form.age.trim() !== '') {
    const age = Number(form.age);
    if (!Number.isFinite(age) || age <= 0) {
      errors.age = 'Age must be greater than 0';
    }
  }

  if (form.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  return errors;
}

export function PatientForm({ initial, onClose }: Props) {
  const { addPatient, updatePatient, hospitals } = useApp();

  const [form, setForm] = useState<PatientFormValues>({
    name: initial?.name ?? '',
    age: String(initial?.age ?? ''),
    gender: initial?.gender ?? '',
    bloodGroup: initial?.bloodGroup ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    hospitalId: initial?.hospitalId ?? '',
    condition: initial?.condition ?? '',
    bedRequired: initial?.bedRequired ?? false,
  });
  const [touched, setTouched] = useState<PatientFormTouched>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const errors = validatePatientForm(form);

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
      address: form.address.trim(),
      hospitalId: form.hospitalId,
      condition: form.condition.trim(),
      bedRequired: form.bedRequired,
    };

    try {
      setSaving(true);
      setToast(null);
      if (initial) {
        await updatePatient(initial.id, data);
      } else {
        await addPatient(data);
      }
      onClose();
    } catch (err) {
      // Backend duplicate email/phone conflicts are surfaced here as a toast.
      setToast(err instanceof Error ? err.message : 'Unable to save patient');
    } finally {
      setSaving(false);
    }
  };

  const hospitalOptions = hospitals.map(h => ({ value: h.id, label: `${h.name} — ${h.city}` }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {toast && (
        <div className="fixed right-6 top-6 z-[100] max-w-sm rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {toast}
        </div>
      )}

      <Input
        label="Patient Full Name"
        required
        value={form.name}
        onChange={e => set('name', e.target.value)}
        onBlur={() => touch('name')}
        error={errorFor('name')}
        placeholder="e.g. Kavitha Nair"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Age"
          type="number"
          min="0"
          max="150"
          required
          value={form.age}
          onChange={e => set('age', e.target.value)}
          onBlur={() => touch('age')}
          error={errorFor('age')}
          placeholder="Age in years"
        />
        <Select
          label="Gender"
          required
          value={form.gender}
          onChange={e => set('gender', e.target.value as PatientFormValues['gender'])}
          onBlur={() => touch('gender')}
          error={errorFor('gender')}
          options={genderOptions}
          placeholder="— Select gender —"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Blood Group"
          required
          value={form.bloodGroup}
          onChange={e => set('bloodGroup', e.target.value as PatientFormValues['bloodGroup'])}
          onBlur={() => touch('bloodGroup')}
          error={errorFor('bloodGroup')}
          options={bloodGroupOptions}
          placeholder="— Select blood group —"
        />
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={e => set('email', e.target.value)}
          onBlur={() => touch('email')}
          error={errorFor('email')}
          placeholder="patient@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone"
          required
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          onBlur={() => touch('phone')}
          error={errorFor('phone')}
          placeholder="+91 99000 00000"
        />
        <Select
          label="Assign to Facility"
          required
          value={form.hospitalId}
          onChange={e => set('hospitalId', e.target.value)}
          onBlur={() => touch('hospitalId')}
          error={errorFor('hospitalId')}
          options={hospitalOptions}
          placeholder="— Select facility —"
        />
      </div>

      <Input
        label="Address"
        required
        value={form.address}
        onChange={e => set('address', e.target.value)}
        onBlur={() => touch('address')}
        error={errorFor('address')}
        placeholder="Home address"
      />
      <Input
        label="Condition / Reason for Visit"
        required
        value={form.condition}
        onChange={e => set('condition', e.target.value)}
        onBlur={() => touch('condition')}
        error={errorFor('condition')}
        placeholder="e.g. Cardiac monitoring"
      />

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
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Save Changes' : 'Onboard Patient'}</Button>
      </div>
    </form>
  );
}
