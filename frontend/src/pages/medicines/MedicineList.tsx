import { useState } from 'react';
import { Package, Warehouse, GitBranch, ClipboardList, ArrowLeftRight } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { InventoryMasterTab } from '../inventory/InventoryMasterTab';
import { CentralInventoryTab } from '../inventory/CentralInventoryTab';
import { BranchInventoryTab } from '../inventory/BranchInventoryTab';
import { InventoryRequestsTab } from '../inventory/InventoryRequestsTab';
import { InventoryTransactionsTab } from '../inventory/InventoryTransactionsTab';

export function MedicineList() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'master' | 'central' | 'branch' | 'requests' | 'transactions'>('master');

  const tabs = [
    { id: 'master', label: t('inventory.tabs.master'), icon: Package },
    { id: 'central', label: t('inventory.tabs.central'), icon: Warehouse },
    { id: 'branch', label: t('inventory.tabs.branch'), icon: GitBranch },
    { id: 'requests', label: t('inventory.tabs.requests'), icon: ClipboardList },
    { id: 'transactions', label: t('inventory.tabs.transactions'), icon: ArrowLeftRight },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
      />

      {/* Tab navigation bar */}
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

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'master' && <InventoryMasterTab />}
        {activeTab === 'central' && <CentralInventoryTab />}
        {activeTab === 'branch' && <BranchInventoryTab />}
        {activeTab === 'requests' && <InventoryRequestsTab />}
        {activeTab === 'transactions' && <InventoryTransactionsTab />}
      </div>
    </div>
  );
}
