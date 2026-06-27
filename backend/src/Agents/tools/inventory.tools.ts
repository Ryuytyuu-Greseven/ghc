import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { httpClient } from '../../common/services/http.service';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function fetch(url: string, init?: any) {
  const path = url.startsWith(BASE) ? url.substring(BASE.length) : url;
  const method = init?.method ?? 'GET';
  const headers = init?.headers;
  const data = init?.body ? JSON.parse(init.body) : undefined;

  const res = await httpClient.request({
    url: path,
    method,
    headers,
    data,
  });

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    json: async () => res.data,
  };
}

const listInventoryMasters = tool(
  async ({ query, category, status }) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    
    const res = await fetch(`${BASE}/inventory-master?${params.toString()}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_inventory_masters',
    description: 'List or search inventory items from the master catalog. Can filter by category or status.',
    schema: z.object({
      query: z.string().optional().describe('Search query for item name or item code'),
      category: z.string().optional().describe('Category name e.g. Medicine, Equipment, Consumable, Surgical, Diagnostic, Other'),
      status: z.string().optional().describe('Status e.g. Active, Inactive'),
    }),
  },
);

const getInventoryMaster = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/inventory-master/${id}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_inventory_master',
    description: 'Get details of a specific inventory master item by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the inventory master item'),
    }),
  },
);

const createInventoryMaster = tool(
  async (data) => {
    const res = await fetch(`${BASE}/inventory-master`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_inventory_master',
    description: 'Create a new item definition in the inventory master catalog',
    schema: z.object({
      itemCode: z.string().describe('Unique item code, e.g. PARA500, SYR2ML'),
      itemName: z.string().describe('Descriptive name of the item'),
      category: z.string().describe('Category, e.g. Medicine, Equipment, Consumable, Surgical, Diagnostic, Other'),
      unit: z.string().describe('Measurement unit, e.g. Box, Bottle, Pack, Vial'),
      status: z.string().optional().describe('Status, Active or Inactive. Defaults to Active'),
    }),
  },
);

const updateInventoryMaster = tool(
  async ({ id, ...data }) => {
    const res = await fetch(`${BASE}/inventory-master/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'update_inventory_master',
    description: 'Update properties of an existing item in the master catalog',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the item to update'),
      itemName: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      status: z.string().optional(),
    }),
  },
);

const deleteInventoryMaster = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/inventory-master/${id}`, { method: 'DELETE' });
    return JSON.stringify(await res.json());
  },
  {
    name: 'delete_inventory_master',
    description: 'Soft delete (deactivate) an item in the master catalog',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the item to deactivate'),
    }),
  },
);

const listCentralInventory = tool(
  async () => {
    const res = await fetch(`${BASE}/central-inventory`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_central_inventory',
    description: 'List all stock levels, batch numbers, and expiries in the Central Store (Head Office warehouse)',
    schema: z.object({}),
  },
);

const getLowStockCentral = tool(
  async ({ threshold }) => {
    const limit = threshold ?? 50;
    const res = await fetch(`${BASE}/central-inventory/low-stock?threshold=${limit}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_low_stock_central',
    description: 'Get central inventory items whose available quantities are at or below a given threshold',
    schema: z.object({
      threshold: z.number().optional().describe('Stock threshold limit. Defaults to 50'),
    }),
  },
);

