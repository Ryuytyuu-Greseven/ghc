import { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInventory } from '../../context/InventoryContext';
import type { InventoryMaster } from '../../types';

const categoryOptions = [
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Consumable', label: 'Consumable' },
  { value: 'Surgical', label: 'Surgical' },
  { value: 'Diagnostic', label: 'Diagnostic' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

interface Props {
  initial: InventoryMaster | null;
  onClose: () => void;
}

export function InventoryMasterForm({ initial, onClose }: Props) {
  const { createMaster, updateMaster } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    itemName: initial?.itemName ?? '',
    category: initial?.category ?? 'Medicine',
    status: initial?.status ?? 'Active',
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (initial) {
        await updateMaster(initial._id, form);
      } else {
        await createMaster(form);
      }
      onClose();
    } catch {
      // Error is handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Item Name"
          required
          value={form.itemName}
          onChange={(e) => set('itemName', e.target.value)}
          placeholder="e.g. Paracetamol 500mg"
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          options={categoryOptions}
        />
      </div>

      {initial && (
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={statusOptions}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
