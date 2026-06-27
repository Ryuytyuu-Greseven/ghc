import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types';

interface PaginationControlsProps {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function PaginationControls({
  meta,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, pageSize, totalRecords, totalPages, hasNext, hasPrevious } = meta;

  const pageNumbers: number[] = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
      {/* Records count info */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Showing{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {((page - 1) * pageSize + 1).toLocaleString()}
        </span>{' '}
        to{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {Math.min(page * pageSize, totalRecords).toLocaleString()}
        </span>{' '}
        of{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {totalRecords.toLocaleString()}
        </span>{' '}
        records
      </div>

      {/* Navigation and Page Size */}
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onPageChange(num)}
              className={`min-w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg transition ${
                num === page
                  ? 'bg-primary-600 dark:bg-primary-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
