import {
  StateGraph,
  START,
  END,
  Annotation,
  messagesStateReducer,
} from '@langchain/langgraph';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { llmInstance } from '../google/vertex.config';
import { withGuardrails } from './prompts/guardrails.prompt';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

async function llmClassify(
  query: string,
  options: string[],
  systemInstruction: string,
): Promise<string> {
  const response = await llmInstance.invoke([
    new SystemMessage(systemInstruction),
    new HumanMessage(query),
  ]);
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

const InventoryState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  inventoryList: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  lowStockItems: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  outOfStockItems: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  expiringItems: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  serviceRequests: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});

// ── Node: classify query intent ───────────────────────────────────────────────
async function inventoryClassifyIntent(state: typeof InventoryState.State) {
  const intent = await llmClassify(
    state.query,
    ['list', 'check_stock', 'check_expiring', 'audit'],
    `You are an inventory query classifier for a hospital management system.
Classify the doctor's request into exactly one of these options:
- list          → doctor wants to see/browse inventory items or current stock levels
- check_stock   → doctor wants to know what items are out of stock or critically low
- check_expiring → doctor wants to know which items are expiring soon or about to expire
- audit         → doctor wants a complete check covering stock levels, expiry, and auto-raised replenishment requests

Reply with ONE word only — one of: list, check_stock, check_expiring, audit`,
  );
  console.log('intent', intent);
  return { intent };
}

// ── Node: list full inventory catalog ────────────────────────────────────────
async function inventoryListAll(state: typeof InventoryState.State) {
  const data = await apiFetch('/central-inventory?pageSize=100');
  return { inventoryList: data.data ?? [] };
}

// ── Node: check stock levels (low + out-of-stock) ────────────────────────────
async function inventoryCheckStock(state: typeof InventoryState.State) {
  const allLowRaw = await apiFetch('/central-inventory/low-stock?threshold=50');
  const allLow: any[] = Array.isArray(allLowRaw) ? allLowRaw : [];
  const outOfStockItems = allLow.filter((i) => i.availableQty === 0);
  const lowStockItems = allLow.filter((i) => i.availableQty > 0);
  return { lowStockItems, outOfStockItems };
}

// ── Node: check expiring items (within 90 days) ───────────────────────────────
async function inventoryCheckExpiring(state: typeof InventoryState.State) {
  const data = await apiFetch(
    '/central-inventory?expiringSoon=true&pageSize=100',
  );
  const items: any[] = data.data ?? [];
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
    const res = await apiFetch('/hospitals?pageSize=20');
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
      const raw = await apiFetch(`/branch-inventory/branch/${branchId}`);
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
      const result = await apiFetch('/inventory-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          requestedBy: 'Inventory Agent',
          items: requestItems,
          remarks:
            'Auto-raised by inventory monitoring agent based on stock level and expiry analysis.',
        }),
      });
      serviceRequests.push({ branch: branch.name ?? branchId, ...result });
    } catch {
      // Skip branches where request creation fails
    }
  }

  return { serviceRequests };
}

// ── Node: LLM generates final spoken summary ─────────────────────────────────
async function inventorySummarize(state: typeof InventoryState.State) {
  const parts: string[] = [`Query: "${state.query}"`];

  if (state.inventoryList.length > 0) {
    const sample = state.inventoryList
      .slice(0, 8)
      .map(
        (i: any) => `${i.itemId?.itemName ?? 'Unknown'} qty:${i.availableQty}`,
      )
      .join(', ');
    parts.push(
      `Catalog total: ${state.inventoryList.length} items. Sample: ${sample}`,
    );
  }

  if (state.outOfStockItems.length > 0) {
    parts.push(
      `Out of stock (qty=0): ${state.outOfStockItems.map((i: any) => i.itemId?.itemName ?? 'Unknown').join(', ')}`,
    );
  }

  if (state.lowStockItems.length > 0) {
    parts.push(
      `Low stock (≤50): ${state.lowStockItems.map((i: any) => `${i.itemId?.itemName ?? 'Unknown'} (${i.availableQty})`).join(', ')}`,
    );
  }

  if (state.expiringItems.length > 0) {
    parts.push(
      `Expiring within 90 days: ${state.expiringItems.map((i: any) => `${i.itemId?.itemName ?? 'Unknown'} in ${i.daysUntilExpiry}d (batch ${i.batchNo ?? 'N/A'})`).join(', ')}`,
    );
  }

  if (state.serviceRequests.length > 0) {
    parts.push(
      `Service requests raised for ${state.serviceRequests.length} branch(es): ${state.serviceRequests.map((r: any) => `${r.branch ?? 'branch'} #${r.requestNumber ?? r._id ?? 'N/A'}`).join(', ')}`,
    );
  } else if (
    state.lowStockItems.length > 0 ||
    state.outOfStockItems.length > 0 ||
    state.expiringItems.length > 0
  ) {
    parts.push(
      'No branch transfer requests raised — branches had sufficient stock.',
    );
  }

  const systemPrompt = withGuardrails(
    `You are a healthcare inventory assistant. Using the data provided, give the doctor a brief spoken summary. Lead with the most urgent finding. Data: ${parts.join('. ')}`,
  );

  const response = await llmInstance.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(state.query),
  ]);

  const finalResponse = response.content as string;
  return { finalResponse, messages: [new AIMessage(finalResponse)] };
}

// ── Routing function ──────────────────────────────────────────────────────────
function routeInventory(state: typeof InventoryState.State): string {
  // "list" goes straight to list node; everything else runs the full audit pipeline
  return state.intent === 'list' ? 'list_inventory' : 'check_stock';
}

export const inventoryAgentGraph = new StateGraph(InventoryState)
  .addNode('classify_intent', inventoryClassifyIntent)
  .addNode('list_inventory', inventoryListAll)
  .addNode('check_stock', inventoryCheckStock)
  .addNode('check_expiring', inventoryCheckExpiring)
  .addNode('raise_requests', inventoryRaiseRequests)
  .addNode('summarize', inventorySummarize)
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routeInventory, {
    list_inventory: 'list_inventory',
    check_stock: 'check_stock',
  })
  .addEdge('list_inventory', 'summarize')
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

const PatientState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  daysAhead: Annotation<number>({ reducer: (_, b) => b, default: () => 7 }),
  patients: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  dischargingSoon: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  byDisease: Annotation<
    { condition: string; count: number; patients: any[] }[]
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  byAge: Annotation<
    { group: string; ageRange: string; count: number; patients: any[] }[]
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});

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
