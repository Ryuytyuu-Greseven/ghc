import { AIMessage, createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import {
  findAbsenceStaff,
  findAvailableStaff,
  mapStaff,
  staffTools,
} from '../tools/staff.tools';
import { STAFF_MAPPING_PROMPT, STAFF_PROMPT } from '../prompts/staff.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { END, START, StateGraph } from '@langchain/langgraph';
import { StaffState } from '../states/staff.state';
import { appInstance } from '../../main';
import { StaffService } from '../../staff/staff.service';
import { UserRole } from '../../common/enums';
import { llmClassify, extractBranchId } from './helper.node';
import { runStaffAgent } from '../graphs/staff.graph';

const COVERAGE_QUERY_PATTERN =
  /\b(transfer|replacement|cover(?:age|ing)?|reassign|absent(?:ee)?)\b/i;

// ── Node: classify staff query intent ─────────────────────────────────────────
export async function staffClassifyIntent(state: typeof StaffState.State) {
  const intent = await llmClassify(
    state.query,
    ['list_staff', 'on_leave_today'],
    `You are a staff query classifier for a hospital management system. This entire agent flow depends on this routing node.
        ## Classify the doctor's request into exactly one from the below available options:
          - list_staff  → admin wants to list staff, see staff details, or look up a specific staff member by name, role, or hospital.
          - on_leave_today  → admin wants to know which staff members are on leave/unavailable today, and for how long.

      Reply with ONE option only — one of: list_staff, on_leave_today`,
  );
  return { intent };
}

function extractStaffRole(query: string): string | undefined {
  const lower = query.toLowerCase();
  return Object.values(UserRole).find((role) =>
    lower.includes(role.toLowerCase()),
  );
}

function extractStaffName(query: string, role?: string): string | undefined {
  let clean = query;
  if (role) clean = clean.replace(new RegExp(role, 'gi'), '');
  clean = clean
    .replace(
      /\b(list|show|find|get|search|staff|member|members|details|detail|of|for|the|a|an|is|are|in|at|please|who)\b/gi,
      '',
    )
    .replace(/[?.]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return clean.length >= 2 ? clean : undefined;
}

// ── Node: fetch staff list, optionally filtered by hospital/role/name ────────
export async function staffListAll(state: typeof StaffState.State) {
  const hospitalId = await extractBranchId(state.query);
  const role = extractStaffRole(state.query);
  const name = extractStaffName(state.query, role);

  const service = appInstance.get(StaffService);
  let staffList: any[] = await service.findAll(
    hospitalId ? { hospitalId } : {},
  );

  if (role) {
    staffList = staffList.filter(
      (s: any) => s.role?.toLowerCase() === role.toLowerCase(),
    );
  }
  if (name) {
    staffList = staffList.filter((s: any) => {
      const fullName =
        s.displayName || `${s.firstName} ${s.lastName || ''}`.trim();
      return fullName.toLowerCase().includes(name.toLowerCase());
    });
  }

  return { staffList };
}

// ── Node: find staff currently on leave (via approved coverage requests) ────
export async function staffOnLeaveToday(_state: typeof StaffState.State) {
  const service = appInstance.get(StaffService);
  const requests: any[] = await service.getCoverageRequests();
  const todayStr = new Date().toISOString().split('T')[0];

  const onLeaveToday = requests
    .filter(
      (r: any) =>
        r.status === 'Approved' &&
        Array.isArray(r.dates) &&
        r.dates.includes(todayStr),
    )
    .map((r: any) => ({
      staffName: r.staffId?.name || 'Unknown',
      department: r.staffId?.department,
      hospitalName: r.vacantHospitalId?.name,
      startDate: r.startDate,
      endDate: r.endDate,
      replacementName: r.replacementStaffId?.name,
    }));

  return { onLeaveToday };
}

// ── Node: format staff data into structured markdown cards (no LLM call) ────
export function staffSummarize(state: typeof StaffState.State) {
  const cards: string[] = [];

  if (state.intent === 'on_leave_today') {
    if (state.onLeaveToday.length === 0) {
      const finalResponse = 'No staff members are on leave today.';
      return { finalResponse, messages: [new AIMessage(finalResponse)] };
    }
    state.onLeaveToday.forEach((s: any, index: number) => {
      cards.push(
        `### Staff - ${index + 1}\n` +
        `**Name:** ${s.staffName}\n` +
        `**Department:** ${s.department || 'N/A'}\n` +
        `**Hospital:** ${s.hospitalName || 'N/A'}\n` +
        `**On Leave From:** ${s.startDate}\n` +
        `**On Leave Until:** ${s.endDate}` +
        (s.replacementName ? `\n**Covered By:** ${s.replacementName}` : ''),
      );
    });
    const finalResponse = cards.join('\n\n');
    return { finalResponse, messages: [new AIMessage(finalResponse)] };
  }

  if (state.staffList.length === 0) {
    const finalResponse = 'No staff members found matching that query.';
    return { finalResponse, messages: [new AIMessage(finalResponse)] };
  }

  state.staffList.slice(0, 15).forEach((s: any, index: number) => {
    const name = s.displayName || `${s.firstName} ${s.lastName || ''}`.trim();
    cards.push(
      `### Staff - ${index + 1}\n` +
      `**Name:** ${name}\n` +
      `**Role:** ${s.role || 'N/A'}\n` +
      `**Department:** ${s.department || 'N/A'}\n` +
      `**Specialization:** ${s.specialization || 'N/A'}\n` +
      `**Phone:** ${s.mobileNumber || 'N/A'}\n` +
      `**Hospital:** ${s.hospitalId?.name || 'Unassigned'}`,
    );
  });

  const finalResponse = cards.join('\n\n');
  return { finalResponse, messages: [new AIMessage(finalResponse)] };
}

// ── Routing from classify_intent → correct fetch node ────────────────────────
export function routeStaff(state: typeof StaffState.State): string {
  return state.intent === 'on_leave_today' ? 'on_leave_today' : 'list_staff';
}

export const staffAgent = createAgent({
  model: llmInstance,
  tools: staffTools,
  systemPrompt: withGuardrails(STAFF_PROMPT),
});

// Main Nodes
export const staffMapping = async (state: typeof AgentState.State) => {
  // tools
  // prompts
  // query

  const agent = createAgent({
    model: llmInstance,
    tools: [findAbsenceStaff, findAvailableStaff, mapStaff],
    systemPrompt: withGuardrails(STAFF_MAPPING_PROMPT),
  });

  const response = await agent.invoke(
    {
      messages: state.messages,
    },
    {
      tags: ['classification'],
      metadata: { is_classification: true },
    },
  );

  // intent analysis, if user asked for only find absence satff, we shall end graph,if asked only for avaiable staff we shall end here.
  // if asked to do transfer completely, then we shall continue to next node `runTransfer`.

  const finalIntent: any =
    response.messages[response.messages.length - 1].content || '';
  try {
    const finalIntent2 = JSON.parse(finalIntent || '{}');
    if (finalIntent2?.final_intent && finalIntent2.final_intent === 'endHere') {
      return {
        messages: [new AIMessage('Ending staff mapping')],
        finalResponse: 'Ending staff mapping',
      };
    } else if (
      finalIntent2?.final_intent &&
      finalIntent2.final_intent === 'runTransfer'
    ) {
      return {
        messages: [new AIMessage('Running transfer')],
        finalResponse: 'Running transfer',
      };
    }
  } catch (error) {
    console.error('Error parsing final intent:', error);
    return {
      messages: [new AIMessage('Ending staff mapping')],
      finalResponse: 'Ending staff mapping',
    };
  }

  // const response = await findAbsenceStaff(state);
  // return { messages: [new AIMessage(response)], finalResponse: response };
};

// Used by voice-agent.ts graph — dispatches between the coverage-automation
// flow (transfer/replacement queries) and the staff query graph (list/details/leave)
export async function staffNode(state: typeof AgentState.State) {
  const firstMessage = state.messages[0];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'List staff';

  if (COVERAGE_QUERY_PATTERN.test(query)) {
    const response = await runAutonomousStaffAgent(state, query);
    return { messages: [new AIMessage(response.finalResponse)] };
  }

  const finalResponse = await runStaffAgent(query);
  return { messages: [new AIMessage(finalResponse)], finalResponse };
}

const runTransfer = (state: typeof AgentState.State) => {
  // const response = await findAvailableStaff(state);
  return { messages: [new AIMessage('Transfer Completed')] };
};

const autonomousStaffAgent = new StateGraph(AgentState)
  .addNode('staffMapping', staffMapping)
  .addEdge(START, 'staffMapping')
  .addNode('runTransfer', runTransfer)
  .addEdge('staffMapping', END)
  .addEdge('staffMapping', 'runTransfer')
  .addEdge('runTransfer', END)
  // .addNode('sendNotifications', sendNotifications)
  .compile();

const runAutonomousStaffAgent = async (
  state: typeof AgentState.State,
  query: string,
) => {
  const response = await autonomousStaffAgent.invoke({
    messages: state.messages,
  });
  return {
    messages: [new AIMessage(response.finalResponse)],
    finalResponse: response.finalResponse,
  };
};
