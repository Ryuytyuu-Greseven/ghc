import type {
  InventoryMaster,
  CentralInventoryEntry,
  BranchInventoryEntry,
  InventoryRequest,
  AuditLog,
  PaginatedResponse,
} from '../types';
import { authFetch } from '../context/AppContext';

const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await authFetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? `${method} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

export const inventoryApi = {
  // Inventory Master
  getMasters: (params = '') =>
    get<PaginatedResponse<InventoryMaster>>(`/inventory-master${params ? '?' + params : ''}`),
  getMaster: (id: string) => get<InventoryMaster>(`/inventory-master/${id}`),
  searchMasters: (q: string) =>
    get<InventoryMaster[]>(`/inventory-master/search?q=${encodeURIComponent(q)}`),
  createMaster: (data: object) => post<InventoryMaster>('/inventory-master', data),
  updateMaster: (id: string, data: object) => put<InventoryMaster>(`/inventory-master/${id}`, data),
  deleteMaster: (id: string) => del<{ id: string; deactivated: boolean }>(`/inventory-master/${id}`),

  // Central Inventory
  getCentralStock: (params = '') =>
    get<PaginatedResponse<CentralInventoryEntry>>(`/central-inventory${params ? '?' + params : ''}`),
  getLowStock: (threshold = 50) =>
    get<CentralInventoryEntry[]>(`/central-inventory/low-stock?threshold=${threshold}`),
  addCentralStock: (data: object) => post<CentralInventoryEntry>('/central-inventory', data),
  updateCentralStock: (id: string, data: object) =>
    put<CentralInventoryEntry>(`/central-inventory/${id}`, data),
  removeCentralStock: (id: string) => del<{ id: string; removed: boolean }>(`/central-inventory/${id}`),

  // Branch Inventory
  getBranchStock: (branchId: string, params = '') =>
    get<PaginatedResponse<BranchInventoryEntry>>(
      `/branch-inventory/branch/${branchId}${params ? '?' + params : ''}`,
    ),
  getItemAvailability: (itemId: string) =>
    get<BranchInventoryEntry[]>(`/branch-inventory/item/${itemId}`),

  // Inventory Requests
  getRequests: (params = '') =>
    get<PaginatedResponse<InventoryRequest>>(`/inventory-requests${params ? '?' + params : ''}`),
  getRequest: (id: string) => get<InventoryRequest>(`/inventory-requests/${id}`),
  getBranchRequests: (branchId: string) =>
    get<InventoryRequest[]>(`/inventory-requests/branch/${branchId}`),
  createRequest: (data: object) => post<InventoryRequest>('/inventory-requests', data),
  approveRequest: (id: string, data: object) =>
    put<InventoryRequest>(`/inventory-requests/${id}/approve`, data),
  rejectRequest: (id: string, data: object) =>
    put<InventoryRequest>(`/inventory-requests/${id}/reject`, data),

  // Inventory Transactions
  getTransactions: (params = '') => {
    const queryParts = [];
    if (params) {
      queryParts.push(params);
    }
    queryParts.push('module=inventory');
    return get<PaginatedResponse<AuditLog>>(`/audit-logs?${queryParts.join('&')}`);
  },
  getItemTransactions: (itemId: string) =>
    get<AuditLog[]>(`/audit-logs?module=inventory&itemId=${itemId}`),
};
