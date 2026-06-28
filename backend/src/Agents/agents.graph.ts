import { StateGraph, START, END } from '@langchain/langgraph';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import { llmInstance } from '../google/vertex.config';
import { withGuardrails } from './prompts/guardrails.prompt';
import { InventoryState } from './states/inventory.state';
import { PatientState } from './states/patient.state';
import { appInstance } from '../main';
import { HospitalsService } from '../hospitals/hospitals.service';
import {
  listCentralInventory,
  getLowStockCentral,
  listBranchStock,
  createInventoryRequest,
  listInventoryRequests,
} from './tools/inventory.tools';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';
import { httpClient } from '../common/services/http.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string, init?: RequestInit) {
  const method = init?.method ?? 'GET';
  const headers = init?.headers as any;
  const data = init?.body ? JSON.parse(init.body as string) : undefined;
  
  const res = await httpClient.request({
    url: path,
    method,
    headers,
    data,
  });
  return res.data;
}

async function llmClassify(
  query: string,
  options: string[],
  systemInstruction: string,
): Promise<string> {
  const response = await llmInstance.invoke(
    [
      new SystemMessage(systemInstruction),
      new HumanMessage(query),
    ],
    {
      tags: ['classification'],
      metadata: { is_classification: true },
    },
  );
  console.log('response', response);
  const raw = (response.content as string)
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)[0];
  return options.includes(raw) ? raw : options[options.length - 1];
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY AGENT GRAPH
//
// Nodes:
//   classify_intent → routes to the appropriate pipeline
//   list_inventory  → fetches full central inventory catalog
//   check_stock     → finds low-stock and out-of-stock items at central
//   check_expiring  → finds items expiring within 90 days at central
//   raise_requests  → auto-creates branch transfer requests for stock/expiry issues
//   summarize       → LLM generates a concise spoken-word summary
//
// Edges:
//   list      : classify → list_inventory → summarize
//   check_stock : classify → check_stock → check_expiring → raise_requests → summarize
//   check_expiring: classify → check_stock → check_expiring → raise_requests → summarize
//   audit     : classify → check_stock → check_expiring → raise_requests → summarize
// ══════════════════════════════════════════════════════════════════════════════

// ── Node: classify query intent ───────────────────────────────────────────────
async function inventoryClassifyIntent(state: typeof InventoryState.State) {
  const intent = await llmClassify(
    state.query,
    ['list', 'check_stock', 'check_expiring', 'audit', 'requests'],
    `You are an inventory query classifier for a hospital management system.
Classify the doctor's request into exactly one of these options:
- list          → doctor wants to see/browse inventory items or current stock levels
- check_stock   → doctor wants to know what items are out of stock or critically low
- check_expiring → doctor wants to know which items are expiring soon or about to expire
- audit         → doctor wants a complete check covering stock levels, expiry, and auto-raised replenishment requests
- requests      → doctor wants to see transfer requests, pending requests, approved requests, request counts, or request details

Reply with ONE word only — one of: list, check_stock, check_expiring, audit, requests`,
  );
  console.log('intent', intent);
  return { intent };
}

export async function extractBranchId(query: string): Promise<string | undefined> {
  try {
    const service = appInstance.get(HospitalsService);
    const res = (await service.getAllHospitals()) as any;
    const branches = Array.isArray(res) ? res : (res?.data ?? []);
    const lowerQuery = query.toLowerCase();
    for (const branch of branches) {
      const name = branch.name.toLowerCase();
      const normalizedName = name.replace(/[\s-_]+/g, '');
      const normalizedQuery = lowerQuery.replace(/[\s-_]+/g, '');
      if (normalizedQuery.includes(normalizedName)) {
        return branch._id.toString();
      }
    }
  } catch {}
  return undefined;
}

const STATIC_CATEGORIES = ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Diagnostic', 'Other'];

