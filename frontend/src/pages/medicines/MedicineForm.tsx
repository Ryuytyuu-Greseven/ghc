import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Medicine, MedicineCategory } from '../../types';

const categoryOptions = [
  { value: 'medication', label: 'Medication' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'diagnostic', label: 'Diagnostic' },
];

interface Props {
  initial: Medicine | null;
  onClose: () => void;
}

export function MedicineForm({ initial, onClose }: Props) {
  const { addMedicine, updateMedicine } = useApp();

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? 'medication' as MedicineCategory,
    unit: initial?.unit ?? '',
    totalStock: String(initial?.totalStock ?? ''),
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      totalStock: Number(form.totalStock),
    };
    if (initial) {
      updateMedicine(initial.id, data);
    } else {
      addMedicine(data);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Item Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Paracetamol 500mg" />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          value={form.category}
          onChange={e => set('category', e.target.value)}
          options={categoryOptions}
        />
        <Input label="Unit" required value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. tablets, units, bottles" />
      </div>

      <Input
        label="Total Stock Quantity"
        type="number"
        min="0"
        required
        value={form.totalStock}
        onChange={e => set('totalStock', e.target.value)}
        placeholder="0"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Save Changes' : 'Add to Inventory'}</Button>
      </div>
    </form>
  );
}
