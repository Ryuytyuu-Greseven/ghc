import { createAgent } from 'langchain';
import { AIMessage } from '@langchain/core/messages';
import { llmInstance } from '../../google/vertex.config';
import { inventoryTools } from '../tools/inventory.tools';
import { inventoryAnalyticsTools } from '../tools/inventory-analytics.tools';
import { INVENTORY_PROMPT } from '../prompts/inventory.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { runInventoryAgent } from '../graphs/inventory.graph';
import { InventoryState } from '../states/inventory.state';

import {
  listCentralInventory,
  getLowStockCentral,
  listBranchStock,
  createInventoryRequest,
  listInventoryRequests,
} from '../tools/inventory.tools';
import {
  extractBranchId,
  extractCategory,
  extractRequestStatus,
  extractSearchQuery,
  llmClassify,
} from './helper.node';
import { appInstance } from '../../main';
import { HospitalsService } from '../../hospitals/hospitals.service';

// Used by voice-agent.ts graph — runs the full multi-step inventoryAgentGraph
export async function inventoryNode(state: typeof AgentState.State) {
  console.log('Inventory Node State', state);
  const firstMessage = state.messages[state.messages.length - 1];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'Check inventory status';

  console.log('Inventory Node Query', query);
  const response = await runInventoryAgent(query);
  console.log('Inventory Node Response', response);
  return { messages: [new AIMessage(response)] };
}

// ── Node: classify query intent ───────────────────────────────────────────────
export async function inventoryClassifyIntent(
  state: typeof InventoryState.State,
) {
  const intent = await llmClassify(
    state.query,
    [
      'list_inventory',
      'check_stock',
      'check_expiring',
      'audit',
      'list_requests',
      'raise_requests',
    ],
    `You are an inventory query classifier for a hospital management system. This entire agent flow depends on this routing node.
      ## Classify the doctor's request into exactly one from the below available options:
        - list_inventory   → doctor wants to list/see/browse inventory items or current stock levels or individual stock details of an item.
        - check_stock   → doctor wants to know what items are out of stock or critically low.
        - check_expiring → doctor wants to know which items are expiring soon or about to expire
        - audit   → doctor wants a complete check covering stock levels, expiry, and auto-raised replenishment requests
        - list_requests   → doctor wants to see transfer requests, pending requests, approved requests, request counts, or request details
        - raise_requests   → doctor wants to raise a service request from a branch to main department fro refilling the stock of inventory items.
      Reply with ONE word only — one of: list_inventory, check_stock, check_expiring, audit, list_requests, raise_requests.
`,
  );
  console.log('intent', intent);
  state.intent = intent;
  return { intent };
}

export async function inventoryListAll(state: typeof InventoryState.State) {
  console.log('ENtered the node:', inventoryListAll);
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let data: any[];
  if (branchId) {
    console.log('Hey, We are in branchId', branchId);
    const raw = await listBranchStock.invoke({
      branchId,
      query: searchQ,
      category,
    });
    const parsed = JSON.parse(raw);
    data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  } else {
    console.log('Hey, We are in else of branchId', branchId);
    const raw = await listCentralInventory.invoke({
      pageSize: 100,
      query: searchQ,
      category,
    });
    const parsed = JSON.parse(raw);
    data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  }

  const dataPrompt = INVENTORY_PROMPT.replace(
    '{inventoryData}',
    JSON.stringify(data),
  );
  const agent = createAgent({
    model: llmInstance,
    tools: [],
    systemPrompt: withGuardrails(dataPrompt),
  });

  const llmResponse = await agent.invoke({
    messages: state.messages,
  });

  const response =
    llmResponse.messages[llmResponse.messages.length - 1].content;
  console.log('LLM Response', response);
  return { inventoryList: data, searchQuery: searchQ, nodeResponse: response };
}

// ── Node: list inventory requests ──────────────────────────────────────────
export async function inventoryListRequests(
  state: typeof InventoryState.State,
) {
  const branchId = await extractBranchId(state.query);
  const status = extractRequestStatus(state.query);
  const raw = await listInventoryRequests.invoke({ status, branchId });
  const parsed = JSON.parse(raw);
  const requests = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  return { serviceRequests: requests };
}

// ── Node: check stock levels (low + out-of-stock) ────────────────────────────
export async function inventoryCheckStock(state: typeof InventoryState.State) {
  console.log('Landed in check stock');
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let allLow: any[] = [];
  if (branchId) {
    const raw = await listBranchStock.invoke({
      branchId,
      query: searchQ,
      category,
    });
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    allLow = items.filter((i: any) => i.availableQty <= 50);
  } else {
    const raw = await getLowStockCentral.invoke({ threshold: 50 });
    allLow = JSON.parse(raw);
    if (category || searchQ) {
      allLow = allLow.filter((i: any) => {
        const nameMatch =
          !searchQ ||
          i.itemId?.itemName?.toLowerCase().includes(searchQ.toLowerCase());
        const catMatch = !category || i.itemId?.category === category;
        return nameMatch && catMatch;
      });
    }
  }
  const outOfStockItems = allLow.filter((i) => i.availableQty === 0);
  const lowStockItems = allLow.filter((i) => i.availableQty > 0);
  return { lowStockItems, outOfStockItems, searchQuery: searchQ };
}

