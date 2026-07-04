import { createAgent } from 'langchain';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { llmInstance } from '../../google/vertex.config';
import { patientTools } from '../tools/patient.tools';
import { PATIENT_PROMPT } from '../prompts/patient.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { runPatientAgent } from '../graphs/patient.graph';
import { llmClassify } from './helper.node';
import { PatientState } from '../states/patient.state';

const AGE_BUCKETS = [
  { group: 'Pediatric', ageRange: '0–17', min: 0, max: 17 },
  { group: 'Adult', ageRange: '18–59', min: 18, max: 59 },
  { group: 'Senior', ageRange: '60–79', min: 60, max: 79 },
  { group: 'Geriatric', ageRange: '80+', min: 80, max: Infinity },
];

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

// ── Node: filter patients discharging within daysAhead ───────────────────────
export async function patientFilterDischarging(
  state: typeof PatientState.State,
) {
  // try {
  //   const raw = await apiFetch(
  //     `/patients/discharge-soon?days=${state.daysAhead}`,
  //   );
  //   const dischargingSoon = Array.isArray(raw) ? raw : (raw?.data ?? []);
  //   return { dischargingSoon };
  // } catch {
  //   // Fallback: compute from already-fetched patient list
  //   const now = Date.now();
  //   const cutoff = now + state.daysAhead * 86_400_000;
  //   const dischargingSoon = state.patients
  //     .filter((p) => {
  //       const d = p.expectedDischargeDate
  //         ? new Date(p.expectedDischargeDate).getTime()
  //         : null;
  //       return d !== null && d >= now && d <= cutoff;
  //     })
  //     .sort(
  //       (a, b) =>
  //         new Date(a.expectedDischargeDate).getTime() -
  //         new Date(b.expectedDischargeDate).getTime(),
  //     );
  //   return { dischargingSoon };
  // }
}

// ── Node: group patients by medical condition/disease ─────────────────────────
export async function patientGroupByDisease(state: typeof PatientState.State) {
  // try {
  //   const raw = await apiFetch('/patients/by-condition');
  //   const byDisease = Array.isArray(raw) ? raw : (raw?.data ?? []);
  //   return { byDisease };
  // } catch {
  //   // Fallback: group from the fetched patient list
  //   const map = new Map<string, any[]>();
  //   for (const p of state.patients) {
  //     const key =
  //       (p.diagnosis || p.condition || 'Unspecified').trim() || 'Unspecified';
  //     if (!map.has(key)) map.set(key, []);
  //     map.get(key)!.push(p);
  //   }
  //   const byDisease = Array.from(map.entries())
  //     .map(([condition, pts]) => ({
  //       condition,
  //       count: pts.length,
  //       patients: pts,
  //     }))
  //     .sort((a, b) => b.count - a.count);
  //   return { byDisease };
  // }
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

  return { byAge };
}

// ── Node: LLM generates final spoken summary ─────────────────────────────────
export async function patientSummarize(state: typeof PatientState.State) {
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
      return 'summarize';
  }
}

// ── Node: fetch all active patients ──────────────────────────────────────────
export async function patientFetchAll(state: typeof PatientState.State) {
  // const raw = await apiFetch('/patients', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ page: 1, pageSize: 1000 }),
  // });
  // const patients = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return { patients: [] };
}
