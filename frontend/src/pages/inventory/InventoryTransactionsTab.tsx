import { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useInventory } from '../../context/InventoryContext';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { InventoryDetailModal } from './InventoryDetailModal';
import { useTranslation } from 'react-i18next';

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
};

export function InventoryTransactionsTab() {
  const { t, i18n } = useTranslation();
  const { transactions, transactionsPagination, loadingTransactions, loadTransactions } =
    useInventory();

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | 'All'>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
    params.append('sortBy', 'createdAt');
    params.append('sortOrder', 'desc');

    if (filterType !== 'All') {
      params.append('action', filterType);
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
  }, [page, pageSize, filterType, fromDate, toDate, search, loadTransactions]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('inventory.transactions.searchPlaceholder') || 'Search transactions...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
            >
              <option value="All">{t('inventory.transactions.allTypes') || 'All Actions'}</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:outline-none transition"
              placeholder="From"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-lg text-xs focus:outline-none transition"
              placeholder="To"
            />
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loadingTransactions ? (
              <div className="text-center py-16 text-slate-500">{t('common.loading') || 'Loading...'}</div>
            ) : (
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Action</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Message</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Performed By</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Badge variant={typeVariant[tx.action] || 'default'}>{tx.action}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 dark:text-slate-200 font-medium">
                        {tx.message}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                        {tx.performedBy} {tx.performedByRole ? `(${tx.performedByRole})` : ''}
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
                {t('inventory.transactions.noTransactionsFound') || 'No transactions found'}
              </p>
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
          title="Audit Details"
          fields={[
            { label: 'Module', value: viewTx.module },
            { label: 'Action', value: <Badge variant={typeVariant[viewTx.action] || 'default'}>{viewTx.action}</Badge> },
            { label: 'Message', value: viewTx.message, full: true },
            { label: 'Performed By', value: `${viewTx.performedBy} ${viewTx.performedByRole ? `(${viewTx.performedByRole})` : ''}` },
            {
              label: 'Timestamp',
              value: new Date(viewTx.createdAt).toLocaleString(i18n.language, {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
              }),
              full: true,
            },
            {
              label: 'Payload Details',
              value: viewTx.metadata ? <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-[10px] overflow-auto text-slate-600 dark:text-slate-350 w-full max-h-60 whitespace-pre-wrap">{JSON.stringify(viewTx.metadata, null, 2)}</pre> : 'None',
              full: true,
            }
          ]}
        />
      )}
    </div>
  );
}