// ── Node: check expiring items (within 90 days) ───────────────────────────────
export async function inventoryCheckExpiring(
  state: typeof InventoryState.State,
) {
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let items: any[] = [];
  if (branchId) {
    const raw = await listBranchStock.invoke({
      branchId,
      query: searchQ,
      category,
    });
    const parsed = JSON.parse(raw);
    const allItems = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    const now = Date.now();
    const cutoff = now + 90 * 86_400_000;
    items = allItems.filter(
      (i: any) => i.expiryDate && new Date(i.expiryDate).getTime() <= cutoff,
    );
  } else {
    const raw = await listCentralInventory.invoke({
      expiringSoon: true,
      pageSize: 100,
      query: searchQ,
      category,
    });
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  }
  const now = Date.now();
  const expiringItems = items.map((item) => ({
    ...item,
    daysUntilExpiry: item.expiryDate
      ? Math.ceil((new Date(item.expiryDate).getTime() - now) / 86_400_000)
      : null,
  }));
  return { expiringItems, searchQuery: searchQ };
}

// ── Node: auto-raise service requests for branches needing stock ──────────────
// For each branch hospital:
//   - Fetch branch's current stock levels
//   - Items that are low at branch and available at central → create transfer request
//   - Expiring items with central availability → push to branches before expiry
export async function inventoryRaiseRequests(
  state: typeof InventoryState.State,
) {
  const hasIssues =
    state.outOfStockItems.length > 0 ||
    state.lowStockItems.length > 0 ||
    state.expiringItems.length > 0;

  if (!hasIssues) return { serviceRequests: [] };

  let branches: any[] = [];
  try {
    const service = appInstance.get(HospitalsService);
    const res = (await service.getAllHospitals({ pageSize: 20 })) as any;
    branches = res.data ?? res ?? [];
  } catch {
    return { serviceRequests: [] };
  }

  const serviceRequests: any[] = [];

  for (const branch of branches) {
    const branchId = (branch._id ?? branch.id)?.toString();
    if (!branchId) continue;

    let branchStock: any[] = [];
    try {
      const rawStr = await listBranchStock.invoke({ branchId });
      const raw = JSON.parse(rawStr);
      branchStock = Array.isArray(raw) ? raw : (raw?.data ?? []);
    } catch {
      continue;
    }

    // Map itemId → qty for O(1) lookup
    const branchQtyMap = new Map<string, number>(
      branchStock.map((s: any) => [
        (s.itemId?._id ?? s.itemId)?.toString(),
        s.availableQty ?? 0,
      ]),
    );

    const requestItems: { itemId: string; requestedQty: number }[] = [];
    const addedIds = new Set<string>();

    // Items that are low at central but branch could be replenished now
    for (const issue of [...state.lowStockItems, ...state.outOfStockItems]) {
      const itemId = (issue.itemId?._id ?? issue.itemId)?.toString();
      if (!itemId || addedIds.has(itemId)) continue;
      const branchQty = branchQtyMap.get(itemId) ?? 0;
      // Only request if branch is also running low and central has supply
      if (branchQty < 20 && issue.availableQty > 0) {
        requestItems.push({
          itemId,
          requestedQty: Math.max(30 - branchQty, 10),
        });
        addedIds.add(itemId);
      }
    }

    // Expiring items: push to branches before they expire (use it or lose it)
    for (const issue of state.expiringItems) {
      const itemId = (issue.itemId?._id ?? issue.itemId)?.toString();
      if (!itemId || addedIds.has(itemId)) continue;
      const branchQty = branchQtyMap.get(itemId) ?? 0;
      if (branchQty < 15 && issue.availableQty > 0) {
        requestItems.push({
          itemId,
          requestedQty: Math.max(20 - branchQty, 5),
        });
        addedIds.add(itemId);
      }
    }

    if (requestItems.length === 0) continue;

    try {
      const resultStr = await createInventoryRequest.invoke({
        branchId,
        requestedBy: 'Inventory Agent',
        items: requestItems,
        remarks:
          'Auto-raised by inventory monitoring agent based on stock level and expiry analysis.',
      });
      const result = JSON.parse(resultStr);
      serviceRequests.push({ branch: branch.name ?? branchId, ...result });
    } catch {
      // Skip branches where request creation fails
    }
  }

  return { serviceRequests };
}

