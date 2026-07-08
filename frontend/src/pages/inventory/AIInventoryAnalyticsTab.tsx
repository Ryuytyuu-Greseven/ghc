import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import { useInventory } from '../../context/InventoryContext';
import { inventoryApi } from '../../services/inventoryApi';
import type { DemandForecast, RedistributionRecommendation, StockoutWarning } from '../../types';

function ForecastChart({
  historical,
  projected,
  historicLabel,
  projectedLabel,
}: {
  historical: { date: string; quantity: number }[];
  projected: { date: string; quantity: number }[];
  historicLabel: string;
  projectedLabel: string;
}) {
  const chartData = useMemo(() => {
    const recentHistoric = historical.slice(-14);
    return [
      ...recentHistoric.map((point) => ({ ...point, type: 'historic' as const })),
      ...projected.map((point) => ({ ...point, type: 'projected' as const })),
    ];
  }, [historical, projected]);

  const maxValue = Math.max(...chartData.map((point) => point.quantity), 1);
  const width = 640;
  const height = 220;
  const padding = 28;
  const barWidth = Math.max(8, (width - padding * 2) / Math.max(chartData.length, 1) - 4);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
          {historicLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary-500" />
          {projectedLabel}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full h-[220px]">
          {chartData.map((point, index) => {
            const barHeight = (point.quantity / maxValue) * (height - padding * 2);
            const x = padding + index * (barWidth + 4);
            const y = height - padding - barHeight;
            return (
              <g key={`${point.type}-${point.date}-${index}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  className={point.type === 'historic' ? 'fill-slate-400/80' : 'fill-primary-500/90'}
                />
                {index % 3 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-slate-500 text-[9px]"
                  >
                    {point.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function AIInventoryAnalyticsTab() {
  const { t } = useTranslation();
  const { hospitals } = useApp();
  const { masters, loadMasters } = useInventory();

  const [warnings, setWarnings] = useState<StockoutWarning[]>([]);
  const [recommendations, setRecommendations] = useState<RedistributionRecommendation[]>([]);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);

  const [loadingWarnings, setLoadingWarnings] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('branchId') || '';
  });
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    if (hospitals.length === 1 && !selectedBranchId) {
      setSelectedBranchId(hospitals[0]._id ?? '');
    }
  }, [hospitals, selectedBranchId]);

  const loadWarnings = useCallback(async () => {
    setLoadingWarnings(true);
    try {
      const data = await inventoryApi.getStockoutWarnings();
      setWarnings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.analytics.loadWarningsError', 'Failed to load warnings'));
    } finally {
      setLoadingWarnings(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      const data = await inventoryApi.getRedistributionRecommendations();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.analytics.loadRecommendationsError', 'Failed to load recommendations'));
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  useEffect(() => {
    loadWarnings();
    loadRecommendations();
    loadMasters('page=1&pageSize=100');
  }, [loadWarnings, loadRecommendations, loadMasters]);

  const handleLoadForecast = async () => {
    if (!selectedBranchId || !selectedItemId) return;
    setLoadingForecast(true);
    setError(null);
    try {
      const data = await inventoryApi.getDemandForecast(selectedItemId, selectedBranchId);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.analytics.loadForecastError', 'Failed to load forecast'));
      setForecast(null);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleApplyTransfer = async (rec: RedistributionRecommendation) => {
    const key = `${rec.fromBranchId}-${rec.toBranchId}-${rec.itemId}`;
    setApplyingKey(key);
    setError(null);
    setSuccessMessage(null);
    try {
      await inventoryApi.applyRedistribution({
        fromBranchId: rec.fromBranchId,
        toBranchId: rec.toBranchId,
        itemId: rec.itemId,
        quantity: rec.recommendedQuantity,
        performedBy: 'Smart Redistribution Request',
      });
      setSuccessMessage(t('inventory.analytics.applySuccess'));
      await loadRecommendations();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.analytics.applyTransferError', 'Failed to apply transfer'));
    } finally {
      setApplyingKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {(error || successMessage) && (
          <div
            className={clsx(
              'rounded-xl border px-4 py-3 text-sm',
              error
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300',
            )}
          >
            {error ?? successMessage}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {t('inventory.analytics.criticalAlerts')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('inventory.analytics.criticalAlertsDesc')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadWarnings}>
              <RefreshCw size={14} />
            </Button>
          </div>

          <div className="p-5">
            {loadingWarnings ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : warnings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {t('inventory.analytics.noWarnings')}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('inventory.analytics.noWarningsDesc')}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {warnings.map((warning) => {
                  const isCritical = warning.alertType === 'stockout' || warning.alertType === 'expired';
                  const badgeText = warning.alertType === 'expired'
                    ? t('inventory.fields.expired', 'Expired')
                    : warning.alertType === 'stockout'
                    ? t('inventory.fields.stockout', 'Stockout')
                    : warning.alertType === 'expiring'
                    ? t('inventory.fields.expiringSoon', 'Expiring ({{days}}d)', { days: warning.daysOfStock })
                    : `${warning.daysOfStock}d`;

                  return (
                    <div
                      key={`${warning.branchId}-${warning.itemId}-${warning.batchNo || ''}-${warning.alertType || ''}`}
                      className={clsx(
                        "rounded-xl border p-4",
                        isCritical
                          ? "border-red-200/80 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10"
                          : "border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{warning.itemName}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{warning.branchName}</p>
                          {warning.batchNo && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {t('inventory.fields.batch', 'Batch')}: {warning.batchNo}
                            </p>
                          )}
                          {warning.expiryDate && (
                            <p className="text-[10px] text-slate-400">
                              {t('inventory.fields.expiry', 'Expiry')}: {new Date(warning.expiryDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge variant={isCritical ? 'danger' : 'warning'}>{badgeText}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">{t('inventory.analytics.availableQty')}</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{warning.availableQty}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">{t('inventory.analytics.dailyConsumption')}</p>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {warning.alertType === 'expiring' || warning.alertType === 'expired' ? '-' : warning.dailyConsumptionRate}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('inventory.analytics.demandForecast')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('inventory.analytics.demandForecastDesc')}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('inventory.analytics.selectBranch')}
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="">{t('inventory.analytics.chooseBranch')}</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('inventory.analytics.selectItem')}
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <option value="">{t('inventory.analytics.chooseItem')}</option>
                  {masters.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleLoadForecast}
                  disabled={!selectedBranchId || !selectedItemId || loadingForecast}
                  className="w-full"
                >
                  {loadingForecast ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('inventory.analytics.loadingForecast')}
                    </>
                  ) : (
                    <>
                      <Brain size={16} />
                      {t('inventory.analytics.loadForecast')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {forecast && (
              <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {forecast.itemName} · {forecast.branchName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('inventory.analytics.avgDailyConsumption', 'Avg daily consumption: {{val}}', { val: forecast.averageDailyConsumption })}
                    </p>
                  </div>
                </div>
                <ForecastChart
                  historical={forecast.historicalDaily}
                  projected={forecast.forecast7Day}
                  historicLabel={t('inventory.analytics.historicDemand')}
                  projectedLabel={t('inventory.analytics.projectedDemand')}
                />
                <div className="rounded-lg border border-violet-200/70 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    {t('inventory.analytics.aiSummary')}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{forecast.aiSummary}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {t('inventory.analytics.redistribution')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('inventory.analytics.redistributionDesc')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecommendations}>
              <RefreshCw size={14} className="mr-1" />
              {t('inventory.analytics.refreshRecommendations')}
            </Button>
          </div>

          <div className="p-5">
            {loadingRecommendations ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {t('inventory.analytics.noRecommendations')}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('inventory.analytics.noRecommendationsDesc')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">{t('inventory.analytics.item')}</th>
                      <th className="px-3 py-2">{t('inventory.analytics.fromFacility')}</th>
                      <th className="px-3 py-2">{t('inventory.analytics.toFacility')}</th>
                      <th className="px-3 py-2">{t('inventory.analytics.quantity')}</th>
                      <th className="px-3 py-2">{t('inventory.analytics.justification')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((rec) => {
                      const key = `${rec.fromBranchId}-${rec.toBranchId}-${rec.itemId}`;
                      return (
                        <tr
                          key={key}
                          className="border-b border-slate-100 dark:border-slate-700/70 align-top"
                        >
                          <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                            {rec.itemName}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {rec.fromBranchName}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                            {rec.toBranchName}
                          </td>
                          <td className="px-3 py-3">{rec.recommendedQuantity}</td>
                          <td className="px-3 py-3 max-w-md text-slate-600 dark:text-slate-400">
                            {rec.justification}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              onClick={() => handleApplyTransfer(rec)}
                              disabled={applyingKey === key || rec.isAlreadyRequested}
                              variant={rec.isAlreadyRequested ? 'secondary' : 'primary'}
                            >
                              {applyingKey === key ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  {t('inventory.analytics.applyingTransfer')}
                                </>
                              ) : rec.isAlreadyRequested ? (
                                t('inventory.analytics.alreadyRequested')
                              ) : (
                                t('inventory.analytics.applyTransfer')
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
