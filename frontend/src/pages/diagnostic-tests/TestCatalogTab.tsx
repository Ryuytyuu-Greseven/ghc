import { useState, useEffect, useCallback } from 'react';
import { Plus, FlaskConical, Pencil, PowerOff, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { diagnosticTestApi } from '../../services/diagnosticTestApi';
import type { DiagnosticTest, DiagnosticTestCategory, PaginatedResponse } from '../../types';
import { TestCatalogForm } from './TestCatalogForm';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const categories: (DiagnosticTestCategory | 'All')[] = [
  'All',
  'Lab',
  'Imaging',
  'Pathology',
  'Other',
];

const categoryVariant: Record<
  DiagnosticTestCategory,
  'success' | 'info' | 'warning' | 'default'
> = {
  Lab: 'success',
  Imaging: 'info',
  Pathology: 'warning',
  Other: 'default',
};

export function TestCatalogTab() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<DiagnosticTest>['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticTest | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<DiagnosticTestCategory | 'All'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      params.append('sortBy', 'testName');
      params.append('sortOrder', 'asc');
      params.append('status', 'Active');
      if (filterCat !== 'All') params.append('category', filterCat);
      if (search.trim()) params.append('search', search.trim());

      const data = await diagnosticTestApi.getTests(params.toString());
      setTests(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diagnosticTests.catalog.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterCat, search, t]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const handleDeactivate = async (test: DiagnosticTest) => {
    if (!confirm(t('diagnosticTests.catalog.deactivateConfirm', { name: test.testName }))) return;
    try {
      await diagnosticTestApi.deleteTest(test._id);
      loadTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diagnosticTests.catalog.saveError'));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setFilterCat(c); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterCat === c
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {c === 'All' ? t('common.all') : t(`diagnosticTests.categories.${c}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('diagnosticTests.catalog.searchPlaceholder')}
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-56"
              />
            </div>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={16} className="mr-1.5" />
              {t('diagnosticTests.catalog.addTest')}
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
          ) : tests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t('diagnosticTests.catalog.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.testName')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.testCode')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.category')}</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('diagnosticTests.fields.sampleType')}</th>
                    <th className="text-right px-5 py-3 font-medium text-slate-600 dark:text-slate-400">{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test._id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{test.testName}</td>
                      <td className="px-5 py-3.5 text-slate-500">{test.testCode || '—'}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={categoryVariant[test.category]}>
                          {t(`diagnosticTests.categories.${test.category}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{test.sampleType || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditing(test); setFormOpen(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                            title={t('common.edit')}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeactivate(test)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title={t('diagnosticTests.catalog.deactivate')}
                          >
                            <PowerOff size={15} />
                          </button>
                        </div>
                      </td>
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('diagnosticTests.catalog.editTest') : t('diagnosticTests.catalog.addTest')}
      >
        <TestCatalogForm
          initial={editing}
          onClose={() => setFormOpen(false)}
          onSaved={loadTests}
        />
      </Modal>
    </div>
  );
}
