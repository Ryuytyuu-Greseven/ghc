import { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Staff } from '../../types';

interface Props {
  staff: Staff;
  onClose: () => void;
}

export function StaffAssign({ staff, onClose }: Props) {
  const { hospitals, assignStaff } = useApp();
  const [selected, setSelected] = useState<string | null>(staff.assignedHospitalId);

  const handleSave = () => {
    assignStaff(staff.id, selected);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="font-medium text-slate-800">{staff.name}</p>
        <p className="text-sm text-slate-500">{staff.specialization} · {staff.role}</p>
      </div>

      <p className="text-sm text-slate-600 font-medium">Select a facility to assign to:</p>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {hospitals.map(h => (
          <button
            key={h.id}
            onClick={() => setSelected(h.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              selected === h.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 size={16} className={selected === h.id ? 'text-primary-600' : 'text-slate-400'} />
            <div>
              <p className="text-sm font-medium text-slate-800">{h.name}</p>
              <p className="text-xs text-slate-400">{h.city} · {h.type}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700"
        >
          <X size={14} /> Remove assignment
        </button>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Assignment</Button>
      </div>
    </div>
  );
}
