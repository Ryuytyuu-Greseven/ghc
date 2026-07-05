import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { diagnosticTestApi } from '../../services/diagnosticTestApi';
import { useApp } from '../../context/AppContext';
import type {
  DiagnosticTest,
  DiagnosticTestCategory,
  FacilityAvailabilityEntry,
  WritableTestAvailabilityStatus,
} from '../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  initial: DiagnosticTest | null;
  onClose: () => void;
  onSaved: () => void;
}

type CatalogField = 'testName' | 'category';
type CatalogErrors = Partial<Record<CatalogField, string>>;
type CatalogTouched = Partial<Record<CatalogField, boolean>>;

type FacilityField = 'hospitalId' | 'reason';
type FacilityRowErrors = Partial<Record<FacilityField, string>>;
type FacilityRowTouched = Partial<Record<FacilityField, boolean>>;

const writableStatuses: WritableTestAvailabilityStatus[] = [
  'Available',
  'Unavailable',
  'Partial',
  'OutOfOrder',
];

const emptyFacilityRow = (): FacilityAvailabilityEntry => ({
  hospitalId: '',
  status: 'Available',
  reason: '',
});

function validateCatalogForm(
  form: { testName: string; category: string },
  facilityRows: FacilityAvailabilityEntry[],
  t: (key: string, options?: Record<string, string>) => string,
) {
  const errors: CatalogErrors = {};
  const facilityErrors: Record<number, FacilityRowErrors> = {};
  const seenHospitalIds = new Set<string>();

  if (!form.testName.trim()) {
    errors.testName = t('diagnosticTests.catalog.fieldRequired', {
      field: t('diagnosticTests.fields.testName'),
    });
  }

  if (!form.category.trim()) {
    errors.category = t('diagnosticTests.catalog.fieldRequired', {
      field: t('diagnosticTests.fields.category'),
    });
  }

  facilityRows.forEach((row, index) => {
    const rowErrors: FacilityRowErrors = {};

    if (!row.hospitalId) {
      rowErrors.hospitalId = t('diagnosticTests.catalog.fieldRequired', {
        field: t('diagnosticTests.catalog.selectFacility'),
      });
    } else if (seenHospitalIds.has(row.hospitalId)) {
      rowErrors.hospitalId = t('diagnosticTests.catalog.duplicateFacility');
    } else {
      seenHospitalIds.add(row.hospitalId);
    }

    if (row.status !== 'Available' && !row.reason?.trim()) {
      rowErrors.reason = t('diagnosticTests.catalog.fieldRequired', {
        field: t('diagnosticTests.fields.reason'),
      });
    }

    if (Object.keys(rowErrors).length > 0) {
      facilityErrors[index] = rowErrors;
    }
  });

  return { errors, facilityErrors };
}

