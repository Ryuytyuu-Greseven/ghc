import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { appInstance } from '../../main';
import { InventoryMasterService } from '../../inventory/inventory-master/inventory-master.service';
import { CentralInventoryService } from '../../inventory/central-inventory/central-inventory.service';
import { BranchInventoryService } from '../../inventory/branch-inventory/branch-inventory.service';
import { InventoryRequestsService } from '../../inventory/inventory-requests/inventory-requests.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { HospitalsService } from '../../hospitals/hospitals.service';

export const listInventoryMasters = tool(
  async ({ query, category, status }) => {
    const service = appInstance.get(InventoryMasterService);
    const result = await service.findAll({ search: query, q: query, category, status });
    return JSON.stringify(result);
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

export const getInventoryMaster = tool(
  async ({ id }) => {
    const service = appInstance.get(InventoryMasterService);
    const result = await service.findOne(id);
    return JSON.stringify(result);
  },
  {
    name: 'get_inventory_master',
    description: 'Get details of a specific inventory master item by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the inventory master item'),
    }),
  },
);

export const createInventoryMaster = tool(
  async (data) => {
    const service = appInstance.get(InventoryMasterService);
    const result = await service.create(data);
    return JSON.stringify(result);
  },
  {
    name: 'create_inventory_master',
    description: 'Create a new item definition in the inventory master catalog',
    schema: z.object({
      itemName: z.string().describe('Descriptive name of the item'),
      category: z.string().describe('Category, e.g. Medicine, Equipment, Consumable, Surgical, Diagnostic, Other'),
      status: z.string().optional().describe('Status, Active or Inactive. Defaults to Active'),
    }),
  },
);

export const updateInventoryMaster = tool(
  async ({ id, ...data }) => {
    const service = appInstance.get(InventoryMasterService);
    const result = await service.update(id, data);
    return JSON.stringify(result);
  },
  {
    name: 'update_inventory_master',
    description: 'Update properties of an existing item in the master catalog',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the item to update'),
      itemName: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }),
  },
);

export const deleteInventoryMaster = tool(
  async ({ id }) => {
    const service = appInstance.get(InventoryMasterService);
    const result = await service.softDelete(id);
    return JSON.stringify(result);
  },
  {
    name: 'delete_inventory_master',
    description: 'Soft delete (deactivate) an item in the master catalog',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the item to deactivate'),
    }),
  },
);

const STATIC_CATEGORIES = ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Diagnostic', 'Other'];

function normalizeCategory(category?: string): string | undefined {
  if (!category) return undefined;
  const lower = category.toLowerCase().trim();
  const matched = STATIC_CATEGORIES.find(
    (c) =>
      c.toLowerCase() === lower ||
      c.toLowerCase() + 's' === lower ||
      (c.toLowerCase().endsWith('s') && c.toLowerCase().slice(0, -1) === lower)
  );
  return matched || category;
}

export const listCentralInventory = tool(
  async ({ expiringSoon, pageSize, query, category }) => {
    const service = appInstance.get(CentralInventoryService);
    const result = await service.findAll({
      expiringSoon,
      pageSize,
      search: query,
      q: query,
      category: normalizeCategory(category),
    });
    return JSON.stringify(result);
  },
  {
    name: 'list_central_inventory',
    description: 'List all stock levels, batch numbers, and expiries in the Central Store (Head Office warehouse). Can optionally search by item name/code, filter by category, or find expiring items.',
    schema: z.object({
      query: z.string().optional().describe('Search query for item name or item code'),
      category: z.string().optional().describe('Category name e.g. Medicine, Equipment, Consumable, Surgical, Diagnostic, Other'),
      expiringSoon: z.boolean().optional().describe('Whether to only show items expiring soon'),
      pageSize: z.number().optional().describe('Page size limit for central inventory list'),
    }),
  },
);

export const getLowStockCentral = tool(
  async ({ threshold }) => {
    const service = appInstance.get(CentralInventoryService);
    const result = await service.findLowStock(threshold ?? 50);
    return JSON.stringify(result);
  },
  {
    name: 'get_low_stock_central',
    description: 'Get central inventory items whose available quantities are at or below a given threshold',
    schema: z.object({
      threshold: z.number().optional().describe('Stock threshold limit. Defaults to 50'),
    }),
  },
);

