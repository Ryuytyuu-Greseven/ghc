import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  /** If true, field spans both columns */
  full?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: DetailField[];
}

export function InventoryDetailModal({ open, onClose, title, fields }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-1">
        {fields.map((f, i) => (
          <div key={i} className={f.full ? 'col-span-2' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {f.label}
            </dt>
            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">
              {f.value ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
            </dd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/** Re-export Badge for convenience — callers can import from this file */
export { Badge };
