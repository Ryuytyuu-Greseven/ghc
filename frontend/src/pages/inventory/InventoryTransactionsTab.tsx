import { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useInventory } from '../../context/InventoryContext';
import { useApp } from '../../context/AppContext';
import type { TransactionType } from '../../types';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { InventoryDetailModal } from './InventoryDetailModal';
import { useTranslation } from 'react-i18next';

const typeVariant: Record<
  TransactionType,
  'success' | 'info' | 'purple' | 'warning' | 'danger' | 'default'
> = {
  Purchase: 'success',
  Transfer: 'info',
  Issue: 'purple',
  Return: 'warning',
  Damage: 'danger',
  Expiry: 'danger',
  Adjustment: 'default',
};

export function InventoryTransactionsTab() {
  const { t, i18n } = useTranslation();
  const { transactions, transactionsPagination, loadingTransactions, error, loadTransactions } =
    useInventory();
  const { hospitals } = useApp();

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'All'>('All');
  const [selectedBranchId, setSelectedBranchId] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewTx, setViewTx] = useState<typeof transactions[number] | null>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  // Load transactions on query state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    if (filterType !== 'All') {
      params.append('transactionType', filterType);
    }
    if (selectedBranchId !== 'All') {
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

    loadTransactions(params.toString());
  }, [page, pageSize, sortBy, sortOrder, filterType, selectedBranchId, fromDate, toDate, search, loadTransactions]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const resolveLocation = (loc: string) => {
    if (!loc) return '—';
    if (loc === 'Central') return t('inventory.transactions.centralStore');
    if (loc === 'External') return t('inventory.transactions.externalLocation');
    const hosp = hospitals.find((h) => h.id === loc);
    return hosp ? hosp.name : loc;
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
                placeholder={t('inventory.transactions.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full transition"
              />
            </div>

            {/* Type Select */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="All">{t('inventory.transactions.allTypes')}</option>
              <option value="Purchase">{t('inventory.transactions.types.Purchase')}</option>
              <option value="Transfer">{t('inventory.transactions.types.Transfer')}</option>
              <option value="Issue">{t('inventory.transactions.types.Issue')}</option>
              <option value="Return">{t('inventory.transactions.types.Return')}</option>
              <option value="Damage">{t('inventory.transactions.types.Damage')}</option>
              <option value="Expiry">{t('inventory.transactions.types.Expiry')}</option>
              <option value="Adjustment">{t('inventory.transactions.types.Adjustment')}</option>
            </select>

            {/* Location Selector */}
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[180px]"
            >
              <option value="All">{t('inventory.transactions.allLocations')}</option>
              <option value="Central">{t('inventory.transactions.centralStore')}</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
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
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Table container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm min-w-[850px]">
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
                      onClick={() => handleSort('transactionType')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.transactions.transactionType')}
                        {sortBy === 'transactionType' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('quantity')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.transactions.quantity')}
                        {sortBy === 'quantity' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('inventory.transactions.fromLocation')}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('inventory.transactions.toLocation')}
                    </th>
                    <th
                      onClick={() => handleSort('requestNumber')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none hidden md:table-cell transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.transactions.requestRef')}
                        {sortBy === 'requestNumber' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('performedBy')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.transactions.performedBy')}
                        {sortBy === 'performedBy' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {t('inventory.transactions.date')}
                        {sortBy === 'createdAt' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {tx.itemId?.itemName ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={typeVariant[tx.transactionType]}>{t(`inventory.transactions.types.${tx.transactionType}`)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        {tx.quantity.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {resolveLocation(tx.fromLocation)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {resolveLocation(tx.toLocation)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {tx.requestId?.requestNumber ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {tx.performedBy}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString(i18n.language, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setViewTx(tx)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition"
                          title={t('common.viewDetails')}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {transactions.length === 0 && !loadingTransactions && (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <ArrowLeftRight size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">
                {t('inventory.transactions.noTransactionsFound')}
              </p>
              <p className="text-sm mt-1">{t('inventory.transactions.noTransactionsFoundDesc')}</p>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingTransactions && (
            <PaginationControls
              meta={transactionsPagination}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {viewTx && (
        <InventoryDetailModal
          open={true}
          onClose={() => setViewTx(null)}
          title={t('inventory.transactions.detailsTitle')}
          fields={[
            { label: t('inventory.fields.itemName'), value: viewTx.itemId?.itemName },
            { label: t('inventory.transactions.transactionType'), value: <Badge variant={typeVariant[viewTx.transactionType]}>{t(`inventory.transactions.types.${viewTx.transactionType}`)}</Badge> },
            { label: t('inventory.transactions.quantity'), value: viewTx.quantity.toLocaleString() },
            { label: t('inventory.transactions.fromLocation'), value: resolveLocation(viewTx.fromLocation) },
            { label: t('inventory.transactions.toLocation'), value: resolveLocation(viewTx.toLocation) },
            { label: t('inventory.transactions.requestRef'), value: viewTx.requestId?.requestNumber || '—' },
            { label: t('inventory.transactions.performedBy'), value: viewTx.performedBy },
            {
              label: t('inventory.transactions.date'),
              value: new Date(viewTx.createdAt).toLocaleDateString(i18n.language, {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              }),
              full: true,
            },
          ]}
        />
      )}
    </div>
  );
}
