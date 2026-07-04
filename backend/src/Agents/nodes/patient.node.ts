import { createAgent } from 'langchain';
import { AIMessage } from '@langchain/core/messages';
import { llmInstance } from '../../google/vertex.config';
import { patientDischargeTools } from '../tools/patient-discharge.tools';
import {
  PATIENT_GENERAL_PROMPT,
  PATIENT_FIND_PROMPT,
  PATIENT_DISCHARGE_PROMPT,
  PATIENT_DISCHARGED_PROMPT,
  PATIENT_DISEASE_PROMPT,
  PATIENT_AGE_PROMPT,
} from '../prompts/patient.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { runPatientAgent } from '../graphs/patient.graph';
import { llmClassify, extractBranchId } from './helper.node';
import { PatientState } from '../states/patient.state';
import { listPatients, searchPatientsByName } from '../tools/patient.tools';

const AGE_BUCKETS = [
  { group: 'Pediatric', ageRange: '0–17', min: 0, max: 17 },
  { group: 'Adult', ageRange: '18–59', min: 18, max: 59 },
  { group: 'Senior', ageRange: '60–79', min: 60, max: 79 },
  { group: 'Geriatric', ageRange: '80+', min: 80, max: Infinity },
];

async function generatePatientResponse(
  messages: any[],
  data: any,
  promptTemplate: string,
) {
  const dataPrompt = promptTemplate.replace(
    '{patientData}',
    JSON.stringify(data),
  );
  const agent = createAgent({
    model: llmInstance,
    tools: [],
    systemPrompt: withGuardrails(dataPrompt),
  });
  const llmResponse = await agent.invoke({ messages });
  return llmResponse.messages[llmResponse.messages.length - 1]
    .content as string;
}

// Used by voice-agent.ts graph — runs the full multi-step patientAgentGraph
export async function patientNode(state: typeof AgentState.State) {
  const firstMessage = state.messages[0];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'List patients';

  const response = await runPatientAgent(query);
  return { messages: [new AIMessage(response)] };
}

// ── Node: classify patient query intent ──────────────────────────────────────
export async function patientClassifyIntent(state: typeof PatientState.State) {
  const intent = await llmClassify(
    state.query,
    [
      'find_by_name',
      'discharge_dates',
      'discharged_patients',
      'by_disease',
      'by_age',
      'general',
    ],
    `You are a patient query classifier for a hospital management system. This entire agent flow depends on this routing node.
        ## Classify the doctor's request into exactly one from the below available options:
          - find_by_name → doctor wants to find/look up a specific patient by name and see their details
          - discharge_dates → doctor wants to know which patients are being discharged soon or upcoming discharges
          - discharged_patients → doctor wants to see patients who were ALREADY discharged (today, yesterday, on a specific date, or during a time window like morning/afternoon/evening or at a specific time like 10:30 AM)
          - by_disease → doctor wants patients grouped or categorised by disease, diagnosis, or medical condition
          - by_age → doctor wants patients grouped or categorised by age group (pediatric, adult, senior, geriatric)
          - general → any other patient query such as create, update, or list all active patients

        Reply with ONE option only — one of these following options: find_by_name, discharge_dates, discharged_patients, by_disease, by_age, general
`,
  );

  // Extract explicit days from query, e.g. "next 3 days", "in 14 days"
  const daysMatch = state.query.match(/(\d+)\s*days?/i);
  const daysAhead = daysMatch ? Number(daysMatch[1]) : 7;

  console.log('Intent for query "' + state.query + '" : ' + intent);
  return { intent, daysAhead };
}

// ── Node: filter patients discharging within daysAhead ───────────────────────
export async function patientFilterDischarging(
  state: typeof PatientState.State,
) {
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

  const finalResponse = await generatePatientResponse(
    state.messages,
    { dischargingSoon, intent: state.intent, daysAhead: state.daysAhead },
    PATIENT_DISCHARGE_PROMPT,
  );
  return { dischargingSoon, finalResponse };
}

