import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserRound,
  Pill,
  X,
  Calendar,
  Shuffle,
  ClipboardList,
  Sparkles,
  AlertOctagon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSidebar } from '../../context/SidebarContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

const allNavItems = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/hospitals', key: 'hospitals', icon: Building2 },
  { to: '/staff', key: 'staff', icon: Users },
  { to: '/patients', key: 'patients', icon: UserRound },
  { to: '/medicines', key: 'medicines', icon: Pill },
  { to: '/ai-analytics', key: 'ai-analytics', icon: Sparkles },
  { to: '/critical-alerts', key: 'critical-alerts', icon: AlertOctagon },
  { to: '/availability', key: 'availability', icon: Calendar },
  { to: '/transfers', key: 'transfers', icon: Shuffle },
  { to: '/audits', key: 'audits', icon: ClipboardList },
];

const roleNavItemsMap: Record<string, string[]> = {
  Admin: ['/', '/hospitals', '/staff', '/patients', '/medicines', '/ai-analytics', '/critical-alerts', '/transfers', '/audits'],
  Doctor: ['/', '/hospitals', '/patients', '/medicines', '/availability', '/ai-analytics'],
  Nurse: ['/', '/hospitals', '/patients', '/medicines', '/availability', '/ai-analytics'],
  Receptionist: ['/', '/hospitals', '/patients', '/medicines', '/availability', '/ai-analytics'],
  Pharmacist: ['/', '/medicines', '/availability', '/ai-analytics'],
  Compounder: ['/', '/medicines', '/availability', '/ai-analytics'],
  'Lab Technician': ['/', '/medicines', '/availability', '/ai-analytics'],
  Cashier: ['/', '/medicines', '/availability', '/ai-analytics'],
};

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const { currentUser } = useApp();
  const { t } = useTranslation();

  const role = currentUser?.role || 'Admin';
  const allowedPaths = roleNavItemsMap[role] || ['/', '/availability'];
  const filteredNavItems = allNavItems.filter(item => allowedPaths.includes(item.to));

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
        'bg-white dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-700',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Brand */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="GHC Logo" className="h-10 w-10 rounded-xl shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-slate-800 dark:text-white font-bold text-sm leading-tight truncate">{t('common.appName')}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{t('common.appSubtitle')}</p>
          </div>
        </div>
        {/* Close button — mobile/tablet only */}
        <button
          onClick={close}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition shrink-0 ml-2"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {t('common.mainMenu')}
        </p>
        {filteredNavItems.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={close}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={clsx('shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500')}
                />
                {t(`nav.${key}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-primary-500/30">
          {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'U'}
        </div>
        <div className="min-w-0">
          <p className="text-slate-800 dark:text-white text-xs font-medium truncate">{currentUser?.username || t('common.user')}</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
            {currentUser?.role ? t(`roles.${currentUser.role}`) : t('roles.Staff')}
          </p>
        </div>
      </div>
    </aside>
  );
}
