import type { Hospital, PaginatedResponse } from '../types';
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

export const hospitalApi = {
  getHospitals: (params = '') =>
    get<PaginatedResponse<Hospital>>(`/hospitals${params ? '?' + params : ''}`),
  getHospital: (id: string) => get<Hospital>(`/hospitals/${id}`),
  createHospital: (data: Omit<Hospital, 'id' | 'createdAt'>) => post<Hospital>('/hospitals', data),
  updateHospital: (id: string, data: Partial<Hospital>) => put<Hospital>(`/hospitals/${id}`, data),
  deleteHospital: (id: string) => del<{ id: string; removed: boolean }>(`/hospitals/${id}`),
  getHospitalHistory: (id: string) => get<Hospital[]>(`/hospitals/${id}/history`),
  getBedAllocationHistory: (id: string) => get<any[]>(`/hospitals/${id}/bed-allocations`),
};
