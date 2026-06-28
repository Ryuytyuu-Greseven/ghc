import { useState, useEffect } from 'react';
import { GitBranch, Info, Clock, Search, Eye, X } from 'lucide-react';
import { Select as CustomSelect } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { InventoryDetailModal } from './InventoryDetailModal';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const isExpired = (date: string | null): boolean => {
  if (!date) return false;
  return new Date(date) < new Date();
};

const isExpiringSoon = (date: string | null): boolean => {
  if (!date) return false;
  return new Date(date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
};

export function BranchInventoryTab() {
  const { t, i18n } = useTranslation();
  const { hospitals } = useApp();
  const { branchStock, branchPagination, loadingBranch, error, actionError, clearActionError, loadBranchStock } = useInventory();
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterType, setFilterType] = useState<'All' | 'Low Stock' | 'Expired' | 'Expiring Soon'>('All');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewEntry, setViewEntry] = useState<typeof branchStock[number] | null>(null);

  const branchOptions = hospitals.map((h) => ({ value: h.id, label: h.name }));

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  // Load branch stock on state change
  useEffect(() => {
    if (!selectedBranchId) return;

    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    if (filterCat !== 'All') {
      params.append('category', filterCat);
    }
    if (filterType === 'Low Stock') {
      params.append('lowStock', 'true');
    } else if (filterType === 'Expired') {
      params.append('expired', 'true');
    } else if (filterType === 'Expiring Soon') {
      params.append('expiringSoon', 'true');
    }

    if (search.trim()) {
      params.append('search', search.trim());
    }

    loadBranchStock(selectedBranchId, params.toString());
  }, [selectedBranchId, page, pageSize, sortBy, sortOrder, filterCat, filterType, search, loadBranchStock]);

  const handleBranchChange = (id: string) => {
    setSelectedBranchId(id);
    setPage(1);
    setSearch('');
    setFilterCat('All');
    setFilterType('All');
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-4 py-3 shadow-sm">
          <Info size={16} className="text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
          <p className="text-sm text-cyan-700 dark:text-cyan-300">
            {t('inventory.branch.infoBanner')}
          </p>
        </div>

        {/* Branch selector */}
        <div className="max-w-sm">
          <CustomSelect
            label={t('inventory.branch.selectBranch')}
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            options={branchOptions}
            placeholder={t('inventory.branch.chooseBranchPlaceholder')}
          />
        </div>

        {/* Toolbar (Only shown when branch is selected) */}
        {selectedBranchId && (
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder={t('inventory.branch.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full transition"
              />
            </div>

            {/* Category Selector */}
            <select
              value={filterCat}
              onChange={(e) => {
                setFilterCat(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="All">{t('inventory.central.allCategories')}</option>
              <option value="Medicine">{t('inventory.categories.Medicine')}</option>
              <option value="Equipment">{t('inventory.categories.Equipment')}</option>
              <option value="Consumable">{t('inventory.categories.Consumable')}</option>
              <option value="Surgical">{t('inventory.categories.Surgical')}</option>
              <option value="Diagnostic">{t('inventory.categories.Diagnostic')}</option>
              <option value="Other">{t('inventory.categories.Other')}</option>
            </select>

            {/* Alert/Type filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="All">{t('inventory.central.allStock')}</option>
              <option value="Low Stock">{t('inventory.central.lowStockAlerts')}</option>
              <option value="Expired">{t('inventory.central.expiredStock')}</option>
              <option value="Expiring Soon">{t('inventory.central.expiringSoon90')}</option>
            </select>
          </div>
        )}

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

        {/* Content area */}
        {!selectedBranchId ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <GitBranch size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500 dark:text-slate-400">
              {t('inventory.branch.selectBranchPrompt')}
            </p>
            <p className="text-sm mt-1">
              {t('inventory.branch.selectBranchPromptDesc')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              {loadingBranch ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <table className="w-full text-sm min-w-[750px]">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th
                        onClick={() => handleSort('itemName')}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {t('inventory.fields.itemName')}
                          {sortBy === 'itemName' && (
                            <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('batchNo')}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {t('inventory.fields.batchNo')}
                          {sortBy === 'batchNo' && (
                            <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('availableQty')}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {t('inventory.fields.available')}
                          {sortBy === 'availableQty' && (
                            <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('damagedQty')}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none hidden lg:table-cell transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {t('inventory.fields.damaged')}
                          {sortBy === 'damagedQty' && (
                            <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('expiryDate')}
                        className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {t('inventory.fields.expiryDate')}
                          {sortBy === 'expiryDate' && (
                            <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-5 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {branchStock.map((entry) => {
                      const expired = isExpired(entry.expiryDate);
                      const expiring = isExpiringSoon(entry.expiryDate) && !expired;
                      const lowStock = entry.availableQty < 50;
                      return (
                        <tr
                          key={entry._id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {entry.itemId?.itemName ?? '—'}
                              </span>
                              {lowStock && <Badge variant="warning">{t('inventory.fields.lowStock')}</Badge>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                            {entry.batchNo || '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={clsx(
                                'font-semibold tabular-nums',
                                lowStock
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-800 dark:text-slate-200',
                              )}
                            >
                              {entry.availableQty.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden lg:table-cell tabular-nums">
                            {entry.damagedQty.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            {entry.expiryDate ? (
                              <div className="flex items-center gap-1.5">
                                {(expired || expiring) && (
                                  <Clock
                                    size={13}
                                    className={
                                      expired
                                        ? 'text-red-500 dark:text-red-400'
                                        : 'text-amber-500 dark:text-amber-400'
                                    }
                                  />
                                )}
                                <span
                                  className={clsx(
                                    'text-sm',
                                    expired
                                      ? 'text-red-500 dark:text-red-400 font-medium'
                                      : expiring
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : 'text-slate-500 dark:text-slate-400',
                                  )}
                                >
                                  {new Date(entry.expiryDate).toLocaleDateString(i18n.language, {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                {expired && <Badge variant="danger">{t('inventory.fields.expired')}</Badge>}
                                {expiring && <Badge variant="warning">{t('inventory.fields.soon')}</Badge>}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setViewEntry(entry)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition"
                              title={t('common.viewDetails')}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {branchStock.length === 0 && !loadingBranch && (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <GitBranch size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500 dark:text-slate-400">
                  {t('inventory.branch.noStockFound')}
                </p>
                <p className="text-sm mt-1">{t('inventory.branch.noStockFoundDesc')}</p>
              </div>
            )}

            {/* Pagination Controls */}
            {!loadingBranch && (
              <PaginationControls
                meta={branchPagination}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>

      {viewEntry && (
        <InventoryDetailModal
          open={true}
          onClose={() => setViewEntry(null)}
          title={t('inventory.branch.detailsTitle')}
          fields={[
            { label: t('inventory.fields.itemName'), value: viewEntry.itemId?.itemName },
            { label: t('inventory.fields.category'), value: viewEntry.itemId?.category ? t(`inventory.categories.${viewEntry.itemId.category}`) : '—' },
            { label: t('inventory.fields.batchNo'), value: viewEntry.batchNo || '—' },
            { label: t('inventory.fields.available'), value: viewEntry.availableQty.toLocaleString() },
            { label: t('inventory.fields.damaged'), value: viewEntry.damagedQty.toLocaleString() },
            {
              label: t('inventory.fields.expiryDate'),
              value: viewEntry.expiryDate
                ? new Date(viewEntry.expiryDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })
                : '—',
            },
          ]}
        />
      )}
    </div>
  );
}
