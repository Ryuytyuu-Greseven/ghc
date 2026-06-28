import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import type { Staff } from '../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  staff: Staff;
  onClose: () => void;
}

export function StaffAssign({ staff, onClose }: Props) {
  const { t } = useTranslation();
  const { hospitals, assignStaff } = useApp();
  const [selected, setSelected] = useState<string | null>(staff.assignedHospitalId);

  const handleSave = () => {
    assignStaff(staff.id, selected);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
        <p className="font-medium text-slate-800 dark:text-slate-100">{staff.name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {staff.specialization} · {t(`roles.${staff.role}`)}
        </p>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
        {t('staff.assign.selectFacility')}
      </p>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {hospitals.filter((h, idx, self) => self.findIndex(x => x.id === h.id) === idx).map(h => (
          <button
            key={h.id}
            onClick={() => setSelected(h.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
              selected === h.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Building2
              size={16}
              className={selected === h.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{h.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{h.city} · {h.type}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
        >
          <X size={14} /> {t('staff.assign.removeAssignment')}
        </button>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave}>{t('staff.assign.saveAssignment')}</Button>
      </div>
    </div>
  );
}
