import { useState } from 'react';
import { Lock, User, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import logo from './assets/logo.png';
import { environment } from './config/environment';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
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
        throw new Error(data.message || 'Invalid credentials. Please try again.');
      }

      // Single Sign-On Redirect: redirect to main app passing token as a query param
      window.location.href = `${environment.mainFrontendUrl}/?token=${encodeURIComponent(data.access_token)}`;
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 px-4 py-8">
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
                Government Health Connect
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
                Care Management Portal
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
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter admin username"
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
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 pointer-events-none">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
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
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Secure Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-8 italic font-medium px-4">
        <p>"Empowering digital connectivity for a healthier and stronger nation."</p>
      </div>
    </div>
  );
}
