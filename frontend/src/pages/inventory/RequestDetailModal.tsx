import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useInventory } from '../../context/InventoryContext';
import { useApp } from '../../context/AppContext';
import type { InventoryRequest, RequestStatus } from '../../types';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';

const statusVariant: Record<RequestStatus, 'warning' | 'success' | 'danger' | 'purple'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Partial: 'purple',
};

interface EditedItem {
  itemId: string;
  approvedQty: number;
  issuedQty: number;
}

interface Props {
  request: InventoryRequest;
  onClose: () => void;
}

export function RequestDetailModal({ request, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { approveRequest, rejectRequest } = useInventory();
  const { hospitals } = useApp();
  const [submitting, setSubmitting] = useState(false);

  const getBranchInfo = (branchId: any) => {
    if (typeof branchId === 'object' && branchId !== null) {
      return branchId;
    }
    const hosp = hospitals.find((h) => h.id === branchId);
    return hosp ? { name: hosp.name, city: hosp.city } : { name: branchId, city: '' };
  };
  const branchInfo = getBranchInfo(request.branchId);

  const getSourceBranchInfo = () => {
    if (!request.fromBranchId) return { name: t('inventory.transactions.centralStore'), city: '' };
    if (typeof request.fromBranchId === 'object' && request.fromBranchId !== null) {
      const fromBranchObj = request.fromBranchId as any;
      if (fromBranchObj._id || fromBranchObj.name) {
        return { name: fromBranchObj.name, city: fromBranchObj.city };
      }
    }
    const branchIdStr = typeof request.fromBranchId === 'string'
      ? request.fromBranchId
      : (request.fromBranchId as any)?._id?.toString();
    const hosp = hospitals.find((h) => h.id === branchIdStr);
    return hosp ? { name: hosp.name, city: hosp.city } : { name: branchIdStr || '', city: '' };
  };
  const sourceBranchInfo = getSourceBranchInfo();

  const [remarks, setRemarks] = useState(request.remarks ?? '');
  const [editedItems, setEditedItems] = useState<EditedItem[]>(
    request.items.map((item) => {
      const defaultQty = request.status === 'Pending' ? item.requestedQty : 0;
      return {
        itemId: item.itemId._id,
        approvedQty: item.approvedQty || defaultQty,
        issuedQty: item.issuedQty || item.approvedQty || defaultQty,
      };
    }),
  );

  const isPending = request.status === 'Pending';

  const updateQty = (index: number, key: 'approvedQty' | 'issuedQty', value: string) => {
    setEditedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: Number(value) } : item)),
    );
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await approveRequest(request._id, {
        approvedItems: editedItems,
        remarks,
        performedBy: 'Head Office',
      });
      onClose();
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!confirm(t('inventory.requests.rejectWarning', { branch: branchInfo.name }))) return;
    setSubmitting(true);
    try {
      await rejectRequest(request._id, { remarks });
      onClose();
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.requests.requestNumber')}
          </p>
          <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
            {request.requestNumber}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.requests.status')}
          </p>
          <Badge variant={statusVariant[request.status]}>{t(`inventory.status.${request.status}`)}</Badge>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.transactions.fromLocation')}
          </p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {sourceBranchInfo.name ?? '—'}
            {sourceBranchInfo.city && (
              <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                ({sourceBranchInfo.city})
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.requests.branch')}
          </p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {branchInfo.name ?? '—'}
            {branchInfo.city && (
              <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                ({branchInfo.city})
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.requests.requestedBy')}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{request.requestedBy}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
            {t('inventory.requests.date')}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {new Date(request.createdAt).toLocaleString(i18n.language, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>

      {/* Items table */}
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {t('inventory.requests.itemsRequested')}
        </p>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('inventory.fields.itemName')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('inventory.requests.requestedQty')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('inventory.requests.approvedQty')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('inventory.requests.issuedQty')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {request.items.map((item, index) => (
                  <tr key={item.itemId._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {item.itemId.itemName}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                      {item.requestedQty}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <input
                          type="number"
                          min="0"
                          max={item.requestedQty}
                          value={editedItems[index]?.approvedQty ?? 0}
                          onChange={(e) => updateQty(index, 'approvedQty', e.target.value)}
                          className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="tabular-nums text-slate-700 dark:text-slate-300">
                          {item.approvedQty ?? 0}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <input
                          type="number"
                          min="0"
                          max={editedItems[index]?.approvedQty ?? 0}
                          value={editedItems[index]?.issuedQty ?? 0}
                          onChange={(e) => updateQty(index, 'issuedQty', e.target.value)}
                          className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="tabular-nums text-slate-700 dark:text-slate-300">
                          {item.issuedQty ?? 0}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
          {t('inventory.requests.remarks')}
        </label>
        {isPending ? (
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder={t('inventory.requests.approvalRemarksPlaceholder')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        ) : (
          <p
            className={clsx(
              'text-sm',
              request.remarks
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-slate-400 dark:text-slate-500 italic',
            )}
          >
            {request.remarks || t('inventory.requests.noRemarks')}
          </p>
        )}
      </div>

      {/* Action buttons (Pending only) */}
      {isPending && (
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Button
            type="button"
            variant="danger"
            onClick={handleReject}
            disabled={submitting}
          >
            {submitting ? t('inventory.common.saving') : t('inventory.requests.reject')}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApprove}
            disabled={submitting}
          >
            {submitting ? t('inventory.common.saving') : t('inventory.requests.approve')}
          </Button>
        </div>
      )}
    </div>
  );
}