export function TestCatalogForm({ initial, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { hospitals } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!initial);
  const [saveError, setSaveError] = useState('');

  const categoryOptions = [
    { value: 'Lab', label: t('diagnosticTests.categories.Lab') },
    { value: 'Imaging', label: t('diagnosticTests.categories.Imaging') },
    { value: 'Pathology', label: t('diagnosticTests.categories.Pathology') },
    { value: 'Other', label: t('diagnosticTests.categories.Other') },
  ];

  const statusOptions = [
    { value: 'Active', label: t('diagnosticTests.status.Active') },
    { value: 'Inactive', label: t('diagnosticTests.status.Inactive') },
  ];

  const availabilityStatusOptions = writableStatuses.map((s) => ({
    value: s,
    label: t(`diagnosticTests.availabilityStatus.${s}`),
  }));

  const [form, setForm] = useState({
    testName: initial?.testName ?? '',
    testCode: initial?.testCode ?? '',
    category: (initial?.category ?? 'Lab') as DiagnosticTestCategory,
    sampleType: initial?.sampleType ?? '',
    status: initial?.status ?? 'Active',
  });

  const [facilityRows, setFacilityRows] = useState<FacilityAvailabilityEntry[]>([]);
  const [touched, setTouched] = useState<CatalogTouched>({});
  const [facilityTouched, setFacilityTouched] = useState<Record<number, FacilityRowTouched>>({});

  const { errors, facilityErrors } = validateCatalogForm(form, facilityRows, t);

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    setLoading(true);
    diagnosticTestApi
      .getTest(initial._id)
      .then((test) => {
        if (cancelled) return;
        setFacilityRows(
          test.facilityAvailabilities?.length
            ? test.facilityAvailabilities.map((r) => ({
                hospitalId: r.hospitalId,
                status: r.status,
                reason: r.reason ?? '',
              }))
            : [],
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setSaveError(err instanceof Error ? err.message : t('diagnosticTests.catalog.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial, t]);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const touch = (field: CatalogField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const touchFacility = (index: number, field: FacilityField) => {
    setFacilityTouched((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: true },
    }));
  };

  const errorFor = (field: CatalogField) => (touched[field] ? errors[field] : undefined);

  const facilityErrorFor = (index: number, field: FacilityField) =>
    facilityTouched[index]?.[field] ? facilityErrors[index]?.[field] : undefined;

  const updateFacilityRow = (
    index: number,
    field: keyof FacilityAvailabilityEntry,
    value: string,
  ) => {
    setFacilityRows((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        if (field === 'status') {
          const status = value as WritableTestAvailabilityStatus;
          return {
            ...row,
            status,
            reason: status === 'Available' ? '' : row.reason,
          };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const addFacilityRow = () => {
    setFacilityRows((rows) => [...rows, emptyFacilityRow()]);
  };

  const removeFacilityRow = (index: number) => {
    setFacilityRows((rows) => rows.filter((_, i) => i !== index));
    setFacilityTouched((prev) => {
      const next: Record<number, FacilityRowTouched> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const rowIndex = Number(key);
        if (rowIndex < index) next[rowIndex] = value;
        if (rowIndex > index) next[rowIndex - 1] = value;
      });
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setTouched({ testName: true, category: true });
    setFacilityTouched(
      facilityRows.reduce<Record<number, FacilityRowTouched>>((acc, _row, index) => {
        acc[index] = { hospitalId: true, reason: true };
        return acc;
      }, {}),
    );

    const validation = validateCatalogForm(form, facilityRows, t);
    const hasCatalogErrors = Object.keys(validation.errors).length > 0;
    const hasFacilityErrors = Object.keys(validation.facilityErrors).length > 0;
    if (hasCatalogErrors || hasFacilityErrors) return;

    setSubmitting(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        facilityAvailability: facilityRows.filter((r) => r.hospitalId),
      };
      if (initial) {
        await diagnosticTestApi.updateTest(initial._id, payload);
      } else {
        await diagnosticTestApi.createTest(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('diagnosticTests.catalog.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const usedHospitalIds = new Set(facilityRows.map((r) => r.hospitalId).filter(Boolean));

  if (loading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('diagnosticTests.fields.testName')}
          required
          value={form.testName}
          onChange={(e) => set('testName', e.target.value)}
          onBlur={() => touch('testName')}
          error={errorFor('testName')}
          placeholder={t('diagnosticTests.fields.testNamePlaceholder')}
        />
        <Input
          label={t('diagnosticTests.fields.testCode')}
          value={form.testCode}
          onChange={(e) => set('testCode', e.target.value)}
          placeholder={t('diagnosticTests.fields.testCodePlaceholder')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label={t('diagnosticTests.fields.category')}
          required
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          onBlur={() => touch('category')}
          error={errorFor('category')}
          options={categoryOptions}
        />
        <Input
          label={t('diagnosticTests.fields.sampleType')}
          value={form.sampleType}
          onChange={(e) => set('sampleType', e.target.value)}
          placeholder={t('diagnosticTests.fields.sampleTypePlaceholder')}
        />
      </div>
      {initial && (
        <Select
          label={t('diagnosticTests.fields.status')}
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={statusOptions}
        />
      )}

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('diagnosticTests.catalog.facilityAvailability')}
          </h3>
          <Button type="button" variant="secondary" size="sm" onClick={addFacilityRow}>
            <Plus size={14} className="mr-1" />
            {t('diagnosticTests.catalog.addFacility')}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          {t('diagnosticTests.catalog.facilityAvailabilityHint')}
        </p>

        {facilityRows.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            {t('diagnosticTests.catalog.noFacilitiesAdded')}
          </p>
        ) : (
          <div className="space-y-3">
            {facilityRows.map((row, index) => {
              const hospitalOptions = hospitals
                .filter((h) => h.id === row.hospitalId || !usedHospitalIds.has(h.id))
                .map((h) => ({ value: h.id, label: h.name }));

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700"
                >
                  <div className="col-span-4">
                    <Select
                      label={t('diagnosticTests.catalog.selectFacility')}
                      required
                      value={row.hospitalId}
                      onChange={(e) => updateFacilityRow(index, 'hospitalId', e.target.value)}
                      onBlur={() => touchFacility(index, 'hospitalId')}
                      error={facilityErrorFor(index, 'hospitalId')}
                      options={[
                        { value: '', label: t('diagnosticTests.catalog.selectFacilityPlaceholder') },
                        ...hospitalOptions,
                      ]}
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      label={t('diagnosticTests.fields.status')}
                      value={row.status}
                      onChange={(e) => updateFacilityRow(index, 'status', e.target.value)}
                      options={availabilityStatusOptions}
                    />
                  </div>
                  <div className="col-span-4">
                    {row.status !== 'Available' ? (
                      <Input
                        label={t('diagnosticTests.fields.reason')}
                        required
                        value={row.reason ?? ''}
                        onChange={(e) => updateFacilityRow(index, 'reason', e.target.value)}
                        onBlur={() => touchFacility(index, 'reason')}
                        error={facilityErrorFor(index, 'reason')}
                        placeholder={t('diagnosticTests.fields.reasonPlaceholder')}
                      />
                    ) : (
                      <p className="text-xs text-slate-400 pt-7">
                        {t('diagnosticTests.catalog.reasonNotRequired')}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end pt-7">
                    <button
                      type="button"
                      onClick={() => removeFacilityRow(index)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? t('common.saving')
            : initial
              ? t('common.saveChanges')
              : t('diagnosticTests.catalog.addTest')}
        </Button>
      </div>
    </form>
  );
}
