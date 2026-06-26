import { useState } from 'react';
import { Plus, Pill, Pencil, Trash2, Send } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import type { Medicine, MedicineCategory } from '../../types';
import { MedicineForm } from './MedicineForm';
import { MedicineAssign } from './MedicineAssign';
import { clsx } from 'clsx';

const categoryVariant: Record<MedicineCategory, 'success' | 'info' | 'warning' | 'purple'> = {
  medication: 'success',
  equipment: 'info',
  consumable: 'warning',
  diagnostic: 'purple',
};

const categories: (MedicineCategory | 'all')[] = [
  'all',
  'medication',
  'equipment',
  'consumable',
  'diagnostic',
];

export function MedicineList() {
  const { medicines, deleteMedicine, hospitals, hospitalMedicines } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [assigning, setAssigning] = useState<Medicine | null>(null);
  const [filterCat, setFilterCat] = useState<MedicineCategory | 'all'>('all');

  const filtered =
    filterCat === 'all' ? medicines : medicines.filter(m => m.category === filterCat);

  const openEdit = (m: Medicine) => {
    setEditing(m);
    setFormOpen(true);
  };
  const openAssign = (m: Medicine) => {
    setAssigning(m);
    setAssignOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item from inventory?')) deleteMedicine(id);
  };

  const totalAssigned = (medicineId: string) =>
    hospitalMedicines
      .filter(hm => hm.medicineId === medicineId)
      .reduce((s, hm) => s + hm.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Medicines & Supplies" subtitle="Manage inventory and distribute to facilities" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="max-w-screen-2xl mx-auto space-y-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterCat === c
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  )}
                >
                  {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={15} /> Add Item
            </Button>
          </div>

          {/* Inventory table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Total Stock
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                      Distributed
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                      Unit
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden xl:table-cell">
                      Added
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(m => {
                    const distributed = totalAssigned(m.id);
                    const remaining = m.totalStock - distributed;
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Pill size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {m.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={categoryVariant[m.category]}>
                            {m.category.charAt(0).toUpperCase() + m.category.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-medium tabular-nums">
                          {m.totalStock.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <div>
                            <span className="text-slate-700 dark:text-slate-200 tabular-nums">
                              {distributed.toLocaleString()}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-xs ml-1 tabular-nums">
                              ({remaining.toLocaleString()} left)
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                          {m.unit}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden xl:table-cell tabular-nums">
                          {m.createdAt}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openAssign(m)}
                              className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                              title="Distribute to facility"
                            >
                              <Send size={14} />
                            </button>
                            <button
                              onClick={() => openEdit(m)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                              title="Delete"
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
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <Pill size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-500 dark:text-slate-400">No items found</p>
                <p className="text-sm mt-1">Try changing the filter or add a new inventory item.</p>
              </div>
            )}
          </div>

          {/* Distribution by facility */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Distribution by Facility
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {hospitals.map(h => {
                const items = hospitalMedicines.filter(hm => hm.hospitalId === h.id);
                return (
                  <div key={h.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{h.name}</p>
                      <Badge variant="default">{items.length} item types</Badge>
                    </div>
                    {items.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {items.map(hm => {
                          const med = medicines.find(m => m.id === hm.medicineId);
                          return med ? (
                            <span
                              key={hm.id}
                              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300"
                            >
                              {med.name} ·{' '}
                              <strong className="text-slate-800 dark:text-slate-100">
                                {hm.quantity}
                              </strong>{' '}
                              {med.unit}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        No items assigned yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Item' : 'Add Inventory Item'}
      >
        <MedicineForm initial={editing} onClose={() => setFormOpen(false)} />
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Distribute to Facility"
        size="sm"
      >
        {assigning && (
          <MedicineAssign medicine={assigning} onClose={() => setAssignOpen(false)} />
        )}
      </Modal>
    </div>
  );
}
