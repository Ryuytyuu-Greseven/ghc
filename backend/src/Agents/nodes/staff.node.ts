import { AIMessage, createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { findAbsenceStaff, findAvailableStaff, mapStaff, staffTools } from '../tools/staff.tools';
import { STAFF_MAPPING_PROMPT, STAFF_PROMPT } from '../prompts/staff.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { END, START, StateGraph } from '@langchain/langgraph';

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

  const response = await agent.invoke({
    messages: state.messages,
  });

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

// Used by voice-agent.ts graph — runs the full multi-step patientAgentGraph
export async function staffNode(state: typeof AgentState.State) {
  const firstMessage = state.messages[0];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'List patients';

  const response = await runAutonomousStaffAgent(state, query);
  return { messages: [new AIMessage(response.finalResponse)] };
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
