import { useState, useEffect } from 'react';
import { Plus, Package, Pencil, PowerOff, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useInventory } from '../../context/InventoryContext';
import type { InventoryMaster, InventoryCategory } from '../../types';
import { InventoryMasterForm } from './InventoryMasterForm';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { clsx } from 'clsx';

const categoryVariant: Record<
  InventoryCategory,
  'success' | 'info' | 'warning' | 'purple' | 'default'
> = {
  Medicine: 'success',
  Equipment: 'info',
  Consumable: 'warning',
  Surgical: 'purple',
  Diagnostic: 'info',
  Other: 'default',
};

const categories: (InventoryCategory | 'All')[] = [
  'All',
  'Medicine',
  'Equipment',
  'Consumable',
  'Surgical',
  'Diagnostic',
  'Other',
];

export function InventoryMasterTab() {
  const { masters, mastersPagination, loadingMasters, error, loadMasters, deleteMaster } =
    useInventory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryMaster | null>(null);

  // Search, Sort, Filter, Page States
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<InventoryCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState('itemName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
      setPage(1);
    }
  };

  // Load masters on query state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    if (filterCat !== 'All') {
      params.append('category', filterCat);
    }
    if (search.trim()) {
      params.append('search', search.trim());
    }

    loadMasters(params.toString());
  }, [page, pageSize, sortBy, sortOrder, filterCat, search, loadMasters]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: InventoryMaster) => {
    setEditing(m);
    setFormOpen(true);
  };

  const handleDeactivate = async (m: InventoryMaster) => {
    if (
      confirm(
        `Deactivate "${m.itemName}"? It will be marked as Inactive and hidden from active lists.`,
      )
    ) {
      await deleteMaster(m._id);
    }
  };

  const handleCategoryChange = (c: InventoryCategory | 'All') => {
    setFilterCat(c);
    setPage(1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryChange(c)}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                  filterCat === c
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search items..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-44 transition"
              />
            </div>
            <Button onClick={openAdd}>
              <Plus size={15} /> Add Item
            </Button>
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
            {loadingMasters ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th
                      onClick={() => handleSort('itemCode')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Item Code
                        {sortBy === 'itemCode' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('itemName')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Item Name
                        {sortBy === 'itemName' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('category')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {sortBy === 'category' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('unit')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none hidden md:table-cell transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Unit
                        {sortBy === 'unit' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortBy === 'status' && (
                          <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {masters.map((m) => (
                    <tr
                      key={m._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                          {m.itemCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Package
                            size={14}
                            className="text-slate-400 dark:text-slate-500 shrink-0"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {m.itemName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={categoryVariant[m.category]}>{m.category}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {m.unit}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={m.status === 'Active' ? 'success' : 'danger'}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          {m.status === 'Active' && (
                            <button
                              onClick={() => handleDeactivate(m)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                              title="Deactivate"
                            >
                              <PowerOff size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {masters.length === 0 && !loadingMasters && (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">No items found</p>
              <p className="text-sm mt-1">Try changing the search or category filters.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingMasters && (
            <PaginationControls
              meta={mastersPagination}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Inventory Item' : 'Add Inventory Item'}
      >
        <InventoryMasterForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