// ── Node: list already-discharged patients (today / yesterday / date / time) ─
export const patientDischargedAgent = createAgent({
  model: llmInstance,
  tools: patientDischargeTools,
  systemPrompt: withGuardrails(PATIENT_DISCHARGED_PROMPT),
});

export async function patientFilterDischarged(
  state: typeof PatientState.State,
) {
  const llmResponse = await patientDischargedAgent.invoke({
    messages: state.messages,
  });
  const finalMessage = llmResponse.messages[llmResponse.messages.length - 1];
  const finalResponse =
    typeof finalMessage.content === 'string'
      ? finalMessage.content
      : JSON.stringify(finalMessage.content);

  return { finalResponse };
}

// ── Node: group patients by medical condition/disease ─────────────────────────
export async function patientGroupByDisease(state: typeof PatientState.State) {
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

  const finalResponse = await generatePatientResponse(
    state.messages,
    { byDisease, intent: state.intent },
    PATIENT_DISEASE_PROMPT,
  );
  return { byDisease, finalResponse };
}

// ── Node: group patients into age brackets ────────────────────────────────────
export async function patientGroupByAge(state: typeof PatientState.State) {
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

  const finalResponse = await generatePatientResponse(
    state.messages,
    { byAge, intent: state.intent },
    PATIENT_AGE_PROMPT,
  );
  return { byAge, finalResponse };
}

// ── Node: handle general patient listing ──────────────────────────────────────
export async function patientGeneralList(state: typeof PatientState.State) {
  const finalResponse = await generatePatientResponse(
    state.messages,
    { patients: state.patients, intent: state.intent },
    PATIENT_GENERAL_PROMPT,
  );
  return { finalResponse };
}

// ── Routing from classify_intent → fetch_patients, find_by_name, or filter_discharged
export function routePatientAfterClassify(
  state: typeof PatientState.State,
): string {
  if (state.intent === 'find_by_name') return 'find_by_name';
  if (state.intent === 'discharged_patients') return 'filter_discharged';
  return 'fetch_patients';
}

// ── Routing from fetch_patients → correct analysis node ──────────────────────
export function routePatientAfterFetch(
  state: typeof PatientState.State,
): string {
  switch (state.intent) {
    case 'discharge_dates':
      return 'filter_discharging';
    case 'by_disease':
      return 'group_by_disease';
    case 'by_age':
      return 'group_by_age';
    default:
      return 'general_list';
  }
}

// ── Node: fetch all active patients ──────────────────────────────────────────
export async function patientFetchAll(state: typeof PatientState.State) {
  const hospitalId = await extractBranchId(state.query);
  const raw = await listPatients.invoke({ hospitalId });
  const result = JSON.parse(raw);
  const patients = Array.isArray(result) ? result : (result?.data ?? []);
  return { patients };
}

function extractPatientName(query: string): string | undefined {
  const named = query.match(
    /(?:patient|named?|called)\s+([a-zA-Z][a-zA-Z\s]{1,40})/i,
  );
  if (named) return named[1].trim();

  const clean = query
    .replace(
      /\b(find|search|get|show|list|lookup|details|detail|of|for|about|patient|information|please|the|a|an|is|are)\b/gi,
      '',
    )
    .replace(/[?.]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return clean.length >= 2 ? clean : undefined;
}

// ── Node: find a patient by name ──────────────────────────────────────────────
export async function patientFindByName(state: typeof PatientState.State) {
  const name = extractPatientName(state.query);
  if (!name) {
    const finalResponse = await generatePatientResponse(
      state.messages,
      { patients: [], intent: state.intent },
      PATIENT_FIND_PROMPT,
    );
    return { patients: [], finalResponse };
  }

  const raw = await searchPatientsByName.invoke({ name, limit: 5 });
  const result = JSON.parse(raw);
  const patients = Array.isArray(result) ? result : (result?.data ?? []);

  const finalResponse = await generatePatientResponse(
    state.messages,
    { patients, intent: state.intent },
    PATIENT_FIND_PROMPT,
  );
  return { patients, finalResponse };
}
