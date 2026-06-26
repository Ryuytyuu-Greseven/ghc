import { useState } from 'react';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Medicine } from '../../types';

interface Props {
  medicine: Medicine;
  onClose: () => void;
}

export function MedicineAssign({ medicine, onClose }: Props) {
  const { hospitals, hospitalMedicines, assignMedicine, updateMedicineAssignment, removeMedicineAssignment } =
    useApp();
  const [selectedHospital, setSelectedHospital] = useState('');
  const [quantity, setQuantity] = useState('');

  const existing = hospitalMedicines.filter(hm => hm.medicineId === medicine.id);
  const totalDistributed = existing.reduce((s, hm) => s + hm.quantity, 0);
  const remaining = medicine.totalStock - totalDistributed;

  const alreadyAssigned = (hospitalId: string) =>
    existing.find(hm => hm.hospitalId === hospitalId);

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital || !quantity) return;
    const qty = Number(quantity);
    const ex = alreadyAssigned(selectedHospital);
    if (ex) {
      updateMedicineAssignment(ex.id, ex.quantity + qty);
    } else {
      assignMedicine(selectedHospital, medicine.id, qty);
    }
    setSelectedHospital('');
    setQuantity('');
  };

  return (
    <div className="space-y-4">
      {/* Medicine info */}
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
        <p className="font-medium text-slate-800 dark:text-slate-100">{medicine.name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total: {medicine.totalStock.toLocaleString()} {medicine.unit} ·{' '}
          <span className={remaining < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
            {remaining.toLocaleString()} remaining
          </span>
        </p>
      </div>

      {/* Current distributions */}
      {existing.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Current Distributions
          </p>
          {existing.map(hm => {
            const hospital = hospitals.find(h => h.id === hm.hospitalId);
            return (
              <div
                key={hm.id}
                className="flex items-center justify-between bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                    {hospital?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                    {hm.quantity} {medicine.unit}
                  </span>
                  <button
                    onClick={() => removeMedicineAssignment(hm.id)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign form */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Assign to Facility
        </p>
        <form onSubmit={handleAssign} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Facility
            </label>
            <select
              value={selectedHospital}
              onChange={e => setSelectedHospital(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            >
              <option value="">— Select facility —</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city}){alreadyAssigned(h.id) ? ' ✓ already assigned' : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={`Quantity (${medicine.unit})`}
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="e.g. 200"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Done
            </Button>
            <Button type="submit" disabled={!selectedHospital || !quantity}>
              <Pencil size={14} /> Assign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
