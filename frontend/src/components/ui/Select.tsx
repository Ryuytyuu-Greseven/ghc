import { forwardRef, useState, useRef, useEffect } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Search } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, onChange, onBlur, value, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearch('');
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options based on search query
    const filteredOptions = options.filter(o =>
      o.label.toLowerCase().includes(search.toLowerCase())
    );

    // Get current label to display on the button
    const selectedOption = options.find(o => String(o.value) === String(value));
    const displayLabel = selectedOption ? selectedOption.label : placeholder || 'Select option…';

    const handleSelect = (val: string) => {
      if (onChange) {
        const event = {
          target: {
            name: props.name,
            value: val,
          },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(event);
      }
      setIsOpen(false);
      setSearch('');
    };

    return (
      <div className="flex flex-col gap-1 relative" ref={containerRef}>
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}

        {/* Custom Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onBlur={(event) => {
            if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
              onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
            }
          }}
          className={clsx(
            'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-300 dark:border-slate-600',
            selectedOption ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400',
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown size={16} className="text-slate-400 shrink-0 ml-1.5" />
        </button>

        {/* Hidden select for form bindings and refs */}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          className="hidden"
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full top-full mt-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col max-h-60">
            {/* Search Input */}
            <div className="flex items-center px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <Search size={14} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search options…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none focus:ring-0 placeholder-slate-400"
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-700/30">
              {placeholder && !search && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {placeholder}
                </button>
              )}
              {filteredOptions.length > 0 ? (
                filteredOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      String(o.value) === String(value)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-slate-700 dark:text-slate-200'
                    )}
                  >
                    {o.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