export function extractCategory(query: string): string | undefined {
  const lower = query.toLowerCase();

  // Direct matches with static categories (singular/plural variations)
  for (const cat of STATIC_CATEGORIES) {
    const catLower = cat.toLowerCase();
    if (
      lower.includes(catLower) || 
      (catLower.endsWith('s') && lower.includes(catLower.slice(0, -1))) || 
      (!catLower.endsWith('s') && lower.includes(catLower + 's'))
    ) {
      return cat;
    }
  }

  return undefined;
}

export async function extractSearchQuery(query: string): Promise<string | undefined> {
  let clean = query.replace(/\b(in|at)\s+.*$/gi, ''); // remove branch specifiers first!
  try {
    const service = appInstance.get(HospitalsService);
    const res = (await service.getAllHospitals()) as any;
    const branches = Array.isArray(res) ? res : (res?.data ?? []);
    for (const branch of branches) {
      const nameRegex = new RegExp(`\\b${branch.name}\\b`, 'gi');
      clean = clean.replace(nameRegex, '');
    }
  } catch {}
  clean = clean.replace(/\b(show|list|how|many|do|we|have|is|are|left|stock|available|of|in|at|what|which|items|item|any|tablet|tablets|capsule|capsules|emergency|medicine|medicines|supplies|medical|consumables|equipment|surgical|syringes|quantity|quantities|availability)\b/gi, '');
  clean = clean.trim().replace(/[?.]/g, '').replace(/\s+/g, ' ');
  
  if (clean.length >= 2) {
    return clean;
  }
  return undefined;
}

// ── Node: list full inventory catalog ────────────────────────────────────────
async function inventoryListAll(state: typeof InventoryState.State) {
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let data: any[];
  if (branchId) {
    const raw = await listBranchStock.invoke({ branchId, query: searchQ, category });
    const parsed = JSON.parse(raw);
    data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  } else {
    const raw = await listCentralInventory.invoke({ pageSize: 100, query: searchQ, category });
    const parsed = JSON.parse(raw);
    data = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  }
  return { inventoryList: data };
}

// Helper to extract status from query (Pending, Approved, Rejected, Partial)
function extractRequestStatus(query: string): string | undefined {
  const lower = query.toLowerCase();
  if (lower.includes('pending')) return 'Pending';
  if (lower.includes('approved')) return 'Approved';
  if (lower.includes('rejected')) return 'Rejected';
  if (lower.includes('partial')) return 'Partial';
  return undefined;
}

// ── Node: list inventory requests ──────────────────────────────────────────
async function inventoryListRequests(state: typeof InventoryState.State) {
  const branchId = await extractBranchId(state.query);
  const status = extractRequestStatus(state.query);
  const raw = await listInventoryRequests.invoke({ status, branchId });
  const parsed = JSON.parse(raw);
  const requests = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
  return { serviceRequests: requests };
}

// ── Node: check stock levels (low + out-of-stock) ────────────────────────────
async function inventoryCheckStock(state: typeof InventoryState.State) {
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let allLow: any[] = [];
  if (branchId) {
    const raw = await listBranchStock.invoke({ branchId, query: searchQ, category });
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    allLow = items.filter((i: any) => i.availableQty <= 50);
  } else {
    const raw = await getLowStockCentral.invoke({ threshold: 50 });
    allLow = JSON.parse(raw);
    if (category || searchQ) {
      allLow = allLow.filter((i: any) => {
        const nameMatch = !searchQ || i.itemId?.itemName?.toLowerCase().includes(searchQ.toLowerCase());
        const catMatch = !category || i.itemId?.category === category;
        return nameMatch && catMatch;
      });
    }
  }
  const outOfStockItems = allLow.filter((i) => i.availableQty === 0);
  const lowStockItems = allLow.filter((i) => i.availableQty > 0);
  return { lowStockItems, outOfStockItems };
}