export const addCentralStock = tool(
  async (data) => {
    const service = appInstance.get(CentralInventoryService);
    const result = await service.addStock({ ...data, performedBy: data.performedBy ?? 'Agent' });
    return JSON.stringify(result);
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

export const listBranchStock = tool(
  async ({ branchId, query, category }) => {
    const service = appInstance.get(BranchInventoryService);

    // Resolve branchId/name if needed
    let resolvedBranchId = branchId;
    if (branchId && !branchId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const hospitalService = appInstance.get(HospitalsService);
        const res = (await hospitalService.getAllHospitals()) as any;
        const hospitals = Array.isArray(res) ? res : (res?.data ?? []);
        const matched = hospitals.find(
          (h: any) =>
            h.name.toLowerCase().includes(branchId.toLowerCase()) ||
            h.name.toLowerCase().replace(/[\s-_]+/g, '').includes(branchId.toLowerCase().replace(/[\s-_]+/g, ''))
        );
        if (matched) {
          resolvedBranchId = matched._id.toString();
        }
      } catch {}
    }

    const result = await service.findByBranch(resolvedBranchId, {
      search: query,
      q: query,
      category: normalizeCategory(category),
    });
    return JSON.stringify(result);
  },
  {
    name: 'list_branch_stock',
    description: 'List stock levels, batch numbers, and expiries at a specific branch hospital/PHC/CHC. Can optionally search by item name/code or filter by category.',
    schema: z.object({
      branchId: z.string().describe('Branch ID (e.g. h1, h2, h3) or name (e.g. PHC A) of the hospital'),
      query: z.string().optional().describe('Search query for item name or item code'),
      category: z.string().optional().describe('Category name e.g. Medicine, Equipment, Consumable, Surgical, Diagnostic, Other'),
    }),
  },
);

export const getItemAvailability = tool(
  async ({ itemId }) => {
    const service = appInstance.get(BranchInventoryService);
    const result = await service.findByItem(itemId);
    return JSON.stringify(result);
  },
  {
    name: 'get_item_availability',
    description: 'Check stock levels for a specific item across all hospital branches',
    schema: z.object({
      itemId: z.string().describe('MongoDB ObjectId of the item from the master catalog'),
    }),
  },
);

export const listInventoryRequests = tool(
  async ({ status, branchId }) => {
    const service = appInstance.get(InventoryRequestsService);

    // Resolve branchId/name if needed
    let resolvedBranchId = branchId;
    if (branchId && !branchId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const hospitalService = appInstance.get(HospitalsService);
        const res = (await hospitalService.getAllHospitals()) as any;
        const hospitals = Array.isArray(res) ? res : (res?.data ?? []);
        const matched = hospitals.find(
          (h: any) =>
            h.name.toLowerCase().includes(branchId.toLowerCase()) ||
            h.name.toLowerCase().replace(/[\s-_]+/g, '').includes(branchId.toLowerCase().replace(/[\s-_]+/g, ''))
        );
        if (matched) {
          resolvedBranchId = matched._id.toString();
        }
      } catch {}
    }

    const result = await service.findAll({ status, branchId: resolvedBranchId });
    return JSON.stringify(result);
  },
  {
    name: 'list_inventory_requests',
    description: 'List branch inventory transfer requests. Can filter by status (Pending, Approved, Rejected, Partial) or branchId/branchName.',
    schema: z.object({
      status: z.string().optional().describe('Status e.g. Pending, Approved, Rejected, Partial'),
      branchId: z.string().optional().describe('Branch ID (e.g. h1, h2) or name (e.g. PHC A)'),
    }),
  },
);

export const createInventoryRequest = tool(
  async (data) => {
    const service = appInstance.get(InventoryRequestsService);
    const result = await service.create(data);
    return JSON.stringify(result);
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

export const approveInventoryRequest = tool(
  async ({ id, approvedItems, remarks, performedBy }) => {
    const service = appInstance.get(InventoryRequestsService);
    const result = await service.approve(id, { approvedItems, remarks, performedBy: performedBy ?? 'Agent' });
    return JSON.stringify(result);
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

export const rejectInventoryRequest = tool(
  async ({ id, remarks }) => {
    const service = appInstance.get(InventoryRequestsService);
    const result = await service.reject(id, { remarks });
    return JSON.stringify(result);
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

export const listInventoryTransactions = tool(
  async ({ type, itemId, location, fromDate, toDate }) => {
    const service = appInstance.get(AuditLogsService);
    const result = await service.findAll({
      module: 'inventory',
      action: type,
      itemId,
      branchId: location,
      fromDate,
      toDate,
    });
    return JSON.stringify(result);
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