const addCentralStock = tool(
  async (data) => {
    const res = await fetch(`${BASE}/central-inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, performedBy: data.performedBy ?? 'Agent' }),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'add_central_stock',
    description: 'Add physical stock to the Central Store (creates purchase audit logs)',
    schema: z.object({
      itemId: z.string().describe('MongoDB ObjectId of the item from the master catalog'),
      availableQty: z.number().describe('Quantity of available stock to add'),
      damagedQty: z.number().optional().describe('Quantity of damaged stock if any'),
      batchNo: z.string().describe('Batch number for tracking'),
      expiryDate: z.string().optional().describe('Expiry date as YYYY-MM-DD'),
      performedBy: z.string().optional().describe('Name of the person/agent performing the action'),
    }),
  },
);

const listBranchStock = tool(
  async ({ branchId }) => {
    const res = await fetch(`${BASE}/branch-inventory/branch/${branchId}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_branch_stock',
    description: 'List all stock levels, batch numbers, and expiries at a specific branch hospital/PHC/CHC',
    schema: z.object({
      branchId: z.string().describe('Branch ID (e.g. h1, h2, h3) or MongoDB ObjectId of the hospital'),
    }),
  },
);

const getItemAvailability = tool(
  async ({ itemId }) => {
    const res = await fetch(`${BASE}/branch-inventory/item/${itemId}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_item_availability',
    description: 'Check stock levels for a specific item across all hospital branches',
    schema: z.object({
      itemId: z.string().describe('MongoDB ObjectId of the item from the master catalog'),
    }),
  },
);

const listInventoryRequests = tool(
  async ({ status, branchId }) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (branchId) params.append('branchId', branchId);
    
    const res = await fetch(`${BASE}/inventory-requests?${params.toString()}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_inventory_requests',
    description: 'List branch inventory transfer requests. Can filter by status (Pending, Approved, Rejected, Partial) or branchId.',
    schema: z.object({
      status: z.string().optional().describe('Status e.g. Pending, Approved, Rejected, Partial'),
      branchId: z.string().optional().describe('Branch ID (e.g. h1, h2)'),
    }),
  },
);

const createInventoryRequest = tool(
  async (data) => {
    const res = await fetch(`${BASE}/inventory-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_inventory_request',
    description: 'Raise a new request from a branch hospital to transfer items from Central Store',
    schema: z.object({
      branchId: z.string().describe('Branch ID raising the request (e.g. h1, h2)'),
      requestedBy: z.string().describe('Name of the person raising the request'),
      items: z.array(z.object({
        itemId: z.string().describe('MongoDB ObjectId of the item'),
        requestedQty: z.number().describe('Quantity requested'),
      })).describe('List of requested items and quantities'),
      remarks: z.string().optional().describe('Optional comments or justification'),
    }),
  },
);

const approveInventoryRequest = tool(
  async ({ id, approvedItems, remarks, performedBy }) => {
    const res = await fetch(`${BASE}/inventory-requests/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedItems, remarks, performedBy: performedBy ?? 'Agent' }),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'approve_inventory_request',
    description: 'Approve a branch transfer request. Deducts stock from Central Store, adds to the branch, and writes transfer transaction logs.',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the pending request'),
      approvedItems: z.array(z.object({
        itemId: z.string().describe('MongoDB ObjectId of the item'),
        approvedQty: z.number().describe('Approved quantity'),
        issuedQty: z.number().optional().describe('Issued quantity (defaults to approvedQty if omitted)'),
      })).describe('Approved quantities per item'),
      remarks: z.string().optional().describe('Approval comments'),
      performedBy: z.string().optional().describe('Name of the person/agent approving the request'),
    }),
  },
);

const rejectInventoryRequest = tool(
  async ({ id, remarks }) => {
    const res = await fetch(`${BASE}/inventory-requests/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks }),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'reject_inventory_request',
    description: 'Reject a pending branch transfer request',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the pending request'),
      remarks: z.string().describe('Rejection remarks explaining why it was denied'),
    }),
  },
);

const listInventoryTransactions = tool(
  async ({ type, itemId, location, fromDate, toDate }) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (itemId) params.append('itemId', itemId);
    if (location) params.append('location', location);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    
    const res = await fetch(`${BASE}/inventory-transactions?${params.toString()}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_inventory_transactions',
    description: 'Query the inventory transaction history/audit logs. Can filter by type (Purchase, Transfer, Issue, Return, Damage, Expiry, Adjustment), item, location, or date range.',
    schema: z.object({
      type: z.string().optional().describe('Transaction type e.g. Purchase, Transfer, Issue, Return, Damage, Expiry, Adjustment'),
      itemId: z.string().optional().describe('MongoDB ObjectId of the item'),
      location: z.string().optional().describe('Location name or branch ID (e.g. Central, h1, h2)'),
      fromDate: z.string().optional().describe('Start date as YYYY-MM-DD'),
      toDate: z.string().optional().describe('End date as YYYY-MM-DD'),
    }),
  },
);

export const inventoryTools = [
  listInventoryMasters,
  getInventoryMaster,
  createInventoryMaster,
  updateInventoryMaster,
  deleteInventoryMaster,
  listCentralInventory,
  getLowStockCentral,
  addCentralStock,
  listBranchStock,
  getItemAvailability,
  listInventoryRequests,
  createInventoryRequest,
  approveInventoryRequest,
  rejectInventoryRequest,
  listInventoryTransactions,
];
