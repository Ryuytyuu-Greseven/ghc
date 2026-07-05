import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, required, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition',
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
