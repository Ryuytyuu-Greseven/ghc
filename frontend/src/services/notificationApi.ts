import type { AppNotification } from '../types';
import { authFetch } from '../context/AppContext';
import { environment } from '@env/environment';

const BASE = environment.mainBackendUrl;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await authFetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `${method} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>('GET', path);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

export const notificationApi = {
  list: () => get<AppNotification[]>('/notifications'),
  unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => put<AppNotification>(`/notifications/${id}/read`, {}),
  markAllRead: () => put<{ success: boolean }>('/notifications/read-all', {}),
  dismiss: (id: string) => del<{ id: string; removed: boolean }>(`/notifications/${id}`),
};
