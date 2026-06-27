import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Staff, StaffRole, Department } from '../../types';

const roleOptions = [
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Nurse', label: 'Nurse' },
  { value: 'Receptionist', label: 'Receptionist' },
  { value: 'Pharmacist', label: 'Pharmacist' },
  { value: 'Lab Technician', label: 'Lab Technician' },
  { value: 'Compounder', label: 'Compounder' },
  { value: 'Cashier', label: 'Cashier' },
];

const departmentOptions = [
  { value: 'General', label: 'General' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Gynecology', label: 'Gynecology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Radiology', label: 'Radiology' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'ICU', label: 'ICU' },
  { value: 'Operation Theatre', label: 'Operation Theatre' },
  { value: 'Administration', label: 'Administration' },
];

interface Props {
  initial: Staff | null;
  onClose: () => void;
}

export function StaffForm({ initial, onClose }: Props) {
  const { addStaff, updateStaff } = useApp();

  const [form, setForm] = useState({
    employeeId: initial?.employeeId ?? '',
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
      employeeId: form.employeeId,
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
        const res = await fetch('http://localhost:3000/hospitals');
        const data = await res.json();
        setFacilities(data);
      } catch (err) {
        console.error('Failed to fetch facilities:', err);
      }
    }
    fetchFacilities();
  }, []);

  const hospitalOptions = facilities.map(h => ({
    value: h._id ?? h.id,
    label: `${h.name} (${h.city})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Personal & Contact Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">1. Personal & Contact Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            placeholder="e.g. Priya"
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            placeholder="e.g. Sharma"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={e => set('displayName', e.target.value)}
            placeholder="e.g. Dr. Priya"
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={e => set('gender', e.target.value)}
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={e => set('dateOfBirth', e.target.value)}
          />
          <Input
            label="Mobile Number"
            required
            value={form.mobileNumber}
            onChange={e => set('mobileNumber', e.target.value)}
            placeholder="e.g. +91 98000 00000"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="name@ghc.health"
        />
      </div>

      {/* 2. Employment & Facility Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">2. Employment & Facility</h3>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            value={form.role}
            onChange={e => set('role', e.target.value)}
            options={roleOptions}
          />
          <Select
            label="Department"
            value={form.department}
            onChange={e => set('department', e.target.value)}
            options={departmentOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Designation"
            value={form.designation}
            onChange={e => set('designation', e.target.value)}
            placeholder="e.g. Senior Cardiologist"
          />
          <Input
            label="Joining Date"
            type="date"
            value={form.joiningDate}
            onChange={e => set('joiningDate', e.target.value)}
          />
        </div>

        <Select
          label="Employment Type"
          value={form.employmentType}
          onChange={e => set('employmentType', e.target.value)}
          options={[
            { value: 'Full Time', label: 'Full Time' },
            { value: 'Part Time', label: 'Part Time' },
            { value: 'Visiting', label: 'Visiting' },
          ]}
        />

        <Select
          label="Assign to Facility"
          value={form.assignedHospitalId}
          onChange={e => set('assignedHospitalId', e.target.value)}
          options={hospitalOptions}
          placeholder="— Leave unassigned —"
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
            Nominate as medical incharge
          </label>
        </div>
      </div>

      {/* 3. Address Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">3. Address Details</h3>

        <Input
          label="Address Line 1"
          value={form.addressLine1}
          onChange={e => set('addressLine1', e.target.value)}
          placeholder="Street address, P.O. box, company name"
        />
        <Input
          label="Address Line 2"
          value={form.addressLine2}
          onChange={e => set('addressLine2', e.target.value)}
          placeholder="Apartment, suite, unit, building, floor, etc."
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="City"
          />
          <Input
            label="State"
            value={form.state}
            onChange={e => set('state', e.target.value)}
            placeholder="State"
          />
          <Input
            label="Pincode"
            value={form.pincode}
            onChange={e => set('pincode', e.target.value)}
            placeholder="Pincode"
          />
        </div>
      </div>

      {/* 4. Role-Specific Details (Conditional) */}
      {(form.role === 'Doctor' || form.role === 'Pharmacist') && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">4. Role-Specific Details</h3>

          {form.role === 'Doctor' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Specialization"
                  value={form.specialization}
                  onChange={e => set('specialization', e.target.value)}
                  placeholder="e.g. Cardiology"
                />
                <Input
                  label="Qualification"
                  value={form.qualification}
                  onChange={e => set('qualification', e.target.value)}
                  placeholder="e.g. MBBS, MD"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Registration Number"
                  value={form.registrationNumber}
                  onChange={e => set('registrationNumber', e.target.value)}
                  placeholder="e.g. REG12345"
                />
                <Input
                  label="Experience (Years)"
                  type="number"
                  value={form.experience}
                  onChange={e => set('experience', e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
            </div>
          )}

          {form.role === 'Pharmacist' && (
            <Input
              label="License Number"
              value={form.licenseNumber}
              onChange={e => set('licenseNumber', e.target.value)}
              placeholder="e.g. LIC98765"
            />
          )}
        </div>
      )}

      {/* 5. Emergency Contact Details */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">5. Emergency Contact Info</h3>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Contact Name"
            value={form.emergencyContactName}
            onChange={e => set('emergencyContactName', e.target.value)}
            placeholder="Name"
          />
          <Input
            label="Relationship"
            value={form.emergencyContactRelationship}
            onChange={e => set('emergencyContactRelationship', e.target.value)}
            placeholder="Relationship"
          />
          <Input
            label="Mobile Number"
            value={form.emergencyContactMobile}
            onChange={e => set('emergencyContactMobile', e.target.value)}
            placeholder="Mobile number"
          />
        </div>
      </div>

      {/* 6. Account Credentials */}
      <div className="space-y-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">6. Account Credentials</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username"
            value={form.username}
            onChange={e => set('username', e.target.value)}
            placeholder="e.g. priya.sharma"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add Staff'}</Button>
      </div>
    </form>
  );
}
