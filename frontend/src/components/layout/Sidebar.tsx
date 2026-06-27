import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserRound,
  Pill,
  HeartPulse,
  X,
  LogOut,
  Calendar,
  Shuffle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSidebar } from '../../context/SidebarContext';
import { useApp } from '../../context/AppContext';

const allNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/hospitals', label: 'Hospitals & Clinics', icon: Building2 },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/patients', label: 'Patients', icon: UserRound },
  { to: '/medicines', label: 'Medicines & Supplies', icon: Pill },
  { to: '/availability', label: 'My Availability', icon: Calendar },
  { to: '/transfers', label: 'Coverage & Transfers', icon: Shuffle },
];

const roleNavItemsMap: Record<string, string[]> = {
  Admin: ['/', '/hospitals', '/staff', '/patients', '/medicines', '/transfers'],
  Doctor: ['/', '/hospitals', '/patients', '/availability'],
  Nurse: ['/', '/hospitals', '/patients', '/availability'],
  Receptionist: ['/', '/hospitals', '/patients', '/availability'],
  Pharmacist: ['/', '/medicines', '/availability'],
  Compounder: ['/', '/medicines', '/availability'],
  'Lab Technician': ['/', '/medicines', '/availability'],
  Cashier: ['/', '/availability'],
};

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const { currentUser } = useApp();

  const role = currentUser?.role || 'Admin';
  const allowedPaths = roleNavItemsMap[role] || ['/', '/availability'];
  const filteredNavItems = allNavItems.filter(item => allowedPaths.includes(item.to));

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
        'bg-slate-900 dark:bg-slate-950',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary-500 p-2 rounded-xl shrink-0 shadow-lg shadow-primary-500/20">
            <HeartPulse size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-base leading-tight truncate">GHC Health</p>
            <p className="text-slate-400 text-xs truncate">Care Management</p>
          </div>
        </div>
        {/* Close button — mobile/tablet only */}
        <button
          onClick={close}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition shrink-0 ml-2"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </p>
        {filteredNavItems.map(({ to, label, icon: Icon, end }) => (
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
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={clsx('shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-500')}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 px-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-primary-500/30">
            {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{currentUser?.username || 'User'}</p>
            <p className="text-slate-500 text-xs truncate">{currentUser?.role || 'Staff'}</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('ghc_auth_token');
            window.location.href = 'http://localhost:4005';
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition shrink-0"
          aria-label="Sign out"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
