import { LogOut, Menu } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationsPanel } from '../ui/NotificationsPanel';
import { useSidebar } from '../../context/SidebarContext';
import { environment } from '../../config/environment';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <div className="sticky top-0 z-20 h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 shadow-sm dark:shadow-slate-900/30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile/tablet only */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <NotificationsPanel />

        {/* Logout */}
        <button
          onClick={() => {
            localStorage.removeItem('ghc_auth_token');
            window.location.replace(environment.loginFrontendUrl);
          }}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 transition"
          aria-label="Sign out"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
