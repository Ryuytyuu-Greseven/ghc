import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';

interface RequestItemRow {
  itemId: string;
  requestedQty: string;
}

interface Props {
  onClose: () => void;
}

export function RequestForm({ onClose }: Props) {
  const { hospitals, staff } = useApp();
  const { masters, centralStock, createRequest } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const [branchId, setBranchId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState<RequestItemRow[]>([{ itemId: '', requestedQty: '' }]);

  const branchOptions = hospitals.map((h) => ({ value: h.id, label: h.name }));
  const activeItemOptions = masters
    .filter((m) => m.status === 'Active')
    .map((m) => ({ value: m._id, label: m.itemName }));

  const staffOptions = staff.map((s) => ({ value: s.name, label: `${s.name} (${s.role})` }));

  const getCentralStockQty = (itemId: string) => {
    return centralStock
      .filter((entry) => {
        const entryItemId = entry.itemId?._id || entry.itemId;
        return entryItemId === itemId;
      })
      .reduce((sum, entry) => sum + entry.availableQty, 0);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { itemId: '', requestedQty: '' }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, key: keyof RequestItemRow, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  };

  const hasValidationError = items.some(
    (it) => it.itemId && Number(it.requestedQty) > getCentralStockQty(it.itemId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || hasValidationError) return;

    setSubmitting(true);
    try {
      await createRequest({
        branchId,
        requestedBy,
        items: items.map((it) => ({
          itemId: it.itemId,
          requestedQty: Number(it.requestedQty),
        })),
      });
      onClose();
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Branch"
          required
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branchOptions}
          placeholder="Select branch…"
        />
        <Select
          label="Requested By"
          required
          value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}
          options={staffOptions}
          placeholder="Select staff member…"
        />
      </div>

      {/* Items section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Requested Items
          </p>
          <button
            type="button"
            onClick={addItemRow}
            className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            <Plus size={13} /> Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const availQty = item.itemId ? getCentralStockQty(item.itemId) : 0;
            const exceedsStock = item.itemId && Number(item.requestedQty) > availQty;

            return (
              <div
                key={index}
                className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg p-3"
              >
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Select
                      label={index === 0 ? 'Item' : undefined}
                      required
                      value={item.itemId}
                      onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                      options={activeItemOptions}
                      placeholder="Select item…"
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    <Input
                      label={index === 0 ? 'Qty' : undefined}
                      type="number"
                      required
                      min="1"
                      value={item.requestedQty}
                      onChange={(e) => updateItem(index, 'requestedQty', e.target.value)}
                      placeholder="0"
                      error={exceedsStock ? `Exceeds stock (${availQty} available)` : undefined}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length === 1}
                    className="mb-0.5 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    title="Remove item"
                  >
                    <X size={14} />
                  </button>
                </div>

                {item.itemId && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-1 flex justify-between">
                    <span>
                      Available Central Stock: <strong className="font-semibold">{availQty}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || items.length === 0 || hasValidationError}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
