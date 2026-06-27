import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useInventory } from '../../context/InventoryContext';
import { useApp } from '../../context/AppContext';

interface Props {
  onClose: () => void;
}

export function AddStockForm({ onClose }: Props) {
  const { staff } = useApp();
  const { masters, addCentralStock } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    itemId: '',
    batchNo: '',
    availableQty: '',
    damagedQty: '0',
    expiryDate: '',
    performedBy: '',
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const activeItemOptions = masters
    .filter((m) => m.status === 'Active')
    .map((m) => ({ value: m._id, label: m.itemName }));

  const staffOptions = staff.map((s) => ({ value: s.name, label: `${s.name} (${s.role})` }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addCentralStock({
        itemId: form.itemId,
        batchNo: form.batchNo,
        availableQty: Number(form.availableQty),
        damagedQty: Number(form.damagedQty),
        expiryDate: form.expiryDate || null,
        performedBy: form.performedBy,
      });
      onClose();
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Item"
        required
        value={form.itemId}
        onChange={(e) => set('itemId', e.target.value)}
        options={activeItemOptions}
        placeholder="Select an item…"
      />

      <Input
        label="Batch Number"
        required
        value={form.batchNo}
        onChange={(e) => set('batchNo', e.target.value)}
        placeholder="e.g. BATCH-2024-001"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Available Quantity"
          type="number"
          required
          min="1"
          value={form.availableQty}
          onChange={(e) => set('availableQty', e.target.value)}
          placeholder="0"
        />
        <Input
          label="Damaged Quantity"
          type="number"
          min="0"
          value={form.damagedQty}
          onChange={(e) => set('damagedQty', e.target.value)}
          placeholder="0"
        />
      </div>

      <Input
        label="Expiry Date"
        type="date"
        value={form.expiryDate}
        onChange={(e) => set('expiryDate', e.target.value)}
      />

      <Select
        label="Performed By"
        required
        value={form.performedBy}
        onChange={(e) => set('performedBy', e.target.value)}
        options={staffOptions}
        placeholder="Select staff member…"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Stock'}
        </Button>
      </div>
    </form>
  );
}
