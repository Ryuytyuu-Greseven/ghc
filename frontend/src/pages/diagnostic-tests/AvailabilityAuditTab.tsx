import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { Select as CustomSelect } from '../../components/ui/Select';
import { useApp } from '../../context/AppContext';
import { diagnosticTestApi } from '../../services/diagnosticTestApi';
import type { PaginatedResponse, TestAvailabilityAudit, TestAvailabilityStatus } from '../../types';
import { useTranslation } from 'react-i18next';

const statusVariant: Record<
  TestAvailabilityStatus,
  'success' | 'danger' | 'warning' | 'default'
> = {
  Available: 'success',
  Unavailable: 'danger',
  Partial: 'warning',
  OutOfOrder: 'default',
  NotAudited: 'default',
};

export function AvailabilityAuditTab() {
  const { t, i18n } = useTranslation();
  const { hospitals, currentUser, staff } = useApp();
  const [audits, setAudits] = useState<TestAvailabilityAudit[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<TestAvailabilityAudit>['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hospitalFilter, setHospitalFilter] = useState('');

  const isAdmin = currentUser?.role === 'Admin';
  const currentStaff = staff.find(
    (s) => s.userId === currentUser?.id || s.username === currentUser?.username,
  );
  const userHospitalId = currentStaff?.assignedHospitalId;

  const hospitalOptions = isAdmin
    ? [{ value: '', label: t('common.all') }, ...hospitals.map((h) => ({ value: h.id, label: h.name }))]
    : [];

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      params.append('sortBy', 'auditedAt');
      params.append('sortOrder', 'desc');
      if (isAdmin && hospitalFilter) {
        params.append('hospitalId', hospitalFilter);
      }

      const data = await diagnosticTestApi.getAuditLog(params.toString());
      setAudits(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diagnosticTests.audit.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, hospitalFilter, isAdmin, t]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  const getTestName = (audit: TestAvailabilityAudit) => {
    if (typeof audit.testId === 'object' && audit.testId?.testName) {
      return audit.testId.testName;
    }
    return audit.testId as string;
  };

  const getHospitalName = (audit: TestAvailabilityAudit) => {
    if (typeof audit.hospitalId === 'object' && audit.hospitalId?.name) {
      return audit.hospitalId.name;
    }
    const id = typeof audit.hospitalId === 'string' ? audit.hospitalId : '';
    return hospitals.find((h) => h.id === id || h._id === id)?.name ?? id;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {isAdmin && (
          <div className="w-72">
            <CustomSelect
              label={t('diagnosticTests.audit.filterFacility')}
              value={hospitalFilter}
              onChange={(e) => { setHospitalFilter(e.target.value); setPage(1); }}
              options={hospitalOptions}
            />
          </div>
        )}

        {!isAdmin && userHospitalId && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('diagnosticTests.audit.scopedToFacility')}
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t('diagnosticTests.audit.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.audit.when')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.audit.facility')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.testName')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.audit.change')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit._id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(audit.auditedAt).toLocaleString(i18n.language)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{getHospitalName(audit)}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{getTestName(audit)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={statusVariant[audit.previousStatus]}>
                            {t(`diagnosticTests.availabilityStatus.${audit.previousStatus}`)}
                          </Badge>
                          <span className="text-slate-400">→</span>
                          <Badge variant={statusVariant[audit.newStatus]}>
                            {t(`diagnosticTests.availabilityStatus.${audit.newStatus}`)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{audit.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && (
          <PaginationControls
            meta={pagination}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
