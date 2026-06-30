import { Header } from '../../components/layout/Header';
import { useTranslation } from 'react-i18next';
import { AIInventoryAnalyticsTab } from './AIInventoryAnalyticsTab';

export function AIInventoryAnalytics() {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col h-full">
      <Header
        title={t('inventory.analytics.title')}
        subtitle={t('inventory.analytics.subtitle')}
      />
      <AIInventoryAnalyticsTab />
    </div>
  );
}