// ── Node: check expiring items (within 90 days) ───────────────────────────────
async function inventoryCheckExpiring(state: typeof InventoryState.State) {
  const branchId = await extractBranchId(state.query);
  const category = extractCategory(state.query);
  const searchQ = await extractSearchQuery(state.query);

  let items: any[] = [];
  if (branchId) {
    const raw = await listBranchStock.invoke({ branchId, query: searchQ, category });
    const parsed = JSON.parse(raw);
    const allItems = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    const now = Date.now();
    const cutoff = now + 90 * 86_400_000;
    items = allItems.filter((i: any) => i.expiryDate && new Date(i.expiryDate).getTime() <= cutoff);
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
  return { expiringItems };
}

// ── Node: auto-raise service requests for branches needing stock ──────────────
// For each branch hospital:
//   - Fetch branch's current stock levels
//   - Items that are low at branch and available at central → create transfer request
//   - Expiring items with central availability → push to branches before expiry
async function inventoryRaiseRequests(state: typeof InventoryState.State) {
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
function inventorySummarize(state: typeof InventoryState.State) {
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
        .map((i: any, n: number) => `**Item ${n + 1}:** ${i.itemId?.itemName ?? 'Item'} — Qty: ${i.requestedQty}`)
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
      const expiry = i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : 'N/A';
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
      .map((r: any) => `${r.branch ?? 'branch'} #${r.requestNumber ?? r._id ?? 'N/A'}`)
      .join(', ');
    cards.push(`### Transfer Requests Raised\n**Count:** ${state.serviceRequests.length}\n**Branches:** ${reqSummary}`);
  } else if (
    state.lowStockItems.length > 0 ||
    state.outOfStockItems.length > 0 ||
    state.expiringItems.length > 0
  ) {
    cards.push('No branch transfer requests raised — branches had sufficient stock.');
  }

  // ── Fallback if nothing to show ───────────────────────────────────────────
  if (cards.length === 0) {
    const finalResponse = 'No inventory data found for the given query.';
    return { finalResponse, messages: [new AIMessage(finalResponse)] };
  }

  const finalResponse = cards.join('\n\n');
  return { finalResponse, messages: [new AIMessage(finalResponse)] };
}

// ── Routing function ──────────────────────────────────────────────────────────
function routeInventory(state: typeof InventoryState.State): string {
  if (state.intent === 'requests') return 'list_requests';
  return state.intent === 'list' ? 'list_inventory' : 'check_stock';
}

export const inventoryAgentGraph = new StateGraph(InventoryState)
  .addNode('classify_intent', inventoryClassifyIntent)
  .addNode('list_inventory', inventoryListAll)
  .addNode('list_requests', inventoryListRequests)
  .addNode('check_stock', inventoryCheckStock)
  .addNode('check_expiring', inventoryCheckExpiring)
  .addNode('raise_requests', inventoryRaiseRequests)
  .addNode('summarize', inventorySummarize)
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routeInventory, {
    list_inventory: 'list_inventory',
    list_requests: 'list_requests',
    check_stock: 'check_stock',
  })
  .addEdge('list_inventory', 'summarize')
  .addEdge('list_requests', 'summarize')
  .addEdge('check_stock', 'check_expiring')
  .addEdge('check_expiring', 'raise_requests')
  .addEdge('raise_requests', 'summarize')
  .addEdge('summarize', END)
  .compile();

