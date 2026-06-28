import { useEffect, useState } from 'react';
import { AlertTriangle, BedDouble, Pill, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../context/AppContext';
import { environment } from '../../config/environment';

interface InterventionAlert {
  branchId: string;
  branchName: string;
  branchType: string;
  type: 'Bed Shortage' | 'Severe Stockout' | 'Staff Crunch';
  severity: 'High' | 'Medium';
  metric: string;
  justification: string;
  timestamp: string;
  details?: {
    occupancyPct?: number;
    availableBeds?: number;
    outOfStockCount?: number;
    totalItemsCount?: number;
    patientCount?: number;
    staffCount?: number;
  };
}

export function DistrictInterventionAlerts() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<InterventionAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      try {
        const res = await authFetch(`${environment.mainBackendUrl}/hospitals/district/intervention-alerts`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setAlerts(data);
          }
        }
      } catch (err) {
        console.error('Failed to load intervention alerts:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // Don't show anything if there are no alerts to minimize dashboard noise
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-100 dark:border-rose-950/30 p-5 shadow-sm relative overflow-hidden">
      {/* Decorative background pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-950/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none animate-pulse"></div>

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="relative">
          <div className="bg-rose-50 dark:bg-rose-900/30 p-2 rounded-xl text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} className="animate-bounce" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
            {alerts.length}
          </span>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t('dashboard.intervention.title', 'District Intervention Alerts')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('dashboard.intervention.subtitle', 'Health centres flagging critical resource bottlenecks')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10">
        {alerts.map((alert, idx) => {
          const isHigh = alert.severity === 'High';
          
          const getLocalizedJustification = () => {
            if (!alert.details) return alert.justification;
            if (alert.type === 'Bed Shortage') {
              return t('dashboard.intervention.justification_bed', {
                occupancy: alert.details.occupancyPct,
                beds: alert.details.availableBeds,
                defaultValue: alert.justification,
              });
            }
            if (alert.type === 'Severe Stockout') {
              return t('dashboard.intervention.justification_stockout', {
                outOfStock: alert.details.outOfStockCount,
                total: alert.details.totalItemsCount,
                defaultValue: alert.justification,
              });
            }
            if (alert.type === 'Staff Crunch') {
              return t('dashboard.intervention.justification_staff', {
                patients: alert.details.patientCount,
                staff: alert.details.staffCount,
                defaultValue: alert.justification,
              });
            }
            return alert.justification;
          };

          const getLocalizedMetric = () => {
            if (!alert.details) return alert.metric;
            if (alert.type === 'Bed Shortage') {
              return t('dashboard.intervention.metric_bed', {
                occupancy: alert.details.occupancyPct,
                beds: alert.details.availableBeds,
                defaultValue: alert.metric,
              });
            }
            if (alert.type === 'Severe Stockout') {
              const stockoutPct = alert.details.totalItemsCount
                ? Math.round((alert.details.outOfStockCount! / alert.details.totalItemsCount!) * 100)
                : 0;
              return t('dashboard.intervention.metric_stockout', {
                ratio: stockoutPct,
                defaultValue: alert.metric,
              });
            }
            if (alert.type === 'Staff Crunch') {
              const staffRatio = alert.details.staffCount! > 0
                ? (alert.details.patientCount! / alert.details.staffCount!).toFixed(1)
                : alert.details.patientCount!.toFixed(1);
              return t('dashboard.intervention.metric_staff', {
                ratio: staffRatio,
                defaultValue: alert.metric,
              });
            }
            return alert.metric;
          };
          
          return (
            <div 
              key={`${alert.branchId}-${alert.type}-${idx}`}
              className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-between hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {alert.branchName}
                    </h3>
                    <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                      {alert.branchType}
                    </span>
                  </div>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isHigh 
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' 
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {isHigh ? t('dashboard.intervention.severity_high', 'High') : t('dashboard.intervention.severity_medium', 'Medium')}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${
                    alert.type === 'Bed Shortage' 
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' 
                      : alert.type === 'Severe Stockout' 
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' 
                      : 'bg-violet-50 dark:bg-violet-950/20 text-violet-600'
                  }`}>
                    {alert.type === 'Bed Shortage' && <BedDouble size={14} />}
                    {alert.type === 'Severe Stockout' && <Pill size={14} />}
                    {alert.type === 'Staff Crunch' && <Users size={14} />}
                  </div>
                  
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {alert.type === 'Bed Shortage' && t('dashboard.intervention.bed_shortage', 'Bed Shortage')}
                    {alert.type === 'Severe Stockout' && t('dashboard.intervention.severe_stockout', 'Severe Stockout')}
                    {alert.type === 'Staff Crunch' && t('dashboard.intervention.staff_crunch', 'Staff Crunch')}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded inline-block mb-3">
                  {getLocalizedMetric()}
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {getLocalizedJustification()}
                </p>
              </div>

              <div>
                {alert.type === 'Severe Stockout' && (
                  <Link
                    to="/ai-analytics"
                    className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 bg-primary-50 dark:bg-primary-950/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 py-2 rounded-lg transition-colors"
                  >
                    {t('dashboard.intervention.action_transfer', 'Initiate AI Transfer')}
                    <ChevronRight size={14} />
                  </Link>
                )}

                {alert.type === 'Staff Crunch' && (
                  <Link
                    to="/transfers"
                    className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 py-2 rounded-lg transition-colors"
                  >
                    {t('dashboard.intervention.action_staff', 'Rebalance Staff')}
                    <ChevronRight size={14} />
                  </Link>
                )}

                {alert.type === 'Bed Shortage' && (
                  <Link
                    to={`/hospitals`}
                    className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 py-2 rounded-lg transition-colors"
                  >
                    {t('dashboard.intervention.action_view_hospital', 'Manage Facilities')}
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