// ── Node: Format inventory data into structured markdown cards (no LLM call) ──
export function inventorySummarize(state: typeof InventoryState.State) {
  const cards: string[] = [];

  // ── Transfer Requests ─────────────────────────────────────────────────────
  if (state.intent === 'requests') {
    if (state.serviceRequests.length === 0) {
      const finalResponse = 'No transfer requests found.';
      return { finalResponse, messages: [new AIMessage(finalResponse)] };
    }
    state.serviceRequests.slice(0, 10).forEach((r: any, idx: number) => {
      const branchName = r.branchId?.name || r.branchId || 'Unknown Branch';
      const itemLines = (r.items ?? [])
        .map(
          (i: any, n: number) =>
            `**Item ${n + 1}:** ${i.itemId?.itemName ?? 'Item'} — Qty: ${i.requestedQty}`,
        )
        .join('\n');
      cards.push(
        `### Request - ${idx + 1}\n` +
          `**Branch:** ${branchName}\n` +
          `**Status:** ${r.status || 'N/A'}\n` +
          `**Requested By:** ${r.requestedBy || 'N/A'}\n` +
          (itemLines ? `${itemLines}\n` : '') +
          `**Remarks:** ${r.remarks || 'N/A'}`,
      );
    });
    const finalResponse = cards.join('\n\n');
    return { finalResponse, messages: [new AIMessage(finalResponse)] };
  }

  // ── Inventory List ────────────────────────────────────────────────────────
  if (state.inventoryList.length > 0) {
    state.inventoryList.slice(0, 15).forEach((i: any, index: number) => {
      const name = i.itemId?.itemName || i.itemName || 'Unknown Item';
      const category = i.itemId?.category || i.category || 'N/A';
      const qty = i.availableQty ?? 0;
      const batch = i.batchNo || 'N/A';
      const expiry = i.expiryDate
        ? new Date(i.expiryDate).toLocaleDateString()
        : 'N/A';
      cards.push(
        `### Inventory Item - ${index + 1}\n` +
          `**Name:** ${name}\n` +
          `**Category:** ${category}\n` +
          `**Available Qty:** ${qty}\n` +
          `**Batch No:** ${batch}\n` +
          `**Expiry Date:** ${expiry}`,
      );
    });
  }

  // ── Out-of-Stock Items ────────────────────────────────────────────────────
  if (state.outOfStockItems.length > 0) {
    cards.push('### Out of Stock Summary');
    state.outOfStockItems.forEach((i: any, index: number) => {
      cards.push(
        `### Out of Stock Item - ${index + 1}\n` +
          `**Name:** ${i.itemId?.itemName || 'Unknown'}\n` +
          `**Category:** ${i.itemId?.category || 'N/A'}\n` +
          `**Available Qty:** 0`,
      );
    });
  }

  // ── Low-Stock Items ───────────────────────────────────────────────────────
  if (state.lowStockItems.length > 0) {
    state.lowStockItems.forEach((i: any, index: number) => {
      cards.push(
        `### Low Stock Item - ${index + 1}\n` +
          `**Name:** ${i.itemId?.itemName || 'Unknown'}\n` +
          `**Available Qty:** ${i.availableQty}`,
      );
    });
  }

  // ── Expiring Items ────────────────────────────────────────────────────────
  if (state.expiringItems.length > 0) {
    state.expiringItems.forEach((i: any, index: number) => {
      cards.push(
        `### Expiring Item - ${index + 1}\n` +
          `**Name:** ${i.itemId?.itemName || 'Unknown'}\n` +
          `**Expiry Date:** ${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : 'N/A'}\n` +
          `**Days Until Expiry:** ${i.daysUntilExpiry}`,
      );
    });
  }

  // ── Service Requests Footer ───────────────────────────────────────────────
  if (state.serviceRequests.length > 0) {
    const reqSummary = state.serviceRequests
      .map(
        (r: any) =>
          `${r.branch ?? 'branch'} #${r.requestNumber ?? r._id ?? 'N/A'}`,
      )
      .join(', ');
    cards.push(
      `### Transfer Requests Raised\n**Count:** ${state.serviceRequests.length}\n**Branches:** ${reqSummary}`,
    );
  } else if (
    state.lowStockItems.length > 0 ||
    state.outOfStockItems.length > 0 ||
    state.expiringItems.length > 0
  ) {
    cards.push(
      'No branch transfer requests raised — branches had sufficient stock.',
    );
  }

  // ── Fallback if nothing to show ───────────────────────────────────────────
  if (cards.length === 0) {
    const finalResponse = state.searchQuery
      ? `Item "${state.searchQuery}" is not available in the inventory.`
      : 'No inventory data found for the given query.';
    return { finalResponse, messages: [new AIMessage(finalResponse)] };
  }

  const finalResponse = cards.join('\n\n');
  return { finalResponse, messages: [new AIMessage(finalResponse)] };
}

// ── Routing function ──────────────────────────────────────────────────────────
export function routeInventory(state: typeof InventoryState.State): string {
  console.log('Started and landed router node', state.intent);
  // if (state.intent === 'requests') return 'list_requests';
  return state.intent;
}
