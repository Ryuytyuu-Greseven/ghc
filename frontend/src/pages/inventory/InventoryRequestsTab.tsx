import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Eye, CheckCircle, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useInventory } from '../../context/InventoryContext';
import { useApp } from '../../context/AppContext';
import type { InventoryRequest, RequestStatus } from '../../types';
import { RequestForm } from './RequestForm';
import { RequestDetailModal } from './RequestDetailModal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useTranslation } from 'react-i18next';

const statusVariant: Record<RequestStatus, 'warning' | 'success' | 'danger' | 'purple'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Partial: 'purple',
};

export function InventoryRequestsTab() {
  const { t, i18n } = useTranslation();
  const { requests, requestsPagination, loadingRequests, error, actionError, clearActionError, loadRequests } = useInventory();
  const { hospitals, currentUser, staff } = useApp();

  const isAdmin = currentUser?.role === 'Admin';
  const currentStaff = staff.find((s) => s.userId === currentUser?.id || s.username === currentUser?.username);
  const userHospitalId = currentStaff?.assignedHospitalId;
  const assignedHospital = hospitals.find((h) => h.id === userHospitalId || h._id === userHospitalId);

  const [newReqOpen, setNewReqOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<InventoryRequest | null>(null);

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'All'>('All');
  const [selectedBranchId, setSelectedBranchId] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isAdmin && assignedHospital && selectedBranchId === 'All') {
      setSelectedBranchId(assignedHospital.id);
    }
  }, [isAdmin, assignedHospital, selectedBranchId]);

  const branchOptions = isAdmin
    ? hospitals.map((h) => ({ value: h.id, label: h.name }))
    : assignedHospital
    ? [{ value: assignedHospital.id, label: assignedHospital.name }]
    : [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  // Load requests on state changes
  useEffect(() => {
    if (!isAdmin && !assignedHospital) {
      return;
    }

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    if (filterStatus !== 'All') {
      params.append('status', filterStatus);
    }
    if (!isAdmin && assignedHospital) {
      params.append('branchId', assignedHospital.id);
    } else if (selectedBranchId !== 'All') {
      params.append('branchId', selectedBranchId);
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

    loadRequests(params.toString());
  }, [page, pageSize, sortBy, sortOrder, filterStatus, selectedBranchId, fromDate, toDate, search, loadRequests, isAdmin, assignedHospital]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getBranchInfo = (branchId: any) => {
    if (typeof branchId === 'object' && branchId !== null) {
      return branchId;
    }
    const hosp = hospitals.find((h) => h.id === branchId);
    return hosp ? { name: hosp.name, city: hosp.city } : { name: branchId, city: '' };
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder={t('inventory.requests.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full transition"
              />
            </div>

            {/* Status Select */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="All">{t('inventory.requests.allStatuses')}</option>
              <option value="Pending">{t('inventory.status.Pending')}</option>
              <option value="Approved">{t('inventory.status.Approved')}</option>
              <option value="Rejected">{t('inventory.status.Rejected')}</option>
              <option value="Partial">{t('inventory.status.Partial')}</option>
            </select>

            {/* Branch Select */}
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[180px]"
            >
              {isAdmin && <option value="All">{t('inventory.branch.allBranches')}</option>}
              {branchOptions.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span>{t('inventory.requests.to')}</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {!isAdmin && (
            <Button onClick={() => setNewReqOpen(true)}>
              <Plus size={15} /> {t('inventory.requests.raiseRequest')}
            </Button>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {/* Action error banner */}
        {actionError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            <span className="flex-1">{actionError}</span>
            <button onClick={clearActionError} className="shrink-0 hover:text-red-800 dark:hover:text-red-200 transition" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Table container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th
                      onClick={() => handleSort('requestNumber')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.requests.requestNumber')}
                        {sortBy === 'requestNumber' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('branchName')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.requests.branch')}
                        {sortBy === 'branchName' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('requestedBy')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.requests.requestedBy')}
                        {sortBy === 'requestedBy' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                      {t('inventory.requests.itemsCount')}
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.requests.status')}
                        {sortBy === 'status' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.requests.date')}
                        {sortBy === 'createdAt' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {requests.map((r) => {
                    const branch = getBranchInfo(r.branchId);
                    return (
                      <tr
                        key={r._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {r.requestNumber}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {branch.name}
                            </span>
                            <span className="text-xs text-slate-400">{branch.city}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                          {r.requestedBy}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell font-mono">
                          {t('inventory.requests.itemsCountText', { count: r.items.length })}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(r.createdAt).toLocaleDateString(i18n.language, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setDetailRequest(r)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                            title={r.status === 'Pending' && isAdmin ? t('inventory.requests.reviewFulfill') : t('common.viewDetails')}
                          >
                            {r.status === 'Pending' && isAdmin ? (
                              <CheckCircle size={15} className="text-emerald-500" />
                            ) : (
                              <Eye size={15} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {requests.length === 0 && !loadingRequests && (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">{t('inventory.requests.noRequestsFound')}</p>
              <p className="text-sm mt-1">{t('inventory.requests.noRequestsFoundDesc')}</p>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingRequests && (
            <PaginationControls
              meta={requestsPagination}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      <Modal open={newReqOpen} onClose={() => setNewReqOpen(false)} title={t('inventory.requests.newRequest')}>
        <RequestForm onClose={() => setNewReqOpen(false)} />
      </Modal>

      {detailRequest && (
        <Modal
          open={!!detailRequest}
          onClose={() => setDetailRequest(null)}
          title={`${t('inventory.requests.requestDetails')}: ${detailRequest.requestNumber}`}
        >
          <RequestDetailModal request={detailRequest} onClose={() => setDetailRequest(null)} />
        </Modal>
      )}
    </div>
  );
}
