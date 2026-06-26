import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserRound,
  Pill,
  HeartPulse,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/hospitals', label: 'Hospitals & Clinics', icon: Building2 },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/patients', label: 'Patients', icon: UserRound },
  { to: '/medicines', label: 'Medicines & Supplies', icon: Pill },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-slate-900 min-h-screen flex flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="bg-primary-500 p-2 rounded-xl">
          <HeartPulse size={22} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">GHC Health</p>
          <p className="text-slate-400 text-xs">Care Management</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            GA
          </div>
          <div>
            <p className="text-white text-xs font-medium">Global Admin</p>
            <p className="text-slate-500 text-xs">admin@ghc.health</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
