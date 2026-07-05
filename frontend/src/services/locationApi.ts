import { authFetch } from '../context/AppContext';
import { environment } from '@env/environment';

const BASE = environment.mainBackendUrl;

async function request<T>(method: string, path: string): Promise<T> {
  const res = await authFetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? `${method} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const locationApi = {
  getStates: () => request<any[]>('GET', '/states'),
  getDistricts: (stateId: string | number) => request<any[]>('GET', `/districts?stateId=${stateId}`),
};