export async function runInventoryAgent(query: string): Promise<string> {
  const result = await inventoryAgentGraph.invoke({
    query,
    messages: [new HumanMessage(query)],
    intent: '',
    inventoryList: [],
    lowStockItems: [],
    outOfStockItems: [],
    expiringItems: [],
    serviceRequests: [],
    finalResponse: '',
  });
  return result.finalResponse || 'Inventory analysis complete.';
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT AGENT GRAPH
//
// Nodes:
//   classify_intent   → routes to the appropriate pipeline
//   fetch_patients    → fetches all active patients
//   filter_discharging → filters patients discharging within N days (sorted by date)
//   group_by_disease  → groups patients by condition/diagnosis
//   group_by_age      → groups patients into Pediatric / Adult / Senior / Geriatric
//   summarize         → LLM generates a concise spoken-word summary
//
// Edges:
//   discharge_dates : classify → fetch → filter_discharging → summarize
//   by_disease      : classify → fetch → group_by_disease → summarize
//   by_age          : classify → fetch → group_by_age → summarize
//   general         : classify → fetch → summarize
// ══════════════════════════════════════════════════════════════════════════════

const AGE_BUCKETS = [
  { group: 'Pediatric', ageRange: '0–17', min: 0, max: 17 },
  { group: 'Adult', ageRange: '18–59', min: 18, max: 59 },
  { group: 'Senior', ageRange: '60–79', min: 60, max: 79 },
  { group: 'Geriatric', ageRange: '80+', min: 80, max: Infinity },
];

// ── Node: classify patient query intent ──────────────────────────────────────
async function patientClassifyIntent(state: typeof PatientState.State) {
  const intent = await llmClassify(
    state.query,
    ['discharge_dates', 'by_disease', 'by_age', 'general'],
    `You are a patient query classifier for a hospital management system.
Classify the doctor's request into exactly one of these options:
- discharge_dates → doctor wants to know which patients are being discharged soon or upcoming discharges
- by_disease      → doctor wants patients grouped or categorised by disease, diagnosis, or medical condition
- by_age          → doctor wants patients grouped or categorised by age group (pediatric, adult, senior, geriatric)
- general         → any other patient query such as lookup, create, update, or list all

Reply with ONE option only — one of: discharge_dates, by_disease, by_age, general`,
  );

  // Extract explicit days from query, e.g. "next 3 days", "in 14 days"
  const daysMatch = state.query.match(/(\d+)\s*days?/i);
  const daysAhead = daysMatch ? Number(daysMatch[1]) : 7;

  return { intent, daysAhead };
}

// ── Node: fetch all active patients ──────────────────────────────────────────
async function patientFetchAll(state: typeof PatientState.State) {
  const raw = await apiFetch('/patients');
  const patients = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return { patients };
}

// ── Node: filter patients discharging within daysAhead ───────────────────────
async function patientFilterDischarging(state: typeof PatientState.State) {
  try {
    const raw = await apiFetch(
      `/patients/discharge-soon?days=${state.daysAhead}`,
    );
    const dischargingSoon = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return { dischargingSoon };
  } catch {
    // Fallback: compute from already-fetched patient list
    const now = Date.now();
    const cutoff = now + state.daysAhead * 86_400_000;
    const dischargingSoon = state.patients
      .filter((p) => {
        const d = p.expectedDischargeDate
          ? new Date(p.expectedDischargeDate).getTime()
          : null;
        return d !== null && d >= now && d <= cutoff;
      })
      .sort(
        (a, b) =>
          new Date(a.expectedDischargeDate).getTime() -
          new Date(b.expectedDischargeDate).getTime(),
      );
    return { dischargingSoon };
  }
}

// ── Node: group patients by medical condition/disease ─────────────────────────
async function patientGroupByDisease(state: typeof PatientState.State) {
  try {
    const raw = await apiFetch('/patients/by-condition');
    const byDisease = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return { byDisease };
  } catch {
    // Fallback: group from the fetched patient list
    const map = new Map<string, any[]>();
    for (const p of state.patients) {
      const key =
        (p.diagnosis || p.condition || 'Unspecified').trim() || 'Unspecified';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const byDisease = Array.from(map.entries())
      .map(([condition, pts]) => ({
        condition,
        count: pts.length,
        patients: pts,
      }))
      .sort((a, b) => b.count - a.count);
    return { byDisease };
  }
}

// ── Node: group patients into age brackets ────────────────────────────────────
async function patientGroupByAge(state: typeof PatientState.State) {
  const buckets = new Map<string, any[]>(AGE_BUCKETS.map((b) => [b.group, []]));

  for (const p of state.patients) {
    const age = Number(p.age);
    const bucket = AGE_BUCKETS.find((b) => age >= b.min && age <= b.max);
    if (bucket) buckets.get(bucket.group)!.push(p);
  }

  const byAge = AGE_BUCKETS.map((b) => ({
    group: b.group,
    ageRange: b.ageRange,
    count: buckets.get(b.group)!.length,
    patients: buckets.get(b.group)!.map((p) => ({
      name: p.name,
      age: p.age,
      condition: p.condition || p.diagnosis,
    })),
  }));

  return { byAge };
}

// ── Node: LLM generates final spoken summary ─────────────────────────────────
async function patientSummarize(state: typeof PatientState.State) {
  const parts: string[] = [`Query: "${state.query}"`];

  if (state.intent === 'discharge_dates') {
    if (state.dischargingSoon.length > 0) {
      const list = state.dischargingSoon.map((p: any) => {
        const d = p.expectedDischargeDate
          ? new Date(p.expectedDischargeDate).toLocaleDateString()
          : 'unknown date';
        const hospital =
          typeof p.hospitalId === 'object'
            ? (p.hospitalId?.name ?? 'unknown hospital')
            : 'unknown hospital';
        return `${p.name} (age ${p.age}, ${hospital}) — discharge ${d}`;
      });
      parts.push(
        `${state.dischargingSoon.length} patient(s) discharging within ${state.daysAhead} day(s): ${list.join('; ')}`,
      );
    } else {
      parts.push(
        `No patients expected to discharge within the next ${state.daysAhead} day(s).`,
      );
    }
  }

  if (state.byDisease.length > 0) {
    const totalCategorised = state.byDisease.reduce((s, g) => s + g.count, 0);
    const top = state.byDisease
      .slice(0, 6)
      .map((g) => `${g.condition}: ${g.count}`)
      .join(', ');
    parts.push(`Disease categories (${totalCategorised} patients): ${top}`);
  }

  if (state.byAge.length > 0) {
    const breakdown = state.byAge
      .map((g) => `${g.group} (${g.ageRange}): ${g.count}`)
      .join(', ');
    parts.push(`Age group breakdown — ${breakdown}`);
    const largest = [...state.byAge].sort((a, b) => b.count - a.count)[0];
    if (largest)
      parts.push(
        `Largest group: ${largest.group} with ${largest.count} patient(s)`,
      );
  }

  if (
    state.intent === 'general' &&
    state.patients.length > 0 &&
    !state.byDisease.length &&
    !state.byAge.length &&
    !state.dischargingSoon.length
  ) {
    parts.push(`Total active patients: ${state.patients.length}`);
  }

  const systemPrompt = withGuardrails(
    `You are a patient records assistant. Using the analysis data below, give the doctor a concise spoken summary. Lead with the key finding. Data: ${parts.join('. ')}`,
  );

  const response = await llmInstance.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(state.query),
  ]);

  const finalResponse = response.content as string;
  return { finalResponse, messages: [new AIMessage(finalResponse)] };
}

