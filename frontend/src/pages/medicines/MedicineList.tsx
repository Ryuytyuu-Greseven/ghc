import { useState } from 'react';
import { Package, Warehouse, GitBranch, ClipboardList, ArrowLeftRight } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { clsx } from 'clsx';
import { InventoryMasterTab } from '../inventory/InventoryMasterTab';
import { CentralInventoryTab } from '../inventory/CentralInventoryTab';
import { BranchInventoryTab } from '../inventory/BranchInventoryTab';
import { InventoryRequestsTab } from '../inventory/InventoryRequestsTab';
import { InventoryTransactionsTab } from '../inventory/InventoryTransactionsTab';

const tabs = [
  { id: 'master', label: 'Inventory Master', icon: Package },
  { id: 'central', label: 'Central Stock', icon: Warehouse },
  { id: 'branch', label: 'Branch Stock', icon: GitBranch },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
] as const;

type Tab = typeof tabs[number]['id'];

export function MedicineList() {
  const [activeTab, setActiveTab] = useState<Tab>('master');

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Medicines & Supplies"
        subtitle="Manage inventory, stock, requests, and audit trail"
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
