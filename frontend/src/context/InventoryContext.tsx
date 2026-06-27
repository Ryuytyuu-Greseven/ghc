import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  InventoryMaster,
  CentralInventoryEntry,
  BranchInventoryEntry,
  InventoryRequest,
  InventoryTransaction,
  PaginationMeta,
} from '../types';
import { inventoryApi } from '../services/inventoryApi';

interface InventoryContextValue {
  // State
  masters: InventoryMaster[];
  centralStock: CentralInventoryEntry[];
  branchStock: BranchInventoryEntry[];
  requests: InventoryRequest[];
  transactions: InventoryTransaction[];

  // Pagination Metadata
  mastersPagination: PaginationMeta | null;
  centralPagination: PaginationMeta | null;
  centralSummary: {
    totalAvailable: number;
    totalDamaged: number;
    lowStockCount: number;
    expiringCount: number;
  } | null;
  branchPagination: PaginationMeta | null;
  requestsPagination: PaginationMeta | null;
  transactionsPagination: PaginationMeta | null;

  // Loading flags
  loadingMasters: boolean;
  loadingCentral: boolean;
  loadingBranch: boolean;
  loadingRequests: boolean;
  loadingTransactions: boolean;

  // Error
  error: string | null;

  // Actions
  loadMasters: (params?: string) => Promise<void>;
  createMaster: (data: object) => Promise<void>;
  updateMaster: (id: string, data: object) => Promise<void>;
  deleteMaster: (id: string) => Promise<void>;

  loadCentralStock: (params?: string) => Promise<void>;
  addCentralStock: (data: object) => Promise<void>;
  removeCentralStock: (id: string) => Promise<void>;

  loadBranchStock: (branchId: string, params?: string) => Promise<void>;

  loadRequests: (params?: string) => Promise<void>;
  createRequest: (data: object) => Promise<void>;
  approveRequest: (id: string, data: object) => Promise<void>;
  rejectRequest: (id: string, data: object) => Promise<void>;

  loadTransactions: (params?: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [masters, setMasters] = useState<InventoryMaster[]>([]);
  const [centralStock, setCentralStock] = useState<CentralInventoryEntry[]>([]);
  const [branchStock, setBranchStock] = useState<BranchInventoryEntry[]>([]);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // Pagination state
  const [mastersPagination, setMastersPagination] = useState<PaginationMeta | null>(null);
  const [centralPagination, setCentralPagination] = useState<PaginationMeta | null>(null);
  const [centralSummary, setCentralSummary] = useState<{
    totalAvailable: number;
    totalDamaged: number;
    lowStockCount: number;
    expiringCount: number;
  } | null>(null);
  const [branchPagination, setBranchPagination] = useState<PaginationMeta | null>(null);
  const [requestsPagination, setRequestsPagination] = useState<PaginationMeta | null>(null);
  const [transactionsPagination, setTransactionsPagination] = useState<PaginationMeta | null>(null);

  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingCentral, setLoadingCentral] = useState(false);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ── Masters ────────────────────────────────────────────────────────────────

  const loadMasters = useCallback(async (params = '') => {
    setLoadingMasters(true);
    try {
      const response = await inventoryApi.getMasters(params);
      setMasters(response.data);
      setMastersPagination(response.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory masters');
    } finally {
      setLoadingMasters(false);
    }
  }, []);

  const createMaster = useCallback(async (data: object) => {
    await inventoryApi.createMaster(data);
    await loadMasters();
  }, [loadMasters]);

  const updateMaster = useCallback(async (id: string, data: object) => {
    await inventoryApi.updateMaster(id, data);
    await loadMasters();
  }, [loadMasters]);

  const deleteMaster = useCallback(async (id: string) => {
    await inventoryApi.deleteMaster(id);
    await loadMasters();
  }, [loadMasters]);

  // ── Central Stock ──────────────────────────────────────────────────────────

  const loadCentralStock = useCallback(async (params = '') => {
    setLoadingCentral(true);
    try {
      const response = await inventoryApi.getCentralStock(params);
      setCentralStock(response.data);
      setCentralPagination(response.pagination);
      setCentralSummary((response as any).summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load central stock');
    } finally {
      setLoadingCentral(false);
    }
  }, []);

  const addCentralStock = useCallback(async (data: object) => {
    await inventoryApi.addCentralStock(data);
    await loadCentralStock();
  }, [loadCentralStock]);

  const removeCentralStock = useCallback(async (id: string) => {
    await inventoryApi.removeCentralStock(id);
    await loadCentralStock();
  }, [loadCentralStock]);

  // ── Branch Stock ───────────────────────────────────────────────────────────

  const loadBranchStock = useCallback(async (branchId: string, params = '') => {
    setLoadingBranch(true);
    try {
      const response = await inventoryApi.getBranchStock(branchId, params);
      setBranchStock(response.data);
      setBranchPagination(response.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load branch stock');
    } finally {
      setLoadingBranch(false);
    }
  }, []);

  // ── Requests ───────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async (params = '') => {
    setLoadingRequests(true);
    try {
      const response = await inventoryApi.getRequests(params);
      setRequests(response.data);
      setRequestsPagination(response.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const createRequest = useCallback(async (data: object) => {
    await inventoryApi.createRequest(data);
    await loadRequests();
  }, [loadRequests]);

  const approveRequest = useCallback(async (id: string, data: object) => {
    await inventoryApi.approveRequest(id, data);
    await loadRequests();
  }, [loadRequests]);

  const rejectRequest = useCallback(async (id: string, data: object) => {
    await inventoryApi.rejectRequest(id, data);
    await loadRequests();
  }, [loadRequests]);

  // ── Transactions ───────────────────────────────────────────────────────────

  const loadTransactions = useCallback(async (params = '') => {
    setLoadingTransactions(true);
    try {
      const response = await inventoryApi.getTransactions(params);
      setTransactions(response.data);
      setTransactionsPagination(response.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadMasters();
    loadCentralStock();
    loadRequests();
    loadTransactions();
  }, [loadMasters, loadCentralStock, loadRequests, loadTransactions]);

  return (
    <InventoryContext.Provider
      value={{
        masters,
        centralStock,
        branchStock,
        requests,
        transactions,
        mastersPagination,
        centralPagination,
        centralSummary,
        branchPagination,
        requestsPagination,
        transactionsPagination,
        loadingMasters,
        loadingCentral,
        loadingBranch,
        loadingRequests,
        loadingTransactions,
        error,
        loadMasters,
        createMaster,
        updateMaster,
        deleteMaster,
        loadCentralStock,
        addCentralStock,
        removeCentralStock,
        loadBranchStock,
        loadRequests,
        createRequest,
        approveRequest,
        rejectRequest,
        loadTransactions,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