// ── Routing from fetch_patients → correct analysis node ──────────────────────
function routePatientAfterFetch(state: typeof PatientState.State): string {
  switch (state.intent) {
    case 'discharge_dates':
      return 'filter_discharging';
    case 'by_disease':
      return 'group_by_disease';
    case 'by_age':
      return 'group_by_age';
    default:
      return 'summarize';
  }
}

export const patientAgentGraph = new StateGraph(PatientState)
  .addNode('classify_intent', patientClassifyIntent)
  .addNode('fetch_patients', patientFetchAll)
  .addNode('filter_discharging', patientFilterDischarging)
  .addNode('group_by_disease', patientGroupByDisease)
  .addNode('group_by_age', patientGroupByAge)
  .addNode('summarize', patientSummarize)
  .addEdge(START, 'classify_intent')
  .addEdge('classify_intent', 'fetch_patients')
  .addConditionalEdges('fetch_patients', routePatientAfterFetch, {
    filter_discharging: 'filter_discharging',
    group_by_disease: 'group_by_disease',
    group_by_age: 'group_by_age',
    summarize: 'summarize',
  })
  .addEdge('filter_discharging', 'summarize')
  .addEdge('group_by_disease', 'summarize')
  .addEdge('group_by_age', 'summarize')
  .addEdge('summarize', END)
  .compile();

export async function runPatientAgent(query: string): Promise<string> {
  const result = await patientAgentGraph.invoke({
    query,
    messages: [new HumanMessage(query)],
    intent: '',
    daysAhead: 7,
    patients: [],
    dischargingSoon: [],
    byDisease: [],
    byAge: [],
    finalResponse: '',
  });
  return result.finalResponse || 'Patient analysis complete.';
}
