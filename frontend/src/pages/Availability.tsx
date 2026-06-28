import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { authFetch } from '../context/AppContext';
import { CheckCircle2, XCircle, Send, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

type StatusType = 'Available' | 'Unavailable';

export function Availability() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusType>('Available');
  const [periodType, setPeriodType] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentSchedule, setCurrentSchedule] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await authFetch('http://localhost:3000/staff/me/availability');
        if (!res.ok) throw new Error(t('availability.loadError'));
        const data = await res.json();
        setStatus(data.status as StatusType);
        const schedule = data.unavailableOnDays || [];
        setCurrentSchedule(schedule);
        
        if (schedule.length > 0) {
          setStartDate(schedule[0]);
          if (schedule.length > 1) {
            setPeriodType('range');
            setEndDate(schedule[schedule.length - 1]);
          } else {
            setPeriodType('single');
            setEndDate(schedule[0]);
          }
        }
      } catch (err: any) {
        setError(err.message || t('availability.loadError'));
      } finally {
        setIsLoading(false);
      }
    }
    fetchAvailability();
  }, [t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    if (status === 'Unavailable') {
      if (periodType === 'single') {
        if (!startDate) {
          setError(t('availability.selectDateError'));
          setIsSaving(false);
          return;
        }
      } else {
        if (!startDate || !endDate) {
          setError(t('availability.selectDatesError'));
          setIsSaving(false);
          return;
        }
        if (startDate > endDate) {
          setError(t('availability.invalidRangeError'));
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      const payload = status === 'Available' 
        ? { status } 
        : {
            status,
            startDate,
            endDate: periodType === 'single' ? startDate : endDate
          };

      const res = await authFetch('http://localhost:3000/staff/me/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(t('availability.updateError'));
      const data = await res.json();
      
      setCurrentSchedule(data.unavailableOnDays || []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || t('availability.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t('availability.title')} subtitle={t('availability.manageStatus')} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <Header title={t('availability.title')} subtitle={t('availability.subtitle')} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-95/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-95/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 transition duration-300">
              <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{t('availability.successMessage')}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-8">
            
            {/* Status Select Toggles */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t('availability.selectStatus')}
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Available Option */}
                <button
                  type="button"
                  onClick={() => setStatus('Available')}
                  className={clsx(
                    'flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition duration-150',
                    status === 'Available'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-sm shadow-emerald-500/5'
                      : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <CheckCircle2 className={clsx(status === 'Available' ? 'text-emerald-500' : 'text-slate-400')} size={24} />
                  <div>
                    <p className="font-bold text-base">{t('availability.markAvailable')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('availability.availableDesc')}</p>
                  </div>
                </button>

                {/* Unavailable Option */}
                <button
                  type="button"
                  onClick={() => setStatus('Unavailable')}
                  className={clsx(
                    'flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition duration-150',
                    status === 'Unavailable'
                      ? 'border-red-500 bg-red-500/10 text-red-800 dark:text-red-300 shadow-sm shadow-red-500/5'
                      : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <XCircle className={clsx(status === 'Unavailable' ? 'text-red-500' : 'text-slate-400')} size={24} />
                  <div>
                    <p className="font-bold text-base">{t('availability.markUnavailable')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('availability.unavailableDesc')}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* If marked as unavailable, show date selectors */}
            {status === 'Unavailable' && (
              <div className="space-y-6 border-t border-slate-100 dark:border-slate-700 pt-6 animate-fadeIn">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-primary-500" />
                    {t('availability.specifyPeriod')}
                  </h3>

                  {/* Period Type Toggle */}
                  <div className="flex bg-slate-100 dark:bg-slate-95 p-1 rounded-xl border border-slate-200 dark:border-slate-805 self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodType('single');
                        setEndDate('');
                      }}
                      className={clsx(
                        'px-4 py-1.5 rounded-lg text-xs font-semibold transition',
                        periodType === 'single'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {t('availability.singleDate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodType('range')}
                      className={clsx(
                        'px-4 py-1.5 rounded-lg text-xs font-semibold transition',
                        periodType === 'range'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {t('availability.dateRange')}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      {periodType === 'single' ? t('availability.selectDate') : t('availability.startDate')}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    />
                  </div>

                  {periodType === 'range' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {t('availability.endDate')}
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Schedule Summary */}
            {currentSchedule.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t('availability.activeSchedule')}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentSchedule.map(date => (
                    <Badge key={date} variant="danger">
                      {date}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Panel */}
            <div className="flex justify-end border-t border-slate-100 dark:border-slate-700 pt-6">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> {t('availability.submitting')}
                  </>
                ) : status === 'Available' ? (
                  <>
                    <CheckCircle2 size={16} /> {t('availability.markAvailable')}
                  </>
                ) : (
                  <>
                    <Send size={16} /> {t('availability.sendRequest')}
                  </>
                )}
              </Button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
