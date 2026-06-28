import { useState, useRef, useEffect } from 'react';
import { LogOut, Menu, Languages, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationsPanel } from '../ui/NotificationsPanel';
import { useSidebar } from '../../context/SidebarContext';
import { environment } from '../../config/environment';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggle } = useSidebar();
  const { i18n, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize language code to two chars (e.g. en-US -> en)
  const currentLang = (i18n.language || 'en').split('-')[0];

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
        {/* Language Switcher */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            aria-label="Change language"
            title="Change Language"
          >
            <Languages size={18} />
            <span className="hidden sm:inline text-xs font-semibold uppercase">{currentLang}</span>
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500" />
          </button>
          
          {langOpen && (
            <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50 py-1 z-50">
              <button
                onClick={() => {
                  i18n.changeLanguage('en');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'en'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                English
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('hi');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'hi'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                हिन्दी (Hindi)
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('te');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'te'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                తెలుగు (Telugu)
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('bn');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'bn'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                বাংলা (Bengali)
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('kn');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'kn'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                ಕನ್ನಡ (Kannada)
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('ta');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'ta'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                தமிழ் (Tamil)
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('gu');
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                  currentLang === 'gu'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                ગુજરાતી (Gujarati)
              </button>
            </div>
          )}
        </div>

        <ThemeToggle />
        <NotificationsPanel />

        {/* Logout */}
        <button
          onClick={() => {
            localStorage.removeItem('ghc_auth_token');
            window.location.replace(environment.loginFrontendUrl);
          }}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 transition"
          aria-label={t('common.signOut')}
          title={t('common.signOut')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
