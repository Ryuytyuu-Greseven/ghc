import { useState, useEffect } from 'react';
import { ClipboardList, ListChecks } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { TestCatalogTab } from './TestCatalogTab';
import { AvailabilityAuditTab } from './AvailabilityAuditTab';

type TabId = 'catalog' | 'audit';

export function DiagnosticTestsPage() {
  const { t } = useTranslation();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'Admin';

  const allTabs = [
    { id: 'catalog' as const, label: t('diagnosticTests.tabs.catalog'), icon: ListChecks },
    { id: 'audit' as const, label: t('diagnosticTests.tabs.audit'), icon: ClipboardList },
  ];

  const tabs = isAdmin ? allTabs : allTabs.filter((tab) => tab.id !== 'catalog');
  const defaultTab: TabId = isAdmin ? 'catalog' : 'audit';

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  useEffect(() => {
    setActiveTab(isAdmin ? 'catalog' : 'audit');
  }, [isAdmin]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t('diagnosticTests.title')}
        subtitle={t('diagnosticTests.subtitle')}
      />

      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'catalog' && isAdmin && <TestCatalogTab />}
      {activeTab === 'audit' && <AvailabilityAuditTab />}
    </div>
  );
}
