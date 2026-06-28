import { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInventory } from '../../context/InventoryContext';
import type { InventoryMaster } from '../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  initial: InventoryMaster | null;
  onClose: () => void;
}

export function InventoryMasterForm({ initial, onClose }: Props) {
  const { t } = useTranslation();
  const { createMaster, updateMaster } = useInventory();
  const [submitting, setSubmitting] = useState(false);

  const categoryOptions = [
    { value: 'Medicine', label: t('inventory.categories.Medicine') },
    { value: 'Equipment', label: t('inventory.categories.Equipment') },
    { value: 'Consumable', label: t('inventory.categories.Consumable') },
    { value: 'Surgical', label: t('inventory.categories.Surgical') },
    { value: 'Diagnostic', label: t('inventory.categories.Diagnostic') },
    { value: 'Other', label: t('inventory.categories.Other') },
  ];

  const statusOptions = [
    { value: 'Active', label: t('inventory.status.Active') },
    { value: 'Inactive', label: t('inventory.status.Inactive') },
  ];

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
          label={t('inventory.fields.itemName')}
          required
          value={form.itemName}
          onChange={(e) => set('itemName', e.target.value)}
          placeholder={t('inventory.fields.itemNamePlaceholder')}
        />
        <Select
          label={t('inventory.fields.category')}
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          options={categoryOptions}
        />
      </div>

      {initial && (
        <Select
          label={t('inventory.fields.status')}
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={statusOptions}
        />
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t('inventory.common.saving') : initial ? t('inventory.common.saveChanges') : t('inventory.common.addItem')}
        </Button>
      </div>
    </form>
  );
}
