import { AIMessage, createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import {
  findAbsenceStaff,
  findAvailableStaff,
  getStaffService,
  staffListingTools,
  mapStaff,
  staffTools
} from '../tools/staff.tools';
import {
  STAFF_MAPPING_PROMPT,
  STAFF_LIST_PROMPT,
  STAFF_ON_LEAVE_PROMPT,
} from '../prompts/staff.prompt';

import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { END, START, StateGraph } from '@langchain/langgraph';
import { StaffState } from '../states/staff.state';
import { llmClassify, resolveUserQuery } from './helper.node';
import { runStaffAgent } from '../graphs/staff.graph';

const COVERAGE_QUERY_PATTERN =
  /\b(transfer|replacement|cover(?:age|ing)?|reassign|absent(?:ee)?)\b/i;

async function generateStaffResponse(
  messages: any[],
  data: any,
  promptTemplate: string,
) {
  const dataPrompt = promptTemplate.replace(
    '{staffData}',
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
  console.log('Staff Classify Intent:', intent);
  return { intent };
}

// ── Node: list staff via LLM + list_staff tool ───────────────────────────────
export async function staffListAll(state: typeof StaffState.State) {
  const staffListAgent = createAgent({
    model: llmInstance,
    tools: staffListingTools,
    systemPrompt: withGuardrails(STAFF_LIST_PROMPT),
  });

  console.log('Staff Messages:', state.messages);
  const llmResponse = await staffListAgent.invoke({ messages: state.messages });
  const finalMessage = llmResponse.messages[llmResponse.messages.length - 1];
  const finalResponse =
    typeof finalMessage.content === 'string'
      ? finalMessage.content
      : JSON.stringify(finalMessage.content);

  return { finalResponse };
}

// ── Node: find staff currently on leave (via approved coverage requests) ────
export async function staffOnLeaveToday(state: typeof StaffState.State) {
  const service = getStaffService();
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

  const finalResponse = await generateStaffResponse(
    state.messages,
    { onLeaveToday, intent: state.intent },
    STAFF_ON_LEAVE_PROMPT,
  );

  return { onLeaveToday, finalResponse };
}

// ── Routing from classify_intent → correct fetch node ────────────────────────
export function routeStaff(state: typeof StaffState.State): string {
  return state.intent === 'on_leave_today' ? 'on_leave_today' : 'list_staff';
}

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
  const query = resolveUserQuery(state, 'List staff');

  if (COVERAGE_QUERY_PATTERN.test(query)) {
    const response = await runAutonomousStaffAgent(state, query);
    return { messages: [new AIMessage(response.finalResponse)] };
  }

  const finalResponse = await runStaffAgent(query, state.messages);
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
