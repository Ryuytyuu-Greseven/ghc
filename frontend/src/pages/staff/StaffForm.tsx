import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { hospitalApi } from '../../services/hospitalApi';
import type { Staff, StaffRole, Department } from '../../types';

interface Props {
  initial: Staff | null;
  onClose: () => void;
}

export function StaffForm({ initial, onClose }: Props) {
  const { t } = useTranslation();
  const { addStaff, updateStaff } = useApp();

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
    if (initial) {
      updateStaff(initial.id, data);
    } else {
      addStaff(data);
    }
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Personal & Contact Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionPersonal')}</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('staff.form.firstName')}
            required
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            placeholder={t('staff.form.firstNamePlaceholder')}
          />
          <Input
            label={t('staff.form.lastName')}
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            placeholder={t('staff.form.lastNamePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('staff.form.displayName')}
            value={form.displayName}
            onChange={e => set('displayName', e.target.value)}
            placeholder={t('staff.form.displayNamePlaceholder')}
          />
          <Select
            label={t('staff.form.gender')}
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
            options={[
              { value: 'Male', label: t('staff.form.genderMale') },
              { value: 'Female', label: t('staff.form.genderFemale') },
              { value: 'Other', label: t('staff.form.genderOther') },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('staff.form.dateOfBirth')}
            type="date"
            value={form.dateOfBirth}
            onChange={e => set('dateOfBirth', e.target.value)}
          />
          <Input
            label={t('staff.form.mobileNumber')}
            required
            value={form.mobileNumber}
            onChange={e => set('mobileNumber', e.target.value)}
            placeholder={t('staff.form.mobilePlaceholder')}
          />
        </div>

        <Input
          label={t('staff.form.email')}
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder={t('staff.form.emailPlaceholder')}
        />
      </div>

      {/* 2. Employment & Facility Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionEmployment')}</h3>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('staff.form.role')}
            value={form.role}
            onChange={e => set('role', e.target.value)}
            options={roleOptions}
          />
          <Select
            label={t('staff.form.department')}
            value={form.department}
            onChange={e => set('department', e.target.value)}
            options={departmentOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('staff.form.designation')}
            value={form.designation}
            onChange={e => set('designation', e.target.value)}
            placeholder={t('staff.form.designationPlaceholder')}
          />
          <Input
            label={t('staff.form.joiningDate')}
            type="date"
            value={form.joiningDate}
            onChange={e => set('joiningDate', e.target.value)}
          />
        </div>

        <Select
          label={t('staff.form.employmentType')}
          value={form.employmentType}
          onChange={e => set('employmentType', e.target.value)}
          options={[
            { value: 'Full Time', label: t('staff.form.empFullTime') },
            { value: 'Part Time', label: t('staff.form.empPartTime') },
            { value: 'Visiting', label: t('staff.form.empVisiting') },
          ]}
        />

        <Select
          label={t('staff.form.assignToFacility')}
          value={form.assignedHospitalId}
          onChange={e => set('assignedHospitalId', e.target.value)}
          options={hospitalOptions}
          placeholder={t('staff.form.leaveUnassigned')}
        />

        <div className="flex items-center gap-2 mt-2">
          <input
            id="isMedicalIncharge"
            type="checkbox"
            checked={form.isMedicalIncharge}
            onChange={e => setForm(f => ({ ...f, isMedicalIncharge: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="isMedicalIncharge" className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer">
            {t('staff.form.nominateIncharge')}
          </label>
        </div>
      </div>

      {/* 3. Address Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionAddress')}</h3>

        <Input
          label={t('staff.form.address1')}
          value={form.addressLine1}
          onChange={e => set('addressLine1', e.target.value)}
          placeholder={t('staff.form.address1Placeholder')}
        />
        <Input
          label={t('staff.form.address2')}
          value={form.addressLine2}
          onChange={e => set('addressLine2', e.target.value)}
          placeholder={t('staff.form.address2Placeholder')}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label={t('staff.form.city')}
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder={t('staff.form.cityPlaceholder')}
          />
          <Input
            label={t('staff.form.state')}
            value={form.state}
            onChange={e => set('state', e.target.value)}
            placeholder={t('staff.form.statePlaceholder')}
          />
          <Input
            label={t('staff.form.pincode')}
            value={form.pincode}
            onChange={e => set('pincode', e.target.value)}
            placeholder={t('staff.form.pincodePlaceholder')}
          />
        </div>
      </div>

      {/* 4. Role-Specific Details (Conditional) */}
      {(form.role === 'Doctor' || form.role === 'Pharmacist') && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionRoleSpecific')}</h3>

          {form.role === 'Doctor' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('staff.form.specialization')}
                  value={form.specialization}
                  onChange={e => set('specialization', e.target.value)}
                  placeholder={t('staff.form.specializationPlaceholder')}
                />
                <Input
                  label={t('staff.form.qualification')}
                  value={form.qualification}
                  onChange={e => set('qualification', e.target.value)}
                  placeholder={t('staff.form.qualificationPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('staff.form.registrationNumber')}
                  value={form.registrationNumber}
                  onChange={e => set('registrationNumber', e.target.value)}
                  placeholder={t('staff.form.registrationNumberPlaceholder')}
                />
                <Input
                  label={t('staff.form.experience')}
                  type="number"
                  value={form.experience}
                  onChange={e => set('experience', e.target.value)}
                  placeholder={t('staff.form.experiencePlaceholder')}
                />
              </div>
            </div>
          )}

          {form.role === 'Pharmacist' && (
            <Input
              label={t('staff.form.licenseNumber')}
              value={form.licenseNumber}
              onChange={e => set('licenseNumber', e.target.value)}
              placeholder={t('staff.form.licenseNumberPlaceholder')}
            />
          )}
        </div>
      )}

      {/* 5. Emergency Contact Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionEmergency')}</h3>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label={t('staff.form.contactName')}
            value={form.emergencyContactName}
            onChange={e => set('emergencyContactName', e.target.value)}
            placeholder={t('staff.form.contactNamePlaceholder')}
          />
          <Input
            label={t('staff.form.relationship')}
            value={form.emergencyContactRelationship}
            onChange={e => set('emergencyContactRelationship', e.target.value)}
            placeholder={t('staff.form.relationshipPlaceholder')}
          />
          <Input
            label={t('staff.form.mobileNumber')}
            value={form.emergencyContactMobile}
            onChange={e => set('emergencyContactMobile', e.target.value)}
            placeholder={t('staff.form.emergencyMobilePlaceholder')}
          />
        </div>
      </div>

      {/* 6. Account Credentials */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('staff.form.sectionCredentials')}</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('staff.form.username')}
            value={form.username}
            onChange={e => set('username', e.target.value)}
            placeholder={t('staff.form.usernamePlaceholder')}
          />
          <Input
            label={t('staff.form.password')}
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder={t('staff.form.passwordPlaceholder')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit">{initial ? t('staff.form.saveChanges') : t('staff.form.addStaff')}</Button>
      </div>
    </form>
  );
}
