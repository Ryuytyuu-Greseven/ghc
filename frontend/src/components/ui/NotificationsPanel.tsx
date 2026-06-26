import { useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, X, Check } from 'lucide-react';
import { clsx } from 'clsx';

type NotifType = 'warning' | 'info' | 'success';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Bed capacity alert',
    body: 'GHC City Hospital is at 85% capacity. Consider load balancing.',
    time: '10m ago',
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'New staff assigned',
    body: 'Dr. Priya Sharma has been assigned to Metro Clinic.',
    time: '1h ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Low medicine stock',
    body: 'Paracetamol 500mg is running critically low across 3 facilities.',
    time: '3h ago',
    read: false,
  },
  {
    id: '4',
    type: 'success',
    title: 'Patient discharged',
    body: 'Rajesh Kumar was successfully discharged from GHC Central Hospital.',
    time: '5h ago',
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: 'Weekly report ready',
    body: 'The weekly occupancy and inventory report is available for download.',
    time: '1d ago',
    read: true,
  },
];

const typeConfig: Record<
  NotifType,
  { icon: typeof AlertTriangle; iconClass: string; bgClass: string }
> = {
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
  },
  info: {
    icon: Info,
    iconClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-900/30',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const dismiss = (id: string) => setNotifs(n => n.filter(x => x.id !== id));
  const markRead = (id: string) =>
    setNotifs(n => n.map(x => (x.id === id ? { ...x, read: true } : x)));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'relative p-2 rounded-lg transition',
          open
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 ring-2 ring-white dark:ring-slate-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/30 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              notifs.map(n => {
                const { icon: Icon, iconClass, bgClass } = typeConfig[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={clsx(
                      'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group',
                      !n.read && 'bg-primary-50/40 dark:bg-primary-900/10'
                    )}
                  >
                    <div className={clsx('p-1.5 rounded-lg shrink-0 mt-0.5', bgClass)}>
                      <Icon size={14} className={iconClass} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={clsx(
                            'text-sm font-medium truncate',
                            n.read
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-slate-800 dark:text-slate-100'
                          )}
                        >
                          {n.title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                          className="shrink-0 p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition"
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{n.time}</span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => setNotifs([])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
