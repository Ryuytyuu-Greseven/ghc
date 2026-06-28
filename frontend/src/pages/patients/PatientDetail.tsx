import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Pill, Plus, UserRound } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { authFetch, useApp } from '../../context/AppContext';
import type { PatientData } from '../../types';

const API_BASE = 'http://localhost:3000';

const categoryOptions = [
  { id: '-1', value: 'Medicine', label: 'Medicine' },
  { id: '-2', value: 'Equipment', label: 'Equipment' },
  { id: '-3', value: 'Consumable', label: 'Consumable' },
  { id: '-4', value: 'Surgical', label: 'Surgical' },
  { id: '-5', value: 'Diagnostic', label: 'Diagnostic' },
  { id: '-6', value: 'Other', label: 'Other' },
];

const categorySelectOptions = categoryOptions.map(category => ({
  value: category.id,
  label: category.label,
}));

function getCategoryByIdOrValue(category: string) {
  return categoryOptions.find(option => option.id === category)
    ?? categoryOptions.find(option => option.value === category)
    ?? null;
}

function getCategoryId(category: string) {
  return getCategoryByIdOrValue(category)?.id ?? category;
}

function getCategoryLabel(category: string) {
  return getCategoryByIdOrValue(category)?.label ?? category;
}

function mapPatientDataFromBackend(item: any): PatientData {
  return {
    id: item._id ?? item.id ?? '',
    patientId: item.patientId?._id ?? item.patientId ?? '',
    problem: item.problem ?? '',
    visitDate: item.visitDate ? new Date(item.visitDate).toISOString().split('T')[0] : '',
    category: item.category ? getCategoryId(item.category) : '',
    medicines: item.medicines ?? [],
    doctor: item.doctor ?? '',
    notes: item.notes ?? '',
  };
}

function getVisitOrdinal(index: number) {
  const labels = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  return labels[index] ?? `${index + 1}th`;
}

function PatientDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Loading..." subtitle="Loading patient visit history" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5 animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-700/70" />
                  </div>
                  <div className="h-7 w-28 rounded-full bg-slate-100 dark:bg-slate-700/70" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-700/70" />
                      <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  ))}
                </div>
              </div>
              <VisitHistorySkeleton />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 h-80 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-700/70" />
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-700/70" />
                  <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitHistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section
          key={sectionIndex}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-700">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {Array.from({ length: 2 }).map((_, visitIndex) => (
              <div key={visitIndex} className="p-5 space-y-3">
                <div className="h-4 w-52 rounded bg-slate-100 dark:bg-slate-700/70" />
                <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-700/70" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PatientDetail() {
  const { id } = useParams();
  const { patients, loading: appLoading } = useApp();
  const patient = patients.find(p => p.id === id);
  const [history, setHistory] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicineVisit, setMedicineVisit] = useState<PatientData | null>(null);
  const [medicineDrafts, setMedicineDrafts] = useState<
    Record<string, { category: string; medicines: string[]; notes: string }>
  >({});
  const [medicineOptions, setMedicineOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [form, setForm] = useState({
    problem: '',
    visitDate: new Date().toISOString().split('T')[0],
    doctor: '',
  });
  const [visitTouched, setVisitTouched] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadHistory() {
      try {
        setLoading(true);
        const res = await authFetch(`${API_BASE}/patient-data/by-patient/${id}`);
        if (!res.ok) throw new Error('Failed to load patient history');
        const data = await res.json();
        setHistory(data.map(mapPatientDataFromBackend));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient history');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [id]);

  useEffect(() => {
    if (!form.visitDate) {
      setDoctorOptions([]);
      return;
    }

    let active = true;
    async function loadAvailableDoctors() {
      try {
        setLoadingDoctors(true);
        const res = await authFetch(`${API_BASE}/staff/available-doctors?date=${encodeURIComponent(form.visitDate)}`);
        if (!res.ok) throw new Error('Failed to load available doctors');
        const data = await res.json();
        if (!active) return;

        const options = (Array.isArray(data) ? data : [])
          .map((doctor: any) => {
            const label = doctor.doctorName ?? doctor.displayName ?? doctor.name ?? '';
            return { value: label, label };
          })
          .filter(option => option.value);

        setDoctorOptions(options);
        setForm(current => (
          current.doctor && !options.some(option => option.value === current.doctor)
            ? { ...current, doctor: '' }
            : current
        ));
      } catch (err) {
        if (!active) return;
        setDoctorOptions([]);
        setError(err instanceof Error ? err.message : 'Failed to load available doctors');
      } finally {
        if (active) setLoadingDoctors(false);
      }
    }

    loadAvailableDoctors();
    return () => {
      active = false;
    };
  }, [form.visitDate]);

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, PatientData[]>();
    history.forEach(item => {
      const key = item.problem.trim() || 'General Visit';
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries())
      .map(([problem, visits]) => {
        const sortedVisits = [...visits].sort(
          (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        );
        const firstVisitTime = Math.min(
          ...sortedVisits.map(visit => new Date(visit.visitDate).getTime())
        );

        return { problem, visits: sortedVisits, firstVisitTime };
      })
      .sort((a, b) => a.firstVisitTime - b.firstVisitTime);
  }, [history]);

  const getMedicineDraft = (visit: PatientData) =>
    medicineDrafts[visit.id] ?? {
      category: getCategoryId(visit.category ?? ''),
      medicines: visit.medicines ?? [],
      notes: visit.notes ?? '',
    };

  const loadMedicinesForCategory = async (categoryId: string) => {
    const category = getCategoryByIdOrValue(categoryId);
    if (!category) {
      setMedicineOptions([]);
      return;
    }

    try {
      setLoadingMedicines(true);
      const res = await authFetch(`${API_BASE}/inventory-master/category/${encodeURIComponent(category.value)}`);
      if (!res.ok) throw new Error('Failed to load medicines');
      const data = await res.json();
      setMedicineOptions(
        (Array.isArray(data) ? data : [])
          .map((item: any) => {
            const name = item.itemName ?? item.name ?? '';
            return { value: name, label: name };
          })
          .filter(option => option.value)
      );
    } catch (err) {
      setMedicineOptions([]);
      setError(err instanceof Error ? err.message : 'Failed to load medicines');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const openMedicineModal = (visit: PatientData) => {
    const category = getCategoryId(visit.category ?? '');
    setMedicineVisit(visit);
    setMedicineDrafts(current => ({
      ...current,
      [visit.id]: current[visit.id] ?? {
        category,
        medicines: visit.medicines ?? [],
        notes: visit.notes ?? '',
      },
    }));
    void loadMedicinesForCategory(category);
  };

  const setMedicineDraft = (
    visitId: string,
    next: Partial<{ category: string; medicines: string[]; notes: string }>
  ) => {
    setMedicineDrafts(current => ({
      ...current,
      [visitId]: {
        category: current[visitId]?.category ?? '',
        medicines: current[visitId]?.medicines ?? [],
        notes: current[visitId]?.notes ?? '',
        ...next,
      },
    }));
  };

  const toggleMedicine = (visitId: string, medicine: string) => {
    const current = medicineDrafts[visitId] ?? { category: '', medicines: [], notes: '' };
    setMedicineDraft(visitId, {
      medicines: current.medicines.includes(medicine)
        ? current.medicines.filter(item => item !== medicine)
        : [...current.medicines, medicine],
    });
  };

  const saveMedicineDetails = async (visit: PatientData) => {
    const draft = getMedicineDraft(visit);
    setError('');

    try {
      const res = await authFetch(`${API_BASE}/patient-data/${visit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: draft.category,
          medicines: draft.medicines,
          notes: draft.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to save medicine details');
      const updated = mapPatientDataFromBackend(await res.json());
      setHistory(current => current.map(item => (item.id === updated.id ? updated : item)));
      setMedicineVisit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medicine details');
    }
  };

  const handleMedicineCategoryChange = (visitId: string, category: string) => {
    setMedicineDraft(visitId, {
      category,
      medicines: [],
    });
    void loadMedicinesForCategory(category);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setError('');
    setVisitTouched(true);

    if (!form.problem.trim() || !form.visitDate || !form.doctor.trim()) {
      setError('Problem, visit date, and doctor are required to save a visit.');
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/patient-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: id,
          problem: form.problem,
          visitDate: form.visitDate,
          doctor: form.doctor,
        }),
      });

      if (!res.ok) throw new Error('Failed to save patient visit');
      const created = mapPatientDataFromBackend(await res.json());
      setHistory(current => [created, ...current]);
      setForm({
        problem: '',
        visitDate: new Date().toISOString().split('T')[0],
        doctor: '',
      });
      setVisitTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save patient visit');
    }
  };

  if (appLoading && !patient) {
    return <PatientDetailSkeleton />;
  }

  if (!patient) {
    return (
      <div className="p-8">
        <Link to="/patients" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          Back to patients
        </Link>
        <div className="mt-16 text-center text-slate-400">
          <UserRound size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Patient not found</p>
        </div>
      </div>
    );
  }

  const medicineDraft = medicineVisit ? getMedicineDraft(medicineVisit) : null;

  return (
    <>
      <div className="flex flex-col h-full">
        <Header title={patient.name} subtitle="Patient visit history and prescribed medicines" />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
          <div className="max-w-screen-2xl mx-auto space-y-5">
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600"
            >
              <ArrowLeft size={16} /> Back to patients
            </Link>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{patient.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {patient.age} yrs · {patient.gender} · {patient.bloodGroup}
                    </p>
                  </div>
                  <Badge variant={patient.bedRequired ? 'danger' : 'success'}>
                    {patient.bedRequired ? 'Bed Allocated' : 'No Bed Needed'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-sm">
                  <div>
                    <p className="text-slate-400">Phone</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{patient.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Aadhaar</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{patient.aadhaarNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Admitted</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{patient.admittedAt}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {loading ? (
                  <VisitHistorySkeleton />
                ) : groupedHistory.length > 0 ? (
                  groupedHistory.map((group, index) => {
                    return (
                      <section
                        key={group.problem}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                            {getVisitOrdinal(index)} Visit ({group.problem})
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {group.visits.length > 0 ? (
                            group.visits.map(visit => {
                              return (
                                <div key={visit.id} className="p-5 space-y-4">
                                  <button
                                    type="button"
                                    onClick={() => openMedicineModal(visit)}
                                    className="w-full text-left space-y-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                                  >
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                      <CalendarDays size={15} />
                                      <span className="tabular-nums">{visit.visitDate}</span>
                                      {visit.doctor && <span>· {visit.doctor}</span>}
                                    </div>
                                    <div className="flex items-start gap-2 text-sm">
                                      <Pill size={15} className="text-primary-500 mt-0.5" />
                                      <div>
                                        <p className="font-medium text-slate-700 dark:text-slate-200">
                                          {visit.category ? getCategoryLabel(visit.category) : 'Medicine details pending'}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400">
                                          {visit.medicines.length > 0 ? visit.medicines.join(', ') : 'Click to add medicines'}
                                        </p>
                                      </div>
                                    </div>
                                    {visit.notes && (
                                      <p className="text-sm text-slate-500 dark:text-slate-400">{visit.notes}</p>
                                    )}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-5 text-sm text-slate-400">No visits found for this date.</div>
                          )}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
                    No visit history yet.
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 h-fit space-y-4"
            >
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Add Visit</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Record visit reason and assigned doctor.</p>
              </div>
              <Input
                label="Problem"
                required
                value={form.problem}
                onChange={event => setForm(current => ({ ...current, problem: event.target.value }))}
                onBlur={() => setVisitTouched(true)}
                error={visitTouched && !form.problem.trim() ? 'Problem is required' : undefined}
                placeholder="e.g. Fever"
              />
              <Input
                label="Visit Date"
                type="date"
                required
                value={form.visitDate}
                onChange={event => setForm(current => ({ ...current, visitDate: event.target.value }))}
                onBlur={() => setVisitTouched(true)}
                error={visitTouched && !form.visitDate ? 'Visit date is required' : undefined}
              />
              <Select
                label="Doctor"
                required
                value={form.doctor}
                onChange={event => setForm(current => ({ ...current, doctor: event.target.value }))}
                onBlur={() => setVisitTouched(true)}
                error={visitTouched && !form.doctor.trim() ? 'Doctor is required' : undefined}
                options={doctorOptions}
                placeholder={loadingDoctors ? 'Loading doctors...' : '— Select doctor —'}
                dropdownPlacement="up"
              />
              {!loadingDoctors && form.visitDate && doctorOptions.length === 0 && (
                <p className="text-xs text-slate-400">No available doctors found for this date.</p>
              )}
              <Button type="submit" className="w-full justify-center">
                <Plus size={15} /> Save Visit
              </Button>
            </form>
          </div>
        </div>
        </div>
      </div>

      <Modal
        open={!!medicineVisit}
        onClose={() => setMedicineVisit(null)}
        title={medicineVisit ? `Medicine Details - ${medicineVisit.problem}` : 'Medicine Details'}
        size="md"
      >
        {medicineVisit && medicineDraft && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays size={15} />
                <span className="tabular-nums">{medicineVisit.visitDate}</span>
                {medicineVisit.doctor && <span>· {medicineVisit.doctor}</span>}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {medicineVisit.problem}
              </p>
            </div>

            <Select
              label="Medicine Category"
              value={medicineDraft.category}
              onChange={event => handleMedicineCategoryChange(medicineVisit.id, event.target.value)}
              options={categorySelectOptions}
              placeholder="— Select category —"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Medicines</p>
              <div className="flex flex-wrap gap-2">
                {loadingMedicines ? (
                  <p className="text-sm text-slate-400">Loading medicines...</p>
                ) : medicineOptions.length > 0 ? (
                  medicineOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMedicine(medicineVisit.id, option.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        medicineDraft.medicines.includes(option.value)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    {medicineDraft.category ? 'No medicines found for this category.' : 'Select a category to view medicines.'}
                  </p>
                )}
              </div>
            </div>

            <Input
              label="Notes"
              value={medicineDraft.notes}
              onChange={event => setMedicineDraft(medicineVisit.id, { notes: event.target.value })}
              placeholder="Symptoms, advice, or follow-up"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setMedicineVisit(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => saveMedicineDetails(medicineVisit)}>
                Save Medicine Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
