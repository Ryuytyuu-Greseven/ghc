import { useState, useRef, useEffect } from 'react';
import { Lock, User, AlertCircle, Loader2, ShieldCheck, Languages, ChevronDown } from 'lucide-react';
import logo from './assets/logo.png';
import { environment } from './config/environment';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const currentLang = (i18n.language || 'en').split('-')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('auth.emptyFieldsError'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${environment.loginBackendUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('auth.invalidCredentials'));
      }

      // Single Sign-On Redirect: redirect to main app passing token as a query param
      window.location.href = `${environment.mainFrontendUrl}/?token=${encodeURIComponent(data.access_token)}`;
    } catch (err: any) {
      setError(err.message || t('auth.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 px-4 py-8">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          aria-label="Change language"
          title="Change Language"
        >
          <Languages size={16} />
          <span className="text-xs font-semibold uppercase">{currentLang}</span>
          <ChevronDown size={12} className="text-slate-400" />
        </button>
        
        {langOpen && (
          <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50 py-1 z-50">
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('en');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'en'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('hi');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'hi'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              हिन्दी (Hindi)
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('te');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'te'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              తెలుగు (Telugu)
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('bn');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'bn'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('kn');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'kn'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              ಕನ್ನಡ (Kannada)
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('ta');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'ta'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              தமிழ் (Tamil)
            </button>
            <button
              type="button"
              onClick={() => {
                i18n.changeLanguage('gu');
                setLangOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition ${
                currentLang === 'gu'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              ગુજરાતી (Gujarati)
            </button>
          </div>
        )}
      </div>

      {/* Empty top spacing for balance */}
      <div />

      {/* Main Login Card Container */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-slate-950/50 overflow-hidden border border-slate-200/60 dark:border-slate-700/50 relative">
          
          {/* Saffron, White, Green Tricolor Top Border Accent */}
          <div className="h-1.5 w-full flex">
            <div className="h-full w-1/3 bg-[#FF9933]"></div> {/* Saffron */}
            <div className="h-full w-1/3 bg-white"></div>     {/* White */}
            <div className="h-full w-1/3 bg-[#138808]"></div> {/* Green */}
          </div>

          <div className="p-8 sm:p-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src={logo} 
                alt="Government Health Connect Logo" 
                className="h-28 w-28 object-contain drop-shadow-sm select-none"
              />
            </div>

            {/* Headers */}
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                {t('auth.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
                {t('auth.subtitle')}
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {t('auth.username')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={t('auth.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition duration-150 ease-in-out"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition duration-150 ease-in-out"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-xl transition duration-150 ease-in-out flex items-center justify-center gap-2 text-sm shadow-md shadow-teal-600/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>{t('auth.secureSignIn')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-8 italic font-medium px-4">
        <p>{t('auth.footerQuote')}</p>
      </div>
    </div>
  );
}
