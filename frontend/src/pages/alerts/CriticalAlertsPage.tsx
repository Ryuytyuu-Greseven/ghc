import { Header } from '../../components/layout/Header';
import { useTranslation } from 'react-i18next';
import { DistrictInterventionAlerts } from '../../components/dashboard/DistrictInterventionAlerts';
import { useApp } from '../../context/AppContext';

export function CriticalAlertsPage() {
  const { t } = useTranslation();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/40">
      <Header
        title={t('dashboard.intervention.title', 'Critical Alerts')}
        subtitle={
          isAdmin
            ? t('dashboard.intervention.subtitle', 'Health centres flagging critical resource bottlenecks')
            : t('dashboard.intervention.subtitle_staff', 'Critical resource alerts for your facility')
        }
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <DistrictInterventionAlerts mode="standalone" />
        </div>
      </div>
    </div>
  );
}
