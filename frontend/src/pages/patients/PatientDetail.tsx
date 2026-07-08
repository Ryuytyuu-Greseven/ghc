import { useEffect, useMemo, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Pill, Plus, UserRound, FileText, X, Pencil, Activity, Sparkles, Mail, Check, Eye } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { authFetch, useApp } from '../../context/AppContext';
import { environment } from '@env/environment';
import { diagnosticTestApi } from '../../services/diagnosticTestApi';
import type { PatientData, PatientMedicine } from '../../types';

const API_BASE = environment.mainBackendUrl;

const categoryOptions = [
  { id: '-1', value: 'Medicine', label: 'Medicine' },
  { id: '-2', value: 'Equipment', label: 'Equipment' },
  { id: '-3', value: 'Consumable', label: 'Consumable' },
  { id: '-4', value: 'Surgical', label: 'Surgical' },
  { id: '-5', value: 'Diagnostic', label: 'Diagnostic' },
  { id: '-6', value: 'Other', label: 'Other' },
];

const SESSIONS = [
  { id: 'mng', key: 'patients.detail.sessions.mng', defaultLabel: 'Morning' },
  { id: 'afternoon', key: 'patients.detail.sessions.afternoon', defaultLabel: 'Afternoon' },
  { id: 'evening', key: 'patients.detail.sessions.evening', defaultLabel: 'Evening' },
  { id: 'night', key: 'patients.detail.sessions.night', defaultLabel: 'Night' },
  { id: 'midnight', key: 'patients.detail.sessions.midnight', defaultLabel: 'Midnight' },
];

type MedicineOption = {
  value: string;
  label: string;
  itemId: string;
  batchNo: string;
  expiryDate: string | null;
  availableQty: number;
};

type MedicineDraft = {
  category: string;
  medicines: string[];
  medicineDetails?: Record<string, MedicineOption>;
  medicineQuantities: Record<string, number>;
  medicineDays?: Record<string, number>;
  medicineSessions?: Record<string, string[]>;
  medicineQtysPerSession?: Record<string, number>;
  notes: string;
  recommendedTests: string[];
};

function normalizePatientMedicine(medicine: any): PatientMedicine | null {
  if (typeof medicine === 'string') {
    const trimmed = medicine.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.*?)\s+x\s+(\d+(?:\.\d+)?)$/i);
    return {
      name: (match?.[1] ?? trimmed).trim(),
      quantity: match ? Number(match[2]) : 1,
    };
  }

  const name = String(medicine?.name ?? medicine?.medicineName ?? '').trim();
  const quantity = Number(medicine?.quantity ?? 1);
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;

  return {
    name,
    quantity,
    days: medicine?.days ? Number(medicine.days) : undefined,
    sessions: Array.isArray(medicine?.sessions) ? medicine.sessions.map(String) : undefined,
    quantityPerSession: medicine?.quantityPerSession ? Number(medicine.quantityPerSession) : undefined,
  };
}

function formatPatientMedicine(medicine: PatientMedicine, t: any) {
  let details = `${medicine.name} x ${medicine.quantity}`;
  if (medicine.days && medicine.sessions && medicine.sessions.length > 0 && medicine.quantityPerSession) {
    const sessionLabels = medicine.sessions.map(s => {
      switch (s) {
        case 'mng': return t('patients.detail.sessions.mng', 'Morning');
        case 'afternoon': return t('patients.detail.sessions.afternoon', 'Afternoon');
        case 'evening': return t('patients.detail.sessions.evening', 'Evening');
        case 'night': return t('patients.detail.sessions.night', 'Night');
        case 'midnight': return t('patients.detail.sessions.midnight', 'Midnight');
        default: return s;
      }
    });
    details += ` (${medicine.quantityPerSession} per session, ${sessionLabels.join('/')} for ${medicine.days} days)`;
  }
  return details;
}

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
    medicines: (Array.isArray(item.medicines) ? item.medicines : [])
      .map(normalizePatientMedicine)
      .filter((medicine: { name: string; quantity: number } | null): medicine is { name: string; quantity: number } => medicine !== null),
    doctor: item.doctor ?? '',
    nurse: item.nurse ?? '',
    nurseUserId: item.nurseUserId?._id ?? item.nurseUserId ?? '',
    notes: item.notes ?? '',
    recommendedTests: Array.isArray(item.recommendedTests) ? item.recommendedTests.map(String) : [],
    status: item.status ?? 'General Visit',
    admittedAt: item.admittedAt ? new Date(item.admittedAt).toISOString().split('T')[0] : undefined,
    dischargedAt: item.dischargedAt ? new Date(item.dischargedAt).toISOString().split('T')[0] : undefined,
  };
}

function PatientDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full">
      <Header title={t('common.loading')} subtitle={t('patients.detail.loadingSubtitle')} />
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
  const { t } = useTranslation();
  const { id } = useParams();
  const { patients, loading: appLoading, currentUser, hospitals } = useApp();
  const patient = patients.find(p => p.id === id);
  const assignedHospital = hospitals.find(
    h => h.id === patient?.hospitalId || h._id === patient?.hospitalId,
  );
  const hospital = assignedHospital;
  const canManageVisits = ['Doctor', 'Nurse', 'Receptionist'].includes(currentUser?.role ?? '');
  const [history, setHistory] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => setError(''), 4500);
    return () => window.clearTimeout(timer);
  }, [error]);
  const [medicineVisit, setMedicineVisit] = useState<PatientData | null>(null);
  const [prescriptionGroupToView, setPrescriptionGroupToView] = useState<{ problem: string; visits: PatientData[] } | null>(null);
  const [medicineError, setMedicineError] = useState('');
  const [medicineDrafts, setMedicineDrafts] = useState<
    Record<string, MedicineDraft>
  >({});
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [newTestInput, setNewTestInput] = useState('');
  const [isOtherTestSelected, setIsOtherTestSelected] = useState(false);
  const [facilityTestOptions, setFacilityTestOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingFacilityTests, setLoadingFacilityTests] = useState(false);
  const [facilityTestsError, setFacilityTestsError] = useState('');
  const [sendingPrescriptionEmail, setSendingPrescriptionEmail] = useState(false);
  const [prescriptionEmailSent, setPrescriptionEmailSent] = useState(false);

  const handleSendPrescriptionEmail = async () => {
    if (!prescriptionGroupToView || !patient?.email) return;
    setSendingPrescriptionEmail(true);
    try {
      const visits = history
        .filter(v => v.problem.trim() === prescriptionGroupToView.problem.trim())
        .filter(v => v.medicines.length > 0 || (v.recommendedTests && v.recommendedTests.length > 0))
        .map(v => ({
          visitDate: v.visitDate,
          doctor: v.doctor,
          medicines: v.medicines,
          recommendedTests: v.recommendedTests,
          notes: v.notes,
        }));
      await authFetch(`${API_BASE}/patient-data/send-prescription-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patient.name,
          patientEmail: patient.email,
          problem: prescriptionGroupToView.problem,
          visits,
        }),
      });
      setPrescriptionEmailSent(true);
      setTimeout(() => setPrescriptionEmailSent(false), 4000);
    } catch {
      // silent fail
    } finally {
      setSendingPrescriptionEmail(false);
    }
  };

  const addRecommendedTest = (visitId: string) => {
    if (!newTestInput.trim()) return;
    const current = medicineDrafts[visitId]?.recommendedTests ?? [];
    if (!current.includes(newTestInput.trim())) {
      setMedicineDraft(visitId, {
        recommendedTests: [...current, newTestInput.trim()],
      });
    }
    setNewTestInput('');
    setIsOtherTestSelected(false);
  };

  const removeRecommendedTest = (visitId: string, test: string) => {
    const current = medicineDrafts[visitId]?.recommendedTests ?? [];
    setMedicineDraft(visitId, {
      recommendedTests: current.filter(t => t !== test),
    });
  };

  const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [nurseOptions, setNurseOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingNurses, setLoadingNurses] = useState(false);
  const [form, setForm] = useState({
    problem: '',
    visitDate: new Date().toISOString().split('T')[0],
    doctor: '',
    nurse: '',
    bedRequired: false,
    admittedAt: new Date().toISOString().split('T')[0],
    dischargedAt: new Date().toISOString().split('T')[0],
  });
  const [visitTouched, setVisitTouched] = useState(false);
  const [showNoBedsModal, setShowNoBedsModal] = useState(false);

  // AI Suggestions & Profiling state
  const [aiRiskProfile, setAiRiskProfile] = useState<{ potentialRisks: string[]; recommendedVitalsMonitoring: string[]; generalHealthGuidelines: string } | null>(null);
  const [showAiRiskProfile, setShowAiRiskProfile] = useState(false);
  const [aiVisitSuggestions, setAiVisitSuggestions] = useState<{ potentialDiagnoses: string[]; suggestedMedicineCategories: string[]; recommendedVitalsToCheck: string[] } | null>(null);
  const [showAiVisitSuggestions, setShowAiVisitSuggestions] = useState(false);
  const [loadingVisitSuggestions, setLoadingVisitSuggestions] = useState(false);
  const [aiPrescriptionValidation, setAiPrescriptionValidation] = useState<{ safetyWarnings: string[]; dietaryAdvice: string; suggestedAlternatives: { prescribed: string; alternative: string; reason: string }[] } | null>(null);
  const [showAiPrescriptionValidation, setShowAiPrescriptionValidation] = useState(false);
  const [loadingPrescriptionValidation, setLoadingPrescriptionValidation] = useState(false);

  const riskProfileRef = useRef<HTMLDivElement>(null);
  const visitSuggestionsRef = useRef<HTMLDivElement>(null);
  const prescriptionValidationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (showAiRiskProfile && riskProfileRef.current && !riskProfileRef.current.contains(target)) {
        setShowAiRiskProfile(false);
      }
      if (showAiVisitSuggestions && visitSuggestionsRef.current && !visitSuggestionsRef.current.contains(target)) {
        setShowAiVisitSuggestions(false);
      }
      if (showAiPrescriptionValidation && prescriptionValidationRef.current && !prescriptionValidationRef.current.contains(target)) {
        setShowAiPrescriptionValidation(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showAiRiskProfile, showAiVisitSuggestions, showAiPrescriptionValidation]);

  useEffect(() => {
    if (!id) return;

    async function loadHistory() {
      try {
        setLoading(true);
        const res = await authFetch(`${API_BASE}/patient-data/by-patient/${id}`);
        if (!res.ok) throw new Error(t('patients.detail.loadError'));
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
    const hospitalId = patient?.hospitalId;
    if (!hospitalId) {
      setFacilityTestOptions([]);
      setFacilityTestsError('');
      return;
    }

    const matchedHospital = hospitals.find(
      (h) => h.id === hospitalId || h._id === hospitalId,
    );
    const facilityId = matchedHospital?.id ?? hospitalId;

    let active = true;
    async function loadFacilityTests(facilityId: string) {
      setLoadingFacilityTests(true);
      setFacilityTestsError('');
      try {
        const data = await diagnosticTestApi.getAvailableTestsByHospital(facilityId);
        if (!active) return;

        const sorted = [...data].sort((a, b) =>
          a.testName.localeCompare(b.testName, undefined, { sensitivity: 'base' }),
        );

        setFacilityTestOptions(
          sorted.map((test) => ({
            value: test.testName,
            label: test.testCode
              ? `${test.testName} (${test.testCode})`
              : test.testName,
          })),
        );
      } catch (err) {
        if (!active) return;
        console.error('Failed to load diagnostic tests for facility', err);
        setFacilityTestOptions([]);
        setFacilityTestsError(
          err instanceof Error
            ? err.message
            : t('patients.detail.loadFacilityTestsError', 'Failed to load tests for this facility.'),
        );
      } finally {
        if (active) setLoadingFacilityTests(false);
      }
    }

    loadFacilityTests(facilityId);
    return () => {
      active = false;
    };
  }, [patient?.hospitalId, hospitals, t]);

  const [loadingRiskProfile, setLoadingRiskProfile] = useState(false);

  const handleTriggerRiskProfile = async () => {
    if (aiRiskProfile) {
      setShowAiRiskProfile(!showAiRiskProfile);
      return;
    }
    try {
      setLoadingRiskProfile(true);
      const res = await authFetch(`${API_BASE}/patients/${id}/ai-risk-profile`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiRiskProfile(data);
        setShowAiRiskProfile(true);
      }
    } catch (err) {
      console.error('Failed to load AI health risk profile', err);
    } finally {
      setLoadingRiskProfile(false);
    }
  };

  const handleTriggerVisitSuggestions = async () => {
    if (aiVisitSuggestions) {
      setShowAiVisitSuggestions(!showAiVisitSuggestions);
      return;
    }
    const query = form.problem.trim();
    if (query.length < 3) return;
    try {
      setLoadingVisitSuggestions(true);
      const res = await authFetch(`${API_BASE}/patient-data/ai-visit-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiVisitSuggestions(data);
        setShowAiVisitSuggestions(true);
      }
    } catch (err) {
      console.error('Failed to load visit suggestions', err);
    } finally {
      setLoadingVisitSuggestions(false);
    }
  };

  useEffect(() => {
    if (form.problem.trim().length < 3) {
      setAiVisitSuggestions(null);
      setShowAiVisitSuggestions(false);
    }
  }, [form.problem]);

  useEffect(() => {
    if (!form.visitDate) {
      setDoctorOptions([]);
      return;
    }

    let active = true;
    async function loadAvailableDoctors() {
      try {
        setLoadingDoctors(true);
        const hospitalIdParam = patient?.hospitalId ? `&hospitalId=${encodeURIComponent(patient.hospitalId)}` : '';
        const res = await authFetch(`${API_BASE}/staff/available-doctors?date=${encodeURIComponent(form.visitDate)}${hospitalIdParam}`);
        if (!res.ok) throw new Error(t('patients.detail.loadDoctorsError'));
        const data = await res.json();
        if (!active) return;

        const options = (Array.isArray(data) ? data : [])
          .map((doctor: any) => {
            const label = doctor.doctorName ?? doctor.displayName ?? doctor.name ?? '';
            const userId = doctor.userId ?? '';
            return { value: userId, label };
          })
          .filter(option => option.value && option.label);

        setDoctorOptions(options);
        setForm(current => (
          current.doctor && !options.some(option => option.value === current.doctor)
            ? { ...current, doctor: '' }
            : current
        ));
      } catch (err) {
        if (!active) return;
        setDoctorOptions([]);
        setError(err instanceof Error ? err.message : t('patients.detail.loadDoctorsError'));
      } finally {
        if (active) setLoadingDoctors(false);
      }
    }

    loadAvailableDoctors();
    return () => {
      active = false;
    };
  }, [form.visitDate, patient?.hospitalId]);

  useEffect(() => {
    if (!form.visitDate) {
      setNurseOptions([]);
      return;
    }

    let active = true;
    async function loadAvailableNurses() {
      try {
        setLoadingNurses(true);
        const hospitalIdParam = patient?.hospitalId ? `&hospitalId=${encodeURIComponent(patient.hospitalId)}` : '';
        const res = await authFetch(`${API_BASE}/staff/available-nurses?date=${encodeURIComponent(form.visitDate)}${hospitalIdParam}`);
        if (!res.ok) throw new Error(t('patients.detail.loadNursesError', 'Failed to load available nurses'));
        const data = await res.json();
        if (!active) return;

        const options = (Array.isArray(data) ? data : [])
          .map((nurse: any) => {
            const label = nurse.nurseName ?? nurse.displayName ?? nurse.name ?? '';
            const userId = nurse.userId ?? '';
            return { value: userId, label };
          })
          .filter(option => option.value && option.label);

        setNurseOptions(options);
        setForm(current => (
          current.nurse && !options.some(option => option.value === current.nurse)
            ? { ...current, nurse: '' }
            : current
        ));
      } catch (err) {
        if (!active) return;
        setNurseOptions([]);
        setError(err instanceof Error ? err.message : t('patients.detail.loadNursesError', 'Failed to load available nurses'));
      } finally {
        if (active) setLoadingNurses(false);
      }
    }

    loadAvailableNurses();
    return () => {
      active = false;
    };
  }, [form.visitDate, patient?.hospitalId]);

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
      medicines: [],
      medicineDetails: {},
      medicineQuantities: {},
      medicineDays: {},
      medicineSessions: {},
      medicineQtysPerSession: {},
      notes: visit.notes ?? '',
      recommendedTests: visit.recommendedTests ?? [],
    };

  const loadMedicinesForCategory = async (categoryId: string) => {
    const category = getCategoryByIdOrValue(categoryId);
    if (!category || !patient?.hospitalId) {
      setMedicineOptions([]);
      return;
    }

    try {
      setLoadingMedicines(true);
      setMedicineError('');
      const res = await authFetch(
        `${API_BASE}/branch-inventory/branch/${encodeURIComponent(patient.hospitalId)}/category/${encodeURIComponent(category.value)}`
      );
      if (!res.ok) throw new Error('Failed to load medicines');
      const data = await res.json();
      setMedicineOptions(
        (Array.isArray(data) ? data : [])
          .map((entry: any): MedicineOption | null => {
            const itemId = entry.itemId?._id ?? entry.itemId?.id ?? entry.itemId ?? '';
            const name = entry.itemId?.itemName ?? entry.itemId?.name ?? entry.itemName ?? entry.name ?? '';
            const batchNo = entry.batchNo ?? '';
            const availableQty = Number(entry.availableQty ?? 0);
            if (!itemId || !name || !batchNo || availableQty <= 0) return null;

            return {
              value: `${itemId}:${batchNo}`,
              label: name,
              itemId,
              batchNo,
              expiryDate: entry.expiryDate ?? null,
              availableQty,
            };
          })
          .filter((option): option is MedicineOption => option !== null)
      );
    } catch (err) {
      setMedicineOptions([]);
      setMedicineError(err instanceof Error ? err.message : 'Failed to load medicines');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const openMedicineModal = (visit: PatientData) => {
    const category = getCategoryId(visit.category ?? '');
    setMedicineVisit(visit);
    setMedicineError('');
    setEditingMedicineId(null);
    setNewTestInput('');
    setIsOtherTestSelected(false);
    setMedicineDrafts(current => {
      if (current[visit.id]) return current;

      const initialMedicines: string[] = [];
      const initialDetails: Record<string, MedicineOption> = {};
      const initialQuantities: Record<string, number> = {};
      const initialDays: Record<string, number> = {};
      const initialSessions: Record<string, string[]> = {};
      const initialQtysPerSession: Record<string, number> = {};

      (visit.medicines ?? []).forEach((m, idx) => {
        const key = `existing:${m.name}:${idx}`;
        initialMedicines.push(key);
        initialDetails[key] = {
          value: key,
          label: m.name,
          itemId: 'existing',
          batchNo: 'Existing',
          expiryDate: null,
          availableQty: m.quantity,
        };
        initialQuantities[key] = m.quantity;
        initialDays[key] = m.days ?? 1;
        initialSessions[key] = m.sessions ?? ['mng'];
        initialQtysPerSession[key] = m.quantityPerSession ?? 1;
      });

      return {
        ...current,
        [visit.id]: {
          category,
          medicines: initialMedicines,
          medicineDetails: initialDetails,
          medicineQuantities: initialQuantities,
          medicineDays: initialDays,
          medicineSessions: initialSessions,
          medicineQtysPerSession: initialQtysPerSession,
          notes: visit.notes ?? '',
          recommendedTests: visit.recommendedTests ?? [],
        },
      };
    });
    void loadMedicinesForCategory(category);
  };

  const setMedicineDraft = (
    visitId: string,
    next: Partial<MedicineDraft>
  ) => {
    setMedicineDrafts(current => ({
      ...current,
      [visitId]: {
        category: current[visitId]?.category ?? '',
        medicines: current[visitId]?.medicines ?? [],
        medicineDetails: current[visitId]?.medicineDetails ?? {},
        medicineQuantities: current[visitId]?.medicineQuantities ?? {},
        medicineDays: current[visitId]?.medicineDays ?? {},
        medicineSessions: current[visitId]?.medicineSessions ?? {},
        medicineQtysPerSession: current[visitId]?.medicineQtysPerSession ?? {},
        notes: current[visitId]?.notes ?? '',
        recommendedTests: current[visitId]?.recommendedTests ?? [],
        ...next,
      },
    }));
  };

  const toggleMedicine = (visitId: string, medicine: string) => {
    const current = medicineDrafts[visitId] ?? {
      category: '',
      medicines: [],
      medicineDetails: {},
      medicineQuantities: {},
      medicineDays: {},
      medicineSessions: {},
      medicineQtysPerSession: {},
      notes: '',
    };
    const isSelected = current.medicines.includes(medicine);
    const remainingQuantities = { ...current.medicineQuantities };
    delete remainingQuantities[medicine];
    setMedicineError('');

    const nextDays = { ...current.medicineDays };
    const nextSessions = { ...current.medicineSessions };
    const nextQtysPerSession = { ...current.medicineQtysPerSession };
    const nextDetails = { ...current.medicineDetails };

    if (isSelected) {
      delete nextDays[medicine];
      delete nextSessions[medicine];
      delete nextQtysPerSession[medicine];
      delete nextDetails[medicine];
      if (editingMedicineId === medicine) {
        setEditingMedicineId(null);
      }
    } else {
      nextDays[medicine] = 1;
      nextSessions[medicine] = ['mng'];
      nextQtysPerSession[medicine] = 1;
      const option = medicineOptions.find(opt => opt.value === medicine);
      if (option) {
        nextDetails[medicine] = option;
      }
    }

    const calculatedQty = isSelected ? 0 : 1 * 1 * 1;

    const nextMedicines = isSelected
      ? current.medicines.filter(item => item !== medicine)
      : [...current.medicines, medicine];

    setMedicineDrafts(currentDrafts => ({
      ...currentDrafts,
      [visitId]: {
        ...currentDrafts[visitId],
        medicines: nextMedicines,
        medicineQuantities: isSelected
          ? remainingQuantities
          : { ...current.medicineQuantities, [medicine]: calculatedQty },
        medicineDays: nextDays,
        medicineSessions: nextSessions,
        medicineQtysPerSession: nextQtysPerSession,
        medicineDetails: nextDetails,
      },
    }));

    setAiPrescriptionValidation(null);
    setShowAiPrescriptionValidation(false);
  };

  const handleTriggerPrescriptionValidation = async (visitId: string) => {
    if (aiPrescriptionValidation) {
      setShowAiPrescriptionValidation(!showAiPrescriptionValidation);
      return;
    }
    const draft = medicineDrafts[visitId];
    if (!draft || draft.medicines.length === 0) return;

    const matchedVisit = history.find(v => v.id === visitId);
    const diagnosis = matchedVisit ? matchedVisit.problem : '';
    const medicinesPayload = draft.medicines.map(m => ({
      name: draft.medicineDetails?.[m]?.label ?? m,
      quantity: 1,
    }));

    try {
      setLoadingPrescriptionValidation(true);
      const res = await authFetch(`${API_BASE}/patient-data/ai-prescription-validation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis, medicines: medicinesPayload }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiPrescriptionValidation(data);
        setShowAiPrescriptionValidation(true);
      }
    } catch (err) {
      console.error('Failed to validate prescription via AI', err);
    } finally {
      setLoadingPrescriptionValidation(false);
    }
  };

  const updatePrescription = (
    visitId: string,
    medicine: string,
    field: 'days' | 'sessions' | 'quantityPerSession',
    value: any
  ) => {
    const current = medicineDrafts[visitId] ?? {
      category: '',
      medicines: [],
      medicineDetails: {},
      medicineQuantities: {},
      medicineDays: {},
      medicineSessions: {},
      medicineQtysPerSession: {},
      notes: '',
    };

    const nextDays = { ...current.medicineDays, [medicine]: current.medicineDays?.[medicine] ?? 1 };
    const nextSessions = { ...current.medicineSessions, [medicine]: current.medicineSessions?.[medicine] ?? ['mng'] };
    const nextQtysPerSession = { ...current.medicineQtysPerSession, [medicine]: current.medicineQtysPerSession?.[medicine] ?? 1 };

    if (field === 'days') {
      nextDays[medicine] = Math.max(1, Number(value));
    } else if (field === 'sessions') {
      nextSessions[medicine] = value as string[];
    } else if (field === 'quantityPerSession') {
      nextQtysPerSession[medicine] = Math.max(1, Number(value));
    }

    const calculatedQty = nextDays[medicine] * nextSessions[medicine].length * nextQtysPerSession[medicine];

    setMedicineDrafts(currentDrafts => ({
      ...currentDrafts,
      [visitId]: {
        ...currentDrafts[visitId],
        medicineDays: nextDays,
        medicineSessions: nextSessions,
        medicineQtysPerSession: nextQtysPerSession,
        medicineQuantities: {
          ...(currentDrafts[visitId]?.medicineQuantities ?? {}),
          [medicine]: calculatedQty,
        },
      },
    }));
    setAiPrescriptionValidation(null);
    setShowAiPrescriptionValidation(false);
  };

  const saveMedicineDetails = async (visit: PatientData) => {
    const draft = getMedicineDraft(visit);
    setMedicineError('');
    const selectedOptions = draft.medicines
      .map(value => draft.medicineDetails?.[value] ?? medicineOptions.find(option => option.value === value))
      .filter((option): option is MedicineOption => option !== undefined);

    for (const option of selectedOptions) {
      const key = option.value;
      const days = draft.medicineDays?.[key] ?? 1;
      const sessions = draft.medicineSessions?.[key] ?? [];
      const quantityPerSession = draft.medicineQtysPerSession?.[key] ?? 1;
      const quantity = Number(draft.medicineQuantities[key] ?? 0);

      if (days <= 0 || quantityPerSession <= 0) {
        setMedicineError(`Days and quantity per session must be greater than 0 for ${option.label}`);
        return;
      }
      if (sessions.length === 0) {
        setMedicineError(`Please select at least one session/time for ${option.label}`);
        return;
      }
      if (option.itemId !== 'existing' && quantity > option.availableQty) {
        setMedicineError(`Calculated quantity (${quantity}) exceeds available stock (${option.availableQty}) for ${option.label}`);
        return;
      }
    }

    const medicineSummaries = selectedOptions.map(option => {
      const key = option.value;
      const days = draft.medicineDays?.[key] ?? 1;
      const sessions = draft.medicineSessions?.[key] ?? [];
      const quantityPerSession = draft.medicineQtysPerSession?.[key] ?? 1;
      const quantity = Number(draft.medicineQuantities[key] ?? 0);

      return {
        name: option.label,
        quantity,
        days,
        sessions,
        quantityPerSession,
      };
    });

    const branchInventoryAdjustments = patient?.hospitalId
      ? selectedOptions
          .filter(option => option.itemId !== 'existing')
          .map(option => ({
            branchId: patient.hospitalId,
            itemId: option.itemId,
            quantity: Number(draft.medicineQuantities[option.value] ?? 0),
            batchNo: option.batchNo,
            expiryDate: option.expiryDate ?? undefined,
          }))
      : [];

    try {
      const res = await authFetch(`${API_BASE}/patient-data/${visit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: draft.category,
          medicines: medicineSummaries,
          notes: draft.notes,
          recommendedTests: draft.recommendedTests,
          branchInventoryAdjustments,
        }),
      });

      if (!res.ok) throw new Error(t('patients.detail.saveMedicineError'));
      const updated = mapPatientDataFromBackend(await res.json());
      setHistory(current => current.map(item => (item.id === updated.id ? updated : item)));
      setMedicineDrafts(current => {
        const next = { ...current };
        delete next[visit.id];
        return next;
      });
      setMedicineVisit(null);
    } catch (err) {
      setMedicineError(err instanceof Error ? err.message : t('patients.detail.saveMedicineError'));
    }
  };

  const handleMedicineCategoryChange = (visitId: string, category: string) => {
    setMedicineError('');
    setMedicineDraft(visitId, {
      category,
    });
    void loadMedicinesForCategory(category);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setError('');
    setVisitTouched(true);

    if (!form.problem.trim() || !form.visitDate || !form.doctor.trim()) {
      setError(t('patients.detail.validationError'));
      return;
    }

    const selectedDoctor = doctorOptions.find(option => option.value === form.doctor);
    const selectedNurse = nurseOptions.find(option => option.value === form.nurse);

    try {
      const res = await authFetch(`${API_BASE}/patient-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: id,
          problem: form.problem,
          visitDate: form.visitDate,
          doctor: selectedDoctor?.label ?? form.doctor,
          doctorUserId: form.doctor,
          nurse: selectedNurse?.label ?? form.nurse,
          nurseUserId: form.nurse || undefined,
          bedRequired: form.bedRequired,
          admittedAt: form.bedRequired ? form.admittedAt : undefined,
          dischargedAt: form.bedRequired ? form.dischargedAt : undefined,
          status: form.bedRequired ? 'Admitted' : 'General Visit',
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson.message || t('patients.detail.saveVisitError');
        if (msg.includes('No beds available')) {
          setShowNoBedsModal(true);
          return;
        }
        throw new Error(msg);
      }
      const created = mapPatientDataFromBackend(await res.json());
      setHistory(current => [...current, created]);
      // Reload page or update patient context since bed allocation status has changed
      window.location.reload();
      setForm({
        problem: '',
        visitDate: new Date().toISOString().split('T')[0],
        doctor: '',
        nurse: '',
        bedRequired: false,
        admittedAt: new Date().toISOString().split('T')[0],
        dischargedAt: new Date().toISOString().split('T')[0],
      });
      setVisitTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('patients.detail.saveVisitError'));
    }
  };

  if (appLoading && !patient) {
    return <PatientDetailSkeleton />;
  }

  if (!patient) {
    return (
      <div className="p-8">
        <Link to="/patients" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          {t('patients.detail.backToPatients')}
        </Link>
        <div className="mt-16 text-center text-slate-400">
          <UserRound size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('patients.detail.patientNotFound')}</p>
        </div>
      </div>
    );
  }

  const medicineDraft = medicineVisit ? getMedicineDraft(medicineVisit) : null;

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg shadow-lg flex items-center justify-between max-w-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-3 text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}
      <div className="flex flex-col h-full">
        <Header title={patient.name} subtitle={t('patients.detail.subtitle')} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
          <div className="max-w-screen-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/patients"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600"
              >
                <ArrowLeft size={16} /> {t('patients.detail.backToPatients')}
              </Link>
              {patient && canManageVisits && (
                <div className="relative" ref={riskProfileRef}>
                  <button
                    type="button"
                    onClick={handleTriggerRiskProfile}
                    disabled={loadingRiskProfile}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-250 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm disabled:opacity-50 animate-flicker"
                  >

                    <Sparkles size={13} className={`text-emerald-600 dark:text-emerald-400 ${loadingRiskProfile ? 'animate-spin' : ''}`} />
                    {loadingRiskProfile ? t('patients.detail.analyzingSymptoms', 'Analyzing...') : t('patients.detail.clinicalOnboardingAnalysis', 'Clinical Onboarding Analysis')}
                  </button>

                  {/* Onboarding Analysis Speech Bubble Popover */}
                  {showAiRiskProfile && aiRiskProfile && !loadingRiskProfile && (
                    <div className="absolute right-0 mt-2.5 z-30 w-80 sm:w-[480px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-5 space-y-3 animate-fadeIn text-slate-800 dark:text-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                        <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                          ✨ {t('patients.detail.clinicalOnboardingAnalysis', 'Clinical Onboarding Analysis')}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowAiRiskProfile(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-700 dark:text-slate-250">Identified Health Risks</p>
                          <ul className="list-disc list-inside text-slate-650 dark:text-slate-400 space-y-1">
                            {aiRiskProfile.potentialRisks.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-700 dark:text-slate-250">Recommended Vitals Monitoring</p>
                          <ul className="list-disc list-inside text-slate-650 dark:text-slate-400 space-y-1">
                            {aiRiskProfile.recommendedVitalsMonitoring.map((v, i) => <li key={i}>{v}</li>)}
                          </ul>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/80 pt-2.5">
                        <strong>{t('patients.detail.guidelinesCareProtocol', 'Guidelines & Care Protocol')}:</strong> {aiRiskProfile.generalHealthGuidelines}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 ${canManageVisits ? 'xl:grid-cols-[1fr_360px]' : ''} gap-5`}>
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{patient.name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {patient.age} {t('dashboard.yrs')} · {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} · {patient.bloodGroup}
                      </p>
                    </div>
                    <Badge variant={patient.bedRequired ? 'danger' : 'success'}>
                      {patient.bedRequired ? t('patients.bedAllocated') : t('patients.noBedNeeded')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-5 text-sm">
                    <div>
                      <p className="text-slate-400">{t('patients.phoneLabel')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{patient.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('patients.aadhaarLabel')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{patient.aadhaarNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('patients.emailLabel')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate" title={patient.email}>{patient.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('patients.facility')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate" title={hospital?.name}>{hospital?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('patients.addressLabel', 'Address')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate" title={patient.address}>{patient.address || '—'}</p>
                    </div>
                  </div>
                </div>



                <div className="space-y-4">
                  {loading ? (
                    <VisitHistorySkeleton />
                  ) : groupedHistory.length > 0 ? (
                    groupedHistory.map((group, index) => {
                      const hasAnyPrescriptionData = group.visits.some(v => v.medicines.length > 0 || (v.recommendedTests && v.recommendedTests.length > 0));
                      return (
                        <section
                          key={group.problem}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                              {t('patients.detail.visitHeading', { count: index + 1, problem: group.problem })}
                            </h3>
                            <div className="flex items-center gap-2">
                              {hasAnyPrescriptionData && (
                                <button
                                  type="button"
                                  onClick={() => setPrescriptionGroupToView({ problem: group.problem, visits: group.visits })}
                                  title={t('patients.detail.prescription.viewButtonTitle')}
                                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 hover:border-primary-300 dark:hover:border-primary-700 transition"
                                >
                                  <FileText size={13} />
                                  {t('patients.detail.prescription.viewButton')}
                                </button>
                              )}
                              {group.visits[0]?.status && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold leading-4 whitespace-nowrap ${
                                  group.visits[0].status === 'Admitted'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-450'
                                    : group.visits[0].status === 'Discharged'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-450'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-450'
                                }`}>
                                  {group.visits[0].status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {group.visits.length > 0 ? (
                              group.visits.map(visit => {
                                return (
                                  <div key={visit.id} className="p-5">
                                    <button
                                      type="button"
                                      onClick={() => canManageVisits && openMedicineModal(visit)}
                                      className={`w-full text-left space-y-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 ${canManageVisits ? 'cursor-pointer' : 'cursor-default'}`}
                                      disabled={!canManageVisits}
                                    >
                                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <CalendarDays size={15} />
                                        <span className="tabular-nums">{visit.visitDate}</span>
                                        {visit.doctor && <span>· {visit.doctor}</span>}
                                        {visit.nurse && <span>· Nurse: {visit.nurse}</span>}
                                      </div>
                                      {(visit.admittedAt || ((visit.status === 'Admitted' || visit.status === 'Discharged') && patient.admittedAt)) && (
                                        <div className="flex items-center gap-6 text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 w-fit">
                                          <div>
                                            <span className="text-slate-400 block mb-0.5">Admit Date</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-205 tabular-nums">
                                              {visit.admittedAt || patient.admittedAt}
                                            </span>
                                          </div>
                                          {(visit.dischargedAt || ((visit.status === 'Admitted' || visit.status === 'Discharged') && patient.dischargedAt)) && (
                                            <div>
                                              <span className="text-slate-400 block mb-0.5">Discharge Date</span>
                                              <span className="font-semibold text-slate-700 dark:text-slate-205 tabular-nums">
                                                {visit.dischargedAt || patient.dischargedAt}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex items-start gap-2 text-sm">
                                        <Pill size={15} className="text-primary-500 mt-0.5" />
                                        <div>
                                          <p className="font-medium text-slate-700 dark:text-slate-200">
                                            {visit.category ? t(`inventory.categories.${getCategoryLabel(visit.category)}`) : t('patients.detail.medicinePending')}
                                          </p>
                                          <p className="text-slate-500 dark:text-slate-400">
                                            {visit.medicines.length > 0 ? visit.medicines.map(m => formatPatientMedicine(m, t)).join(', ') : t('patients.detail.clickToAdd')}
                                          </p>
                                        </div>
                                      </div>
                                      {visit.recommendedTests && visit.recommendedTests.length > 0 && (
                                        <div className="flex items-start gap-2 text-sm">
                                          <Activity size={15} className="text-primary-500 mt-0.5" />
                                          <div>
                                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                              {t('patients.detail.recommendedTestsHeader', 'Recommended Tests')}
                                            </p>
                                            <p className="text-slate-500 dark:text-slate-400">
                                              {visit.recommendedTests.join(', ')}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      {visit.notes && (
                                        <div className="text-sm">
                                          <p className="font-semibold text-slate-700 dark:text-slate-300">{t('patients.detail.notesLabel', 'Notes')}:</p>
                                          <p className="text-slate-500 dark:text-slate-400 italic mt-0.5 whitespace-pre-line">{visit.notes}</p>
                                        </div>
                                      )}
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-5 text-sm text-slate-400">{t('patients.detail.noVisitsForDate')}</div>
                            )}
                          </div>
                        </section>
                      );
                    })
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">
                      {t('patients.detail.noHistory')}
                    </div>
                  )}
                </div>
              </div>

              {canManageVisits && patient.bedRequired && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-5 text-amber-800 dark:text-amber-400 text-sm space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span className="text-base">⚠️</span> Patient Admitted
                  </p>
                  <p className="opacity-90">
                    This patient is currently admitted to the hospital. New visit records cannot be added until the patient is discharged.
                  </p>
                </div>
              )}

              {canManageVisits && !patient.bedRequired && (
                <form
                  onSubmit={handleSubmit}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 h-fit space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('patients.detail.addVisit')}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('patients.detail.recordVisitDesc')}</p>
                    </div>
                    {form.problem.trim().length >= 3 && (
                      <div className="relative" ref={visitSuggestionsRef}>
                        <button
                          type="button"
                          onClick={handleTriggerVisitSuggestions}
                          disabled={loadingVisitSuggestions}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-950/40 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 shrink-0 animate-flicker-blue"
                        >

                          <Sparkles size={11} className={`text-blue-600 dark:text-blue-400 ${loadingVisitSuggestions ? 'animate-spin' : ''}`} />
                          {loadingVisitSuggestions ? t('patients.detail.analyzingSymptoms', 'Analyzing...') : t('patients.detail.diagnosticAssistant', 'Diagnostic Assistant')}
                        </button>

                        {/* Diagnostic Assistant Popover Bubble */}
                        {showAiVisitSuggestions && aiVisitSuggestions && !loadingVisitSuggestions && (
                          <div className="absolute right-0 mt-2.5 z-30 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-2 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                              <p className="font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">✨ {t('patients.detail.diagnosticAssistant', 'Diagnostic Assistant')}</p>
                              <button
                                type="button"
                                onClick={() => setShowAiVisitSuggestions(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">Predicted Diagnoses: </span>
                              <span className="text-slate-600 dark:text-slate-450">{aiVisitSuggestions.potentialDiagnoses.join(', ')}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">Suggested Categories: </span>
                              <span className="text-slate-600 dark:text-slate-450">{aiVisitSuggestions.suggestedMedicineCategories.join(', ')}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">Required Vitals Checks: </span>
                              <span className="text-slate-655 dark:text-slate-450">{aiVisitSuggestions.recommendedVitalsToCheck.join(', ')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Input
                    label={t('patients.detail.problemLabel')}
                    required
                    value={form.problem}
                    onChange={event => setForm(current => ({ ...current, problem: event.target.value }))}
                    onBlur={() => setVisitTouched(true)}
                    error={visitTouched && !form.problem.trim() ? t('patients.detail.problemRequired') : undefined}
                    placeholder={t('patients.detail.problemPlaceholder')}
                  />
                  <Input
                    label={t('patients.detail.visitDateLabel')}
                    type="date"
                    required
                    value={form.visitDate}
                    onChange={event => setForm(current => ({ ...current, visitDate: event.target.value }))}
                    onBlur={() => setVisitTouched(true)}
                    error={visitTouched && !form.visitDate ? t('patients.detail.visitDateRequired') : undefined}
                  />
                  <Select
                    label={t('patients.detail.doctorLabel')}
                    required
                    value={form.doctor}
                    onChange={event => setForm(current => ({ ...current, doctor: event.target.value }))}
                    onBlur={() => setVisitTouched(true)}
                    error={visitTouched && !form.doctor.trim() ? t('patients.detail.doctorRequired') : undefined}
                    options={doctorOptions}
                    placeholder={loadingDoctors ? t('patients.detail.loadingDoctors') : t('patients.detail.selectDoctor')}
                    dropdownPlacement="up"
                  />
                  {!loadingDoctors && form.visitDate && doctorOptions.length === 0 && (
                    <p className="text-xs text-slate-400">{t('patients.detail.noDoctors')}</p>
                  )}
                  <Select
                    label={t('patients.detail.nurseLabel', 'Assign Nurse')}
                    value={form.nurse}
                    onChange={event => setForm(current => ({ ...current, nurse: event.target.value }))}
                    options={nurseOptions}
                    placeholder={loadingNurses ? t('patients.detail.loadingNurses', 'Loading nurses...') : t('patients.detail.selectNurse', '— Select nurse —')}
                    dropdownPlacement="up"
                  />
                  {!loadingNurses && form.visitDate && nurseOptions.length === 0 && (
                    <p className="text-xs text-slate-400">{t('patients.detail.noNurses', 'No available nurses found for this date.')}</p>
                  )}

                  <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="bedRequired"
                      checked={form.bedRequired}
                      onChange={e => setForm(current => ({ ...current, bedRequired: e.target.checked }))}
                      className="w-4 h-4 accent-primary-600 cursor-pointer"
                    />
                    <label htmlFor="bedRequired" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      {t('patients.form.allocateBed', 'Allocate Bed')}
                    </label>
                  </div>

                  {form.bedRequired && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label={t('patients.detail.admitDateLabel', 'Admit Date')}
                        type="date"
                        required
                        value={form.admittedAt}
                        onChange={e => setForm(current => ({ ...current, admittedAt: e.target.value }))}
                      />
                      <Input
                        label={t('patients.detail.dischargeDateLabel', 'Discharge Date')}
                        type="date"
                        required
                        value={form.dischargedAt}
                        onChange={e => setForm(current => ({ ...current, dischargedAt: e.target.value }))}
                      />
                    </div>
                  )}



                  <Button type="submit" className="w-full justify-center">
                    <Plus size={15} /> {t('patients.detail.saveVisit')}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!medicineVisit}
        onClose={() => {
          setMedicineVisit(null);
          setMedicineError('');
        }}
        title={medicineVisit ? t('patients.detail.medicineDetailsWithProblem', { problem: medicineVisit.problem }) : t('patients.detail.medicineDetails')}
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

            {medicineError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {medicineError}
              </div>
            )}

            <Select
              label={t('patients.detail.medicineCategory')}
              value={medicineDraft.category}
              onChange={event => handleMedicineCategoryChange(medicineVisit.id, event.target.value)}
              options={categoryOptions.map(category => ({ value: category.id, label: t(`inventory.categories.${category.value}`) }))}
              placeholder={t('patients.detail.selectCategory')}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('patients.detail.medicinesTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {loadingMedicines ? (
                  <p className="text-sm text-slate-400">{t('patients.detail.loadingMedicines')}</p>
                ) : medicineOptions.filter(opt => !medicineDraft.medicines.includes(opt.value)).length > 0 ? (
                  medicineOptions.filter(opt => !medicineDraft.medicines.includes(opt.value)).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMedicine(medicineVisit.id, option.value)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    >
                      {option.label} · {option.availableQty} available
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    {medicineDraft.category ? t('patients.detail.noMedicinesForCategory') : t('patients.detail.selectCategoryToView')}
                  </p>
                )}
              </div>
            </div>

            {medicineDraft.medicines.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('patients.detail.prescription.prescriptionDetails')}</p>
                 {medicineDraft.medicines.map(selectedMedicine => {
                  const option = medicineDraft.medicineDetails?.[selectedMedicine] ?? medicineOptions.find(item => item.value === selectedMedicine);
                  if (!option) return null;

                  const currentQty = medicineDraft.medicineQuantities[selectedMedicine] ?? 0;
                  const exceedsStock = option.itemId !== 'existing' && currentQty > option.availableQty;
                  const isEditing = editingMedicineId === selectedMedicine;

                  if (!isEditing) {
                    const days = medicineDraft.medicineDays?.[selectedMedicine] ?? 1;
                    const qtyPerSession = medicineDraft.medicineQtysPerSession?.[selectedMedicine] ?? 1;
                    const sessions = medicineDraft.medicineSessions?.[selectedMedicine] ?? [];
                    const sessionLabels = sessions.map(s => {
                      switch (s) {
                        case 'mng': return t('patients.detail.sessions.mng', 'Morning');
                        case 'afternoon': return t('patients.detail.sessions.afternoon', 'Afternoon');
                        case 'evening': return t('patients.detail.sessions.evening', 'Evening');
                        case 'night': return t('patients.detail.sessions.night', 'Night');
                        case 'midnight': return t('patients.detail.sessions.midnight', 'Midnight');
                        default: return s;
                      }
                    });

                    return (
                      <div key={selectedMedicine} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 flex items-center justify-between gap-3 shadow-sm hover:border-primary-300 dark:hover:border-primary-800 transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{option.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {qtyPerSession} per session · {sessionLabels.join('/') || 'No timing'} · {days} days (Total: {currentQty} units)
                          </p>
                        </div>
                        {selectedMedicine.startsWith('existing:') ? (
                          <button
                            type="button"
                            onClick={() => setEditingMedicineId(selectedMedicine)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-405 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1 shrink-0"
                            title="View details"
                          >
                            <Eye size={14} className="text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">View</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingMedicineId(selectedMedicine)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-405 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                              title="Edit details"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMedicine(medicineVisit.id, selectedMedicine)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-450 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                              title={t('patients.detail.prescription.removeFromPrescription')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isPreviouslySaved = selectedMedicine.startsWith('existing:');

                  return (
                    <div key={selectedMedicine} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{option.label}</p>
                          <p className="text-xs text-slate-400">
                            {option.itemId === 'existing'
                              ? t('patients.detail.prescription.previouslyPrescribed')
                              : t('patients.detail.prescription.batchAvailable', { batchNo: option.batchNo, qty: option.availableQty })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingMedicineId(null)}
                            className="px-2 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition"
                          >
                            {isPreviouslySaved ? t('patients.detail.doneEditing', 'Close') : t('patients.detail.doneEditing', 'Done')}
                          </button>
                          {!isPreviouslySaved && (
                            <button
                              type="button"
                              onClick={() => toggleMedicine(medicineVisit.id, selectedMedicine)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-450 rounded transition-colors"
                              title={t('patients.detail.prescription.removeFromPrescription')}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label={t('patients.detail.prescription.daysToTake')}
                          type="number"
                          min="1"
                          disabled={isPreviouslySaved}
                          value={String(medicineDraft.medicineDays?.[selectedMedicine] ?? 1)}
                          onChange={event => updatePrescription(
                            medicineVisit.id,
                            selectedMedicine,
                            'days',
                            event.target.value
                          )}
                        />
                        <Input
                          label={t('patients.detail.prescription.qtyPerSession')}
                          type="number"
                          min="1"
                          disabled={isPreviouslySaved}
                          value={String(medicineDraft.medicineQtysPerSession?.[selectedMedicine] ?? 1)}
                          onChange={event => updatePrescription(
                            medicineVisit.id,
                            selectedMedicine,
                            'quantityPerSession',
                            event.target.value
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('patients.detail.prescription.sessionsTimings')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SESSIONS.map(session => {
                            const isSessionSelected = (medicineDraft.medicineSessions?.[selectedMedicine] ?? []).includes(session.id);
                            return (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => {
                                  if (isPreviouslySaved) return;
                                  const currentSessions = medicineDraft.medicineSessions?.[selectedMedicine] ?? [];
                                  const nextSessions = currentSessions.includes(session.id)
                                    ? currentSessions.filter(s => s !== session.id)
                                    : [...currentSessions, session.id];
                                  updatePrescription(medicineVisit.id, selectedMedicine, 'sessions', nextSessions);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  isSessionSelected
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-800'
                                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-450 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                } ${isPreviouslySaved ? 'cursor-default opacity-80' : ''}`}
                              >
                                {t(session.key, session.defaultLabel)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        <span className="text-slate-500 font-medium">{t('patients.detail.prescription.calculatedTotalQty')}</span>
                        <span className={`font-bold tabular-nums ${
                          exceedsStock
                            ? 'text-rose-600 dark:text-rose-450'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {currentQty}
                          {exceedsStock && (
                            <span className="ml-1.5 text-[10px] font-semibold text-rose-500 animate-pulse">
                              {t('patients.detail.prescription.exceedsAvailable', { qty: option.availableQty })}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {medicineDraft.medicines.length > 0 && (
              <div className="relative" ref={prescriptionValidationRef}>
                <button
                  type="button"
                  onClick={() => handleTriggerPrescriptionValidation(medicineVisit.id)}
                  disabled={loadingPrescriptionValidation}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-250 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-xs font-bold hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm disabled:opacity-50 animate-flicker-amber"
                >

                  <Sparkles size={14} className={`text-amber-600 dark:text-amber-400 ${loadingPrescriptionValidation ? 'animate-spin' : ''}`} />
                  {loadingPrescriptionValidation ? t('patients.detail.checkingPrescriptionSafety', 'Checking prescription safety...') : t('patients.detail.prescriptionSafetyValidator', 'Prescription Safety Validator')}
                </button>

                {/* Prescription Safety Popover Bubble */}
                {showAiPrescriptionValidation && aiPrescriptionValidation && !loadingPrescriptionValidation && (
                  <div className="absolute left-0 bottom-full mb-2.5 z-30 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-3 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                      <p className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">✨ {t('patients.detail.prescriptionSafetyValidator', 'Prescription Safety Validator')}</p>
                      <button
                        type="button"
                        onClick={() => setShowAiPrescriptionValidation(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {aiPrescriptionValidation.safetyWarnings.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Safety Warnings:</p>
                        <ul className="list-disc list-inside text-rose-600 dark:text-rose-450 space-y-0.5">
                          {aiPrescriptionValidation.safetyWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiPrescriptionValidation.suggestedAlternatives.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Suggested Alternatives:</p>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5">
                          {aiPrescriptionValidation.suggestedAlternatives.map((alt, i) => (
                            <li key={i}>Use <strong>{alt.alternative}</strong> instead of {alt.prescribed} ({alt.reason})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Dietary & Dosage Advice: </span>
                      <span className="text-slate-600 dark:text-slate-400">{aiPrescriptionValidation.dietaryAdvice}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* End of Prescription Validation */}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('patients.detail.recommendedTestsLabel', 'Recommended Diagnostic Tests')}
              </label>
              {assignedHospital && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('patients.detail.testsForFacility', {
                    facility: assignedHospital.name,
                    defaultValue: 'Available tests at {{facility}}',
                  })}
                </p>
              )}
              {!patient.hospitalId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('patients.detail.noFacilityForTests', 'Assign a facility to this patient to load available tests.')}
                </p>
              )}
              {facilityTestsError && (
                <p className="text-xs text-red-600 dark:text-red-400">{facilityTestsError}</p>
              )}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select
                    value={isOtherTestSelected ? 'Other' : newTestInput}
                    onChange={e => {
                      if (e.target.value === 'Other') {
                        setIsOtherTestSelected(true);
                        setNewTestInput('');
                      } else {
                        setIsOtherTestSelected(false);
                        setNewTestInput(e.target.value);
                      }
                    }}
                    options={[
                      ...facilityTestOptions.filter(
                        (test) => !(medicineDraft.recommendedTests ?? []).includes(test.value),
                      ),
                      {
                        value: 'Other',
                        label: t('patients.detail.otherCustomTest', 'Other / Custom Test'),
                      },
                    ]}
                    placeholder={
                      loadingFacilityTests
                        ? t('patients.detail.loadingTests', 'Loading tests...')
                        : t('patients.detail.selectTestPlaceholder', 'Select diagnostic test...')
                    }
                    disabled={!patient.hospitalId || loadingFacilityTests}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => addRecommendedTest(medicineVisit.id)}
                  disabled={!newTestInput.trim()}
                >
                  {t('patients.detail.addTest', 'Add')}
                </Button>
              </div>
              {isOtherTestSelected && (
                <div className="pt-1.5">
                  <input
                    type="text"
                    value={newTestInput}
                    onChange={e => setNewTestInput(e.target.value)}
                    placeholder={t('patients.detail.customTestPlaceholder', 'Enter custom diagnostic test name...')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                </div>
              )}
              {medicineDraft.recommendedTests && medicineDraft.recommendedTests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {medicineDraft.recommendedTests.map(test => (
                    <span
                      key={test}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                    >
                      {test}
                      <button
                        type="button"
                        onClick={() => removeRecommendedTest(medicineVisit.id, test)}
                        className="text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('patients.detail.notesLabel')}
              </label>
              <textarea
                value={medicineDraft.notes}
                onChange={event => setMedicineDraft(medicineVisit.id, { notes: event.target.value })}
                placeholder={t('patients.detail.notesPlaceholder')}
                rows={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMedicineVisit(null);
                  setMedicineError('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={() => saveMedicineDetails(medicineVisit)}>
                {t('patients.detail.saveMedicineDetails')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!prescriptionGroupToView}
        onClose={() => setPrescriptionGroupToView(null)}
        title={prescriptionGroupToView ? t('patients.detail.prescription.viewTitle', { problem: prescriptionGroupToView.problem }) : t('patients.detail.prescription.viewButton')}
        size="md"
      >
        {prescriptionGroupToView && (
          <div className="space-y-5">
            {prescriptionGroupToView.visits.filter(v => v.medicines.length > 0 || (v.recommendedTests && v.recommendedTests.length > 0)).map((visit, vIdx) => {
              const totalPrescriptionVisitsCount = prescriptionGroupToView.visits.filter(v => v.medicines.length > 0 || (v.recommendedTests && v.recommendedTests.length > 0)).length;
              return (
                <div key={visit.id} className="space-y-3">
                  {/* Visit date header */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <CalendarDays size={13} />
                    <span className="tabular-nums">{visit.visitDate}</span>
                    {visit.doctor && <span>· {visit.doctor}</span>}
                    {visit.category && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium normal-case tracking-normal">
                        {t(`inventory.categories.${getCategoryLabel(visit.category)}`)}
                      </span>
                    )}
                  </div>

                  {/* Medicines list */}
                  {visit.medicines.length > 0 && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/30">
                      {visit.medicines.map((m, idx) => {
                        const hasDetails = m.days && m.sessions && m.sessions.length > 0 && m.quantityPerSession;
                        const sessionLabels = m.sessions?.map(s => {
                          switch (s) {
                            case 'mng': return t('patients.detail.sessions.mng', 'Morning');
                            case 'afternoon': return t('patients.detail.sessions.afternoon', 'Afternoon');
                            case 'evening': return t('patients.detail.sessions.evening', 'Evening');
                            case 'night': return t('patients.detail.sessions.night', 'Night');
                            case 'midnight': return t('patients.detail.sessions.midnight', 'Midnight');
                            default: return s;
                          }
                        }) ?? [];
                        return (
                          <div key={idx} className="p-4 flex items-start gap-4">
                            {/* Medicine info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{m.name}</p>
                              {hasDetails ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800/50">
                                    {t('patients.detail.prescription.day_one', { count: m.days })}
                                  </span>
                                  {sessionLabels.map(label => (
                                    <span key={label} className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium border border-violet-100 dark:border-violet-800/50">
                                      {label}
                                    </span>
                                  ))}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium border border-amber-100 dark:border-amber-800/50">
                                    {t('patients.detail.prescription.perDose', { count: m.quantityPerSession })}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('patients.detail.prescription.noTimingSpecified')}</p>
                              )}
                            </div>
                            {/* Total qty badge */}
                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-450 border border-primary-100 dark:border-primary-500/20">
                              <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{t('patients.detail.prescription.qtyLabel')}:</span>
                              <span className="text-sm font-extrabold tabular-nums leading-none">{m.quantity}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Recommended Diagnostic Tests */}
                  {visit.recommendedTests && visit.recommendedTests.length > 0 && (
                    <div className="px-1 mt-2">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <Activity size={12} className="text-primary-500" />
                        {t('patients.detail.recommendedTestsHeader', 'Recommended Tests')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.recommendedTests.map(test => (
                          <span
                            key={test}
                            className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                          >
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {visit.notes && (
                    <div className="px-1">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">{t('patients.detail.prescription.notesHeading')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 italic">{visit.notes}</p>
                    </div>
                  )}

                  {/* Separator between visits */}
                  {vIdx < totalPrescriptionVisitsCount - 1 && (
                    <hr className="border-slate-200 dark:border-slate-700" />
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              {patient?.email ? (
                <button
                  type="button"
                  onClick={handleSendPrescriptionEmail}
                  disabled={sendingPrescriptionEmail || prescriptionEmailSent}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    prescriptionEmailSent
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-950/50'
                  } disabled:opacity-60`}
                >
                  {prescriptionEmailSent ? (
                    <><Check size={13} className="text-emerald-600" /> Sent to {patient.email}</>
                  ) : sendingPrescriptionEmail ? (
                    <><div className="h-3 w-3 rounded-full border border-primary-500 border-t-transparent animate-spin" /> Sending...</>
                  ) : (
                    <><Mail size={13} /> Send via Email</>  
                  )}
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">No email on file for this patient</span>
              )}
              <Button type="button" onClick={() => { setPrescriptionGroupToView(null); setPrescriptionEmailSent(false); }}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showNoBedsModal}
        onClose={() => setShowNoBedsModal(false)}
        title="⚠️ No Beds Available"
        size="md"
      >
        <div className="space-y-4 p-1">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-400">
            <span className="text-xl">⚠️</span>
            <div className="text-sm">
              <p className="font-semibold">Capacity Warning</p>
              <p className="mt-1">
                There are no beds available at this hospital for the selected dates.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={() => setShowNoBedsModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
