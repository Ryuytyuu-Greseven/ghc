import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { X, ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ label, options, selected, onChange, placeholder }: MultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    );
  };

  const remove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== option));
  };

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100',
          open
            ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-500'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        )}
      >
        <span className={selected.length === 0 ? 'text-slate-400 dark:text-slate-500' : ''}>
          {selected.length === 0
            ? (placeholder || t('common.selectPlaceholder'))
            : t('hospitals.form.specialistsSelected', { count: selected.length })}
        </span>
        <ChevronDown
          size={15}
          className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="z-20 mt-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {options.map(option => {
            const isSelected = selected.includes(option);
            return (
              <button
                type="button"
                key={option}
                onClick={() => toggle(option)}
                className={clsx(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition',
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {option}
                {isSelected && <Check size={13} className="shrink-0 text-primary-600 dark:text-primary-400" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected chips — shown below the trigger always */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selected.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {s}
              <button
                type="button"
                onClick={(e) => remove(s, e)}
                className="hover:text-primary-900 dark:hover:text-primary-100 transition"
                aria-label={`Remove ${s}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
