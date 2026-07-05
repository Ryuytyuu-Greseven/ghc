import type {
  DiagnosticTest,
  FacilityAvailabilityEntry,
  FacilityTestAvailabilityRow,
  PaginatedResponse,
  TestAvailabilityAudit,
} from '../types';
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
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

export const diagnosticTestApi = {
  getTests: (params = '') =>
    get<PaginatedResponse<DiagnosticTest>>(`/diagnostic-tests${params ? '?' + params : ''}`),
  getTestsByHospital: (hospitalId: string) =>
    get<FacilityTestAvailabilityRow[]>(`/facility-test-availability/hospital/${hospitalId}`),
  getAvailableTestsByHospital: (hospitalId: string) =>
    get<FacilityTestAvailabilityRow[]>(
      `/facility-test-availability/hospital/${hospitalId}?availableOnly=true`,
    ),
  getTest: (id: string) => get<DiagnosticTest>(`/diagnostic-tests/${id}`),
  searchTests: (q: string) =>
    get<DiagnosticTest[]>(`/diagnostic-tests/search?q=${encodeURIComponent(q)}`),
  createTest: (data: {
    testName: string;
    testCode?: string;
    category: string;
    sampleType?: string;
    status?: string;
    facilityAvailability?: FacilityAvailabilityEntry[];
  }) => post<DiagnosticTest>('/diagnostic-tests', data),
  updateTest: (
    id: string,
    data: {
      testName?: string;
      testCode?: string;
      category?: string;
      sampleType?: string;
      status?: string;
      facilityAvailability?: FacilityAvailabilityEntry[];
    },
  ) => put<DiagnosticTest>(`/diagnostic-tests/${id}`, data),
  deleteTest: (id: string) => del<{ id: string; deactivated: boolean }>(`/diagnostic-tests/${id}`),

  getAuditLog: (params = '') =>
    get<PaginatedResponse<TestAvailabilityAudit>>(
      `/facility-test-availability/audit-log${params ? '?' + params : ''}`,
    ),
};
