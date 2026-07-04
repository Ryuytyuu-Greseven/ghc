import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { hospitalApi } from '../../services/hospitalApi';
import type { Staff, StaffRole, Department } from '../../types';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Plus } from 'lucide-react';

interface Props {
  initial: Staff | null;
  onClose: () => void;
}

export function StaffForm({ initial, onClose }: Props) {
  const { t } = useTranslation();
  const { addStaff, updateStaff } = useApp();
  const [pendingData, setPendingData] = useState<any | null>(null);

  const roleOptions = [
    { value: 'Doctor', label: t('roles.Doctor') },
    { value: 'Nurse', label: t('roles.Nurse') },
    { value: 'Receptionist', label: t('roles.Receptionist') },
    { value: 'Pharmacist', label: t('roles.Pharmacist') },
    { value: 'Lab Technician', label: t('roles.Lab Technician') },
    { value: 'Compounder', label: t('roles.Compounder') },
    { value: 'Cashier', label: t('roles.Cashier') },
  ];

  const departmentOptions = [
    { value: 'General', label: t('departments.General') },
    { value: 'Cardiology', label: t('departments.Cardiology') },
    { value: 'Orthopedics', label: t('departments.Orthopedics') },
    { value: 'Pediatrics', label: t('departments.Pediatrics') },
    { value: 'Gynecology', label: t('departments.Gynecology') },
    { value: 'Dermatology', label: t('departments.Dermatology') },
    { value: 'Neurology', label: t('departments.Neurology') },
    { value: 'Radiology', label: t('departments.Radiology') },
    { value: 'Laboratory', label: t('departments.Laboratory') },
    { value: 'Pharmacy', label: t('departments.Pharmacy') },
    { value: 'Emergency', label: t('departments.Emergency') },
    { value: 'ICU', label: t('departments.ICU') },
    { value: 'Operation Theatre', label: t('departments.Operation Theatre') },
    { value: 'Administration', label: t('departments.Administration') },
  ];

  const [form, setForm] = useState({
    firstName: initial?.firstName ?? (initial?.name ? initial.name.split(' ')[0] : ''),
    lastName: initial?.lastName ?? (initial?.name ? initial.name.split(' ').slice(1).join(' ') : ''),
    displayName: initial?.displayName ?? '',
    gender: initial?.gender ?? 'Male',
    dateOfBirth: initial?.dateOfBirth ?? '',
    mobileNumber: initial?.mobileNumber ?? initial?.phone ?? '',
    email: initial?.email ?? '',
    role: initial?.role ?? 'Doctor' as StaffRole,
    department: initial?.department ?? 'General' as Department,
    designation: initial?.designation ?? '',
    joiningDate: initial?.joiningDate ?? '',
    employmentType: initial?.employmentType ?? 'Full Time',
    username: initial?.username ?? '',
    password: initial?.password ?? '',
    specialization: initial?.specialization ?? '',
    qualification: initial?.qualification ?? '',
    registrationNumber: initial?.registrationNumber ?? '',
    experience: initial?.experience?.toString() ?? '',
    licenseNumber: initial?.licenseNumber ?? '',
    emergencyContactName: initial?.emergencyContactName ?? '',
    emergencyContactRelationship: initial?.emergencyContactRelationship ?? '',
    emergencyContactMobile: initial?.emergencyContactMobile ?? '',
    addressLine1: initial?.addressLine1 ?? '',
    addressLine2: initial?.addressLine2 ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    pincode: initial?.pincode ?? '',
    assignedHospitalId: initial?.assignedHospitalId ?? '',
    isMedicalIncharge: initial?.isMedicalIncharge ?? false,
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...initial,
      firstName: form.firstName,
      lastName: form.lastName,
      displayName: form.displayName || undefined,
      gender: form.gender as any,
      dateOfBirth: form.dateOfBirth || undefined,
      mobileNumber: form.mobileNumber,
      email: form.email || undefined,
      role: form.role,
      department: form.department,
      designation: form.designation || undefined,
      joiningDate: form.joiningDate || undefined,
      employmentType: form.employmentType as any,
      username: form.username || undefined,
      password: form.password || undefined,
      specialization: form.specialization || undefined,
      qualification: form.qualification || undefined,
      registrationNumber: form.registrationNumber || undefined,
      experience: form.experience ? Number(form.experience) : undefined,
      licenseNumber: form.licenseNumber || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactRelationship: form.emergencyContactRelationship || undefined,
      emergencyContactMobile: form.emergencyContactMobile || undefined,
      addressLine1: form.addressLine1 || undefined,
      addressLine2: form.addressLine2 || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      assignedHospitalId: form.assignedHospitalId || null,
      isMedicalIncharge: form.isMedicalIncharge,

      // Backward compatibility fields
      name: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.mobileNumber,
    };
    setPendingData(data);
  };

  const confirmSave = () => {
    if (!pendingData) return;
    if (initial) {
      updateStaff(initial.id, pendingData);
    } else {
      addStaff(pendingData);
    }
    setPendingData(null);
    onClose();
  };

  const [facilities, setFacilities] = useState<any[]>([]);

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const data = await hospitalApi.getHospitals();
        const list = Array.isArray(data) ? data : (data && Array.isArray((data as any).data) ? (data as any).data : []);
        setFacilities(list);
      } catch (err) {
        console.error('Failed to fetch facilities:', err);
      }
    }
    fetchFacilities();
  }, []);

  const uniqueFacilities = facilities.filter((h, idx, self) => {
    const key = h.hospitalId || h._id || h.id || '';
    return self.findIndex(x => (x.hospitalId || x._id || x.id || '') === key) === idx;
  });

  const hospitalOptions = uniqueFacilities.map(h => ({
    value: h.hospitalId ?? h._id ?? h.id ?? '',
    label: `${h.name} (${h.city})`,
  }));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Personal & Contact Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.personalDetails')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('staff.form.labels.firstName')}
              required
              value={form.firstName}
              onChange={e => set('firstName', e.target.value)}
              placeholder={t('staff.form.placeholders.firstName')}
            />
            <Input
              label={t('staff.form.labels.lastName')}
              required
              value={form.lastName}
              onChange={e => set('lastName', e.target.value)}
              placeholder={t('staff.form.placeholders.lastName')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('staff.form.labels.displayName')}
              value={form.displayName}
              onChange={e => set('displayName', e.target.value)}
              placeholder={t('staff.form.placeholders.displayName')}
            />
            <Select
              label={t('staff.form.labels.gender')}
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              options={[
                { value: 'Male', label: t('staff.form.genders.Male') },
                { value: 'Female', label: t('staff.form.genders.Female') },
                { value: 'Other', label: t('staff.form.genders.Other') },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('staff.form.labels.dateOfBirth')}
              type="date"
              value={form.dateOfBirth}
              onChange={e => set('dateOfBirth', e.target.value)}
            />
            <Input
              label={t('staff.form.labels.mobileNumber')}
              required
              value={form.mobileNumber}
              onChange={e => set('mobileNumber', e.target.value)}
              placeholder={t('staff.form.placeholders.mobileNumber')}
            />
          </div>

          <Input
            label={t('staff.form.labels.email')}
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder={t('staff.form.placeholders.email')}
          />
        </div>

        {/* 2. Employment & Facility */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.employmentDetails')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('staff.form.labels.role')}
              value={form.role}
              onChange={e => set('role', e.target.value)}
              options={roleOptions}
            />
            <Select
              label={t('staff.form.labels.department')}
              value={form.department}
              onChange={e => set('department', e.target.value)}
              options={departmentOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('staff.form.labels.designation')}
              value={form.designation}
              onChange={e => set('designation', e.target.value)}
              placeholder={t('staff.form.placeholders.designation')}
            />
            <Input
              label={t('staff.form.labels.joiningDate')}
              type="date"
              value={form.joiningDate}
              onChange={e => set('joiningDate', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('staff.form.labels.employmentType')}
              value={form.employmentType}
              onChange={e => set('employmentType', e.target.value)}
              options={[
                { value: 'Full Time', label: t('staff.form.employmentTypes.fullTime') },
                { value: 'Part Time', label: t('staff.form.employmentTypes.partTime') },
                { value: 'Visiting', label: t('staff.form.employmentTypes.visiting') },
              ]}
            />
            <Select
              label={t('staff.form.labels.assignedHospitalId')}
              value={form.assignedHospitalId}
              onChange={e => set('assignedHospitalId', e.target.value)}
              placeholder={t('staff.form.placeholders.leaveUnassigned')}
              options={hospitalOptions}
            />
          </div>

          {(form.role === 'Doctor' || form.role === 'Nurse') && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMedicalIncharge}
                onChange={e => setForm(f => ({ ...f, isMedicalIncharge: e.target.checked }))}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              {t('staff.form.nominateMedicalIncharge')}
            </label>
          )}
        </div>

        {/* 3. Address Details */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.addressDetails')}</h3>

          <Input
            label={t('staff.form.labels.addressLine1')}
            value={form.addressLine1}
            onChange={e => set('addressLine1', e.target.value)}
            placeholder={t('staff.form.placeholders.addressLine1')}
          />
          <Input
            label={t('staff.form.labels.addressLine2')}
            value={form.addressLine2}
            onChange={e => set('addressLine2', e.target.value)}
            placeholder={t('staff.form.placeholders.addressLine2')}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('staff.form.labels.city')}
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder={t('staff.form.placeholders.city')}
            />
            <Input
              label={t('staff.form.labels.state')}
              value={form.state}
              onChange={e => set('state', e.target.value)}
              placeholder={t('staff.form.placeholders.state')}
            />
            <Input
              label={t('staff.form.labels.pincode')}
              value={form.pincode}
              onChange={e => set('pincode', e.target.value)}
              placeholder={t('staff.form.placeholders.pincode')}
            />
          </div>
        </div>

        {/* 4. Role-Specific Details */}
        {(form.role === 'Doctor' || form.role === 'Nurse' || form.role === 'Lab Technician' || form.role === 'Pharmacist') && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.roleSpecificDetails')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('staff.form.labels.specialization')}
                value={form.specialization}
                onChange={e => set('specialization', e.target.value)}
                placeholder={t('staff.form.placeholders.specialization')}
              />
              <Input
                label={t('staff.form.labels.qualification')}
                value={form.qualification}
                onChange={e => set('qualification', e.target.value)}
                placeholder={t('staff.form.placeholders.qualification')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('staff.form.labels.registrationNumber')}
                value={form.registrationNumber}
                onChange={e => set('registrationNumber', e.target.value)}
                placeholder={t('staff.form.placeholders.registrationNumber')}
              />
              <Input
                label={t('staff.form.labels.experience')}
                type="number"
                value={form.experience}
                onChange={e => set('experience', e.target.value)}
                placeholder={t('staff.form.placeholders.experience')}
              />
              <Input
                label={t('staff.form.labels.licenseNumber')}
                value={form.licenseNumber}
                onChange={e => set('licenseNumber', e.target.value)}
                placeholder={t('staff.form.placeholders.licenseNumber')}
              />
            </div>
          </div>
        )}

        {/* 5. Emergency Contact Info */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.emergencyContactInfo')}</h3>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('staff.form.labels.contactName')}
              value={form.emergencyContactName}
              onChange={e => set('emergencyContactName', e.target.value)}
              placeholder={t('staff.form.placeholders.contactName')}
            />
            <Input
              label={t('staff.form.labels.relationship')}
              value={form.emergencyContactRelationship}
              onChange={e => set('emergencyContactRelationship', e.target.value)}
              placeholder={t('staff.form.placeholders.relationship')}
            />
            <Input
              label={t('staff.form.labels.mobileNumber')}
              value={form.emergencyContactMobile}
              onChange={e => set('emergencyContactMobile', e.target.value)}
              placeholder={t('staff.form.placeholders.mobileNumber')}
            />
          </div>
        </div>

        {/* 6. Account Credentials */}
        {!initial && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.accountCredentials')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('staff.form.labels.username')}
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder={t('staff.form.placeholders.username')}
              />
              <Input
                label={t('staff.form.labels.password')}
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit">{initial ? t('common.saveChanges') : t('staff.addStaff')}</Button>
        </div>
      </form>

      <Modal
        open={!!pendingData}
        onClose={() => setPendingData(null)}
        title={initial ? t('hospitals.form.confirmSave') : t('staff.form.confirmAdd', 'Confirm Add Staff')}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            {initial ? (
              <Pencil size={32} className="text-blue-500 dark:text-blue-400" />
            ) : (
              <Plus size={32} className="text-primary-500 dark:text-primary-400" />
            )}
          </div>
          <div>
            <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
              {initial ? t('hospitals.form.saveTo') : t('staff.form.addNew', 'Add new staff ')}
              <span className="text-primary-600 dark:text-primary-400">
                {pendingData?.name || `${form.firstName} ${form.lastName}`.trim()}
              </span>
              ?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {initial
                ? t('staff.form.updateWarning', 'This will update the staff profile in the database.')
                : t('staff.form.registerWarning', 'This will register the new staff member.')}
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setPendingData(null)}>
              {t('hospitals.form.goBack')}
            </Button>
            <Button variant="primary" className="flex-1" type="button" onClick={confirmSave}>
              {initial ? (
                <>
                  <Pencil size={14} /> {t('hospitals.form.yesSave')}
                </>
              ) : (
                <>
                  <Plus size={14} /> {t('staff.form.yesAdd', 'Yes, Add')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
