import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Eye } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { PaginationControls } from '../components/ui/PaginationControls';
import { Modal } from '../components/ui/Modal';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../context/AppContext';
import type { AuditLog, PaginatedResponse, PaginationMeta } from '../types';
import { environment } from '@env/environment';

const BASE = environment.mainBackendUrl;

const typeVariant: Record<
  string,
  'success' | 'info' | 'purple' | 'warning' | 'danger' | 'default'
> = {
  PURCHASE: 'success',
  TRANSFER: 'info',
  ISSUE: 'purple',
  RETURN: 'warning',
  DAMAGE: 'danger',
  EXPIRY: 'danger',
  ADJUSTMENT: 'default',
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'success',
  LOGIN_FAILURE: 'danger',
  LOGOUT: 'default',
};

const moduleVariant: Record<string, string> = {
  auth: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200/30',
  hospitals: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/30',
  patients: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200/30',
  staff: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/30',
  inventory: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200/30',
  general: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border border-slate-200/30',
};

export function Audits() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Filter States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [performer, setPerformer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewAudit, setViewAudit] = useState<AuditLog | null>(null);

  const fetchAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');

      if (selectedModule !== 'All') {
        params.append('module', selectedModule);
      }
      if (selectedAction !== 'All') {
        params.append('action', selectedAction);
      }
      if (performer.trim()) {
        params.append('performedBy', performer.trim());
      }
      if (fromDate) {
        params.append('fromDate', fromDate);
      }
      if (toDate) {
        params.append('toDate', toDate);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await authFetch(`${BASE}/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch system audit logs');
      }
      const data = (await res.json()) as PaginatedResponse<AuditLog>;
      setAudits(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [page, pageSize, selectedModule, selectedAction, performer, fromDate, toDate, search]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        
        {/* Header Title with saffron-white-green premium accent border */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-t-primary-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-primary-500/10 rounded-bl-full flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('nav.audits') || 'System Audit Logs'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Track and review all user actions, security logs, and updates across the platform.
          </p>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit message..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              />
            </div>

            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
            >
              <option value="All">All Modules</option>
              <option value="auth">Authentication (Auth)</option>
              <option value="hospitals">Hospitals</option>
              <option value="patients">Patients</option>
              <option value="staff">Staff</option>
              <option value="inventory">Inventory</option>
            </select>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILURE">LOGIN FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="PURCHASE">PURCHASE</option>
            </select>

            {/* Performer Filter */}
            <input
              type="text"
              placeholder="Performed by username..."
              value={performer}
              onChange={(e) => {
                setPerformer(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition min-w-[180px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase">Date Range</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-lg text-xs focus:outline-none transition"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 rounded-lg text-xs focus:outline-none transition"
            />
          </div>
        </div>

        {/* Results list */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 text-slate-500">Loading audit logs...</div>
            ) : error ? (
              <div className="text-center py-20 text-red-500">{error}</div>
            ) : (
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-32">Module</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-32">Action</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Descriptive Log Message</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-48">Performer</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-48">Date & Time</th>
                    <th className="px-6 py-3.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {audits.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${moduleVariant[tx.module] || moduleVariant.general}`}>
                          {tx.module}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={typeVariant[tx.action] || 'default'}>{tx.action}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-100 font-medium">
                        {tx.message}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-350 font-medium">
                        {tx.performedBy} {tx.performedByRole ? <span className="text-slate-400 dark:text-slate-500 font-normal">({tx.performedByRole})</span> : ''}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString(i18n.language, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewAudit(tx)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition"
                          title="View Payload Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {audits.length === 0 && !loading && !error && (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <ShieldCheck size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-slate-500 dark:text-slate-400">No audit logs found</p>
              <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">Try adjusting your filters or search terms.</p>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && (
            <PaginationControls
              meta={pagination}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* Audit Detail Modal */}
      {viewAudit && (
        <Modal
          open={true}
          onClose={() => setViewAudit(null)}
          title="System Audit Log Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Module</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5 capitalize">{viewAudit.module}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Action</p>
                <div className="mt-0.5">
                  <Badge variant={typeVariant[viewAudit.action] || 'default'}>{viewAudit.action}</Badge>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Descriptive Log Message</p>
              <p className="text-sm text-slate-800 dark:text-slate-100 font-medium mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                {viewAudit.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-b-slate-100 dark:border-b-slate-700/60 pb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Performed By</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {viewAudit.performedBy} {viewAudit.performedByRole ? `(${viewAudit.performedByRole})` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Timestamp</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {new Date(viewAudit.createdAt).toLocaleString(i18n.language, {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Raw Metadata Payload</p>
              {viewAudit.metadata ? (
                <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-[11px] font-mono text-slate-750 dark:text-slate-300 overflow-auto max-h-60 border border-slate-100 dark:border-slate-800 select-all whitespace-pre-wrap">
                  {JSON.stringify(viewAudit.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 italic">No raw payload associated with this action.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
