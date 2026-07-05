import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { AppNotification, NotificationCategory } from '../../types';
import { notificationApi } from '../../services/notificationApi';
import { useNotificationsSocket } from '../../hooks/useNotificationsSocket';

type PanelNotification = AppNotification & { time: string };

const typeConfig: Record<
  NotificationCategory,
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

function formatRelativeTime(iso: string, t: any): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('common.time.justNow', { defaultValue: 'just now' });
  if (minutes < 60) return t('common.time.minutesAgo', { defaultValue: '{{count}}m ago', count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.time.hoursAgo', { defaultValue: '{{count}}h ago', count: hours });
  const days = Math.floor(hours / 24);
  return t('common.time.daysAgo', { defaultValue: '{{count}}d ago', count: days });
}

function getTranslatedNotification(n: PanelNotification, t: any): { title: string; body: string } {
  if (n.type === 'HOSPITAL_ONBOARDED') {
    return {
      title: t('notifications.hospitalOnboardedTitle', { defaultValue: 'Hospital onboarded successfully' }),
      body: t('notifications.hospitalOnboardedBody', {
        defaultValue: 'Facility "{{name}}" ({{type}}) has been successfully onboarded in {{city}} by {{performedBy}}.',
        name: n.metadata?.name || 'Hospital',
        type: n.metadata?.type || '',
        city: n.metadata?.city || '',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  if (n.type === 'HOSPITAL_UPDATED') {
    return {
      title: t('notifications.hospitalUpdatedTitle', { defaultValue: 'Hospital profile updated' }),
      body: t('notifications.hospitalUpdatedBody', {
        defaultValue: 'Facility profile for "{{name}}" has been updated by {{performedBy}}.',
        name: n.metadata?.name || 'Hospital',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  if (n.type === 'STAFF_CREATED') {
    return {
      title: t('notifications.staffCreatedTitle', { defaultValue: 'Staff registered successfully' }),
      body: t('notifications.staffCreatedBody', {
        defaultValue: 'Staff member "{{name}}" ({{role}}) has been successfully registered by {{performedBy}}.',
        name: n.metadata?.name || 'Staff',
        role: n.metadata?.role || '',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  if (n.type === 'STAFF_UPDATED') {
    return {
      title: t('notifications.staffUpdatedTitle', { defaultValue: 'Staff profile updated' }),
      body: t('notifications.staffUpdatedBody', {
        defaultValue: 'Staff profile for "{{name}}" has been updated by {{performedBy}}.',
        name: n.metadata?.name || 'Staff',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  if (n.type === 'STAFF_ASSIGNED_TO_FACILITY') {
    return {
      title: t('notifications.staffAssignedTitle', { defaultValue: 'Staff assigned to facility' }),
      body: t('notifications.staffAssignedBody', {
        defaultValue: 'Staff member "{{name}}" has been assigned to {{facility}} by {{performedBy}}.',
        name: n.metadata?.name || 'Staff',
        facility: n.metadata?.facility || '',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  if (n.type === 'STAFF_DEASSIGNED_FROM_FACILITY') {
    return {
      title: t('notifications.staffDeassignedTitle', { defaultValue: 'Staff de-assigned from facility' }),
      body: t('notifications.staffDeassignedBody', {
        defaultValue: 'Staff member "{{name}}" has been de-assigned from {{facility}} by {{performedBy}}.',
        name: n.metadata?.name || 'Staff',
        facility: n.metadata?.facility || '',
        performedBy: n.metadata?.performedBy || 'admin',
      }),
    };
  }
  return { title: n.title, body: n.body };
}

export function NotificationsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<PanelNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter(n => !n.read).length;

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationApi.list();
      setNotifs(
        data.map(item => ({
          ...item,
          time: formatRelativeTime(item.createdAt, t),
        })),
      );
    } catch {
      // keep existing list on failure
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleNewNotification = useCallback(
    (notification: AppNotification) => {
      setNotifs(current => {
        if (current.some(item => item.id === notification.id)) return current;
        return [
          {
            ...notification,
            time: formatRelativeTime(notification.createdAt, t),
          },
          ...current,
        ];
      });
    },
    [t],
  );

  useNotificationsSocket(handleNewNotification);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      void loadNotifications();
    }
  };

  const dismiss = async (id: string) => {
    setNotifs(n => n.filter(x => x.id !== id));
    try {
      await notificationApi.dismiss(id);
    } catch {
      void loadNotifications();
    }
  };

  const markRead = async (id: string) => {
    setNotifs(n => n.map(x => (x.id === id ? { ...x, read: true } : x)));
    try {
      await notificationApi.markRead(id);
    } catch {
      void loadNotifications();
    }
  };

  const clearAll = async () => {
    const ids = notifs.map(n => n.id);
    setNotifs([]);
    await Promise.allSettled(ids.map(id => notificationApi.dismiss(id)));
  };

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'relative p-2 rounded-lg transition',
          open
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        )}
        aria-label={t('common.notifications')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 ring-2 ring-white dark:ring-slate-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/30 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {t('common.notifications')}
              </h3>
              {unreadCount > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {unreadCount} {t('common.newNotif')}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllRead()}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> {t('common.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
            {loading && notifs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <p className="text-sm">Loading...</p>
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('common.allCaughtUp')}</p>
              </div>
            ) : (
              notifs.map(n => {
                const { icon: Icon, iconClass, bgClass } = typeConfig[n.category];
                const { title, body } = getTranslatedNotification(n, t);
                return (
                  <div
                    key={n.id}
                    onClick={() => void markRead(n.id)}
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
                          {title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); void dismiss(n.id); }}
                          className="shrink-0 p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition"
                          title={t('common.dismiss')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {body}
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

          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => void clearAll()}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {t('common.clearAllNotifications')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
