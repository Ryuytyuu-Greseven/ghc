import { useState, useEffect } from 'react';
import { Plus, Warehouse, Trash2, AlertTriangle, Clock, Search, Eye, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { useInventory } from '../../context/InventoryContext';
import { AddStockForm } from './AddStockForm';
import { InventoryDetailModal } from './InventoryDetailModal';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const isExpiringSoon = (date: string | null): boolean => {
  if (!date) return false;
  return new Date(date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
};

const isExpired = (date: string | null): boolean => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export function CentralInventoryTab() {
  const { t, i18n } = useTranslation();
  const {
    centralStock,
    centralPagination,
    centralSummary,
    loadingCentral,
    error,
    actionError,
    clearActionError,
    loadCentralStock,
    removeCentralStock,
  } = useInventory();

  const [addOpen, setAddOpen] = useState(false);

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterType, setFilterType] = useState<'All' | 'Low Stock' | 'Expired' | 'Expiring Soon'>('All');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewEntry, setViewEntry] = useState<typeof centralStock[number] | null>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  // Load stock on state change
  useEffect(() => {
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

    loadCentralStock(params.toString());
  }, [page, pageSize, sortBy, sortOrder, filterCat, filterType, search, loadCentralStock]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleRemove = async (id: string) => {
    if (confirm(t('inventory.central.removeConfirm'))) {
      await removeCentralStock(id);
    }
  };

  // Pull stats from summary block
  const totalAvailable = centralSummary?.totalAvailable ?? 0;
  const totalDamaged = centralSummary?.totalDamaged ?? 0;
  const lowStockCount = centralSummary?.lowStockCount ?? 0;
  const expiringCount = centralSummary?.expiringCount ?? 0;
  const totalLines = centralPagination?.totalRecords ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('inventory.central.totalStockLines')}
            value={totalLines}
            icon={<Warehouse size={20} className="text-cyan-600 dark:text-cyan-400" />}
            color="bg-cyan-50 dark:bg-cyan-900/30"
          />
          <StatCard
            label={t('inventory.central.totalAvailableQty')}
            value={totalAvailable.toLocaleString()}
            icon={<Warehouse size={20} className="text-emerald-600 dark:text-emerald-400" />}
            color="bg-emerald-50 dark:bg-emerald-900/30"
          />
          <StatCard
            label={t('inventory.central.totalDamaged')}
            value={totalDamaged.toLocaleString()}
            icon={<AlertTriangle size={20} className="text-red-600 dark:text-red-400" />}
            color="bg-red-50 dark:bg-red-900/30"
          />
          <StatCard
            label={t('inventory.central.lowStockAlerts')}
            value={lowStockCount}
            icon={<AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />}
            color="bg-amber-50 dark:bg-amber-900/30"
            sub={t('inventory.central.expiring90Days', { count: expiringCount })}
          />
        </div>

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
                placeholder={t('inventory.central.searchPlaceholder')}
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

          <Button onClick={() => setAddOpen(true)}>
            <Plus size={15} /> {t('inventory.central.addStock')}
          </Button>
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
            {loadingCentral ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm min-w-[900px]">
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
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                      {t('inventory.fields.updated')}
                    </th>
                    <th className="px-5 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {centralStock.map((entry) => {
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
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span
                            className={clsx(
                              'tabular-nums',
                              entry.damagedQty > 0
                                ? 'text-red-500 dark:text-red-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {entry.damagedQty.toLocaleString()}
                          </span>
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
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs hidden xl:table-cell">
                          {new Date(entry.updatedAt).toLocaleDateString(i18n.language, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setViewEntry(entry)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition"
                              title={t('common.viewDetails')}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleRemove(entry._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                              title={t('inventory.central.removeEntry')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {centralStock.length === 0 && !loadingCentral && (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Warehouse size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">
                {t('inventory.central.noStockFound')}
              </p>
              <p className="text-sm mt-1">{t('inventory.central.noStockFoundDesc')}</p>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingCentral && (
            <PaginationControls
              meta={centralPagination}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('inventory.central.addStock')}>
        <AddStockForm onClose={() => setAddOpen(false)} />
      </Modal>

      {viewEntry && (
        <InventoryDetailModal
          open={true}
          onClose={() => setViewEntry(null)}
          title={t('inventory.central.detailsTitle')}
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
            {
              label: t('inventory.fields.updated'),
              value: new Date(viewEntry.updatedAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }),
            },
          ]}
        />
      )}
    </div>
  );
}
