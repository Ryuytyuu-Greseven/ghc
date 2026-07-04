import { useState, useRef, useEffect } from 'react';
import { LogOut, Menu, Languages, ChevronDown, KeyRound, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationsPanel } from '../ui/NotificationsPanel';
import { useSidebar } from '../../context/SidebarContext';
import { environment } from '@env/environment';
import { useTranslation } from 'react-i18next';
import { authFetch, useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggle } = useSidebar();
  const { i18n, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useApp();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  const performLogout = async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    try {
      await authFetch(`${environment.mainBackendUrl}/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to log out from backend:', err);
    }
    localStorage.removeItem('ghc_auth_token');
    window.location.replace(environment.loginFrontendUrl);
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setResetError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError(t('common.passwordsDoNotMatch'));
      return;
    }
    if (!currentUser?.username) {
      setResetError('User session not found.');
      return;
    }

    setIsResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const response = await fetch(`${environment.loginBackendUrl}/auth/reset-password-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser.username,
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('common.passwordError'));
      }

      setResetSuccess(t('common.changePasswordSuccess'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      let count = 3;
      setLogoutCountdown(count);

      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          performLogout();
        } else {
          setLogoutCountdown(count);
        }
      }, 1000);
    } catch (err: any) {
      setResetError(err.message || t('common.passwordError'));
    } finally {
      setIsResetLoading(false);
    }
  };

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

        {/* Change Password */}
        <button
          onClick={() => {
            setResetError(null);
            setResetSuccess(null);
            setLogoutCountdown(null);
            setIsResetModalOpen(true);
          }}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          aria-label={t('common.changePassword')}
          title={t('common.changePassword')}
        >
          <KeyRound size={18} />
        </button>

        {/* Logout */}
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 transition"
          aria-label={t('common.signOut')}
          title={t('common.signOut')}
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Change Password Modal */}
      {isResetModalOpen && (
        <Modal
          open={isResetModalOpen}
          onClose={logoutCountdown !== null ? () => {} : () => setIsResetModalOpen(false)}
          title={t('common.changePassword')}
        >
          {logoutCountdown !== null ? (
            <div className="space-y-6 text-center py-4">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-900/30 rounded-lg text-teal-700 dark:text-teal-300 text-sm font-medium leading-relaxed">
                {t('common.changePasswordSuccess')}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {t('common.loggingOutIn', { count: logoutCountdown })}
              </p>
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="danger"
                  onClick={performLogout}
                  className="px-6 py-2.5 font-bold"
                >
                  {t('common.logoutNow')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-300 text-sm">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-900/30 rounded-lg text-teal-700 dark:text-teal-300 text-sm">
                  {resetSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {t('common.oldPassword')}
                </label>
                <Input
                  type="password"
                  required
                  placeholder={t('common.oldPasswordPlaceholder')}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isResetLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {t('common.newPassword')}
                </label>
                <Input
                  type="password"
                  required
                  placeholder={t('common.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isResetLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {t('common.confirmPassword')}
                </label>
                <Input
                  type="password"
                  required
                  placeholder={t('common.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isResetLoading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isResetLoading}
                  className="flex items-center gap-1.5"
                >
                  {isResetLoading && <Loader2 size={14} className="animate-spin" />}
                  {t('common.save')}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <Modal
          open={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          title={t('common.logoutConfirmTitle')}
          size="sm"
        >
          <div className="space-y-6">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {t('common.logoutConfirmMessage')}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={performLogout}
              >
                {t('common.logoutConfirmButton')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
