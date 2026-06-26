import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { staffTools } from '../tools/staff.tools';
import { STAFF_PROMPT } from '../prompts/staff.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';

export const staffAgent = createAgent({
  model: llmInstance,
  tools: staffTools,
  systemPrompt: withGuardrails(STAFF_PROMPT),
});

export async function staffNode(state: typeof AgentState.State) {
  const response = await staffAgent.invoke({ messages: state.messages });
  const last = response.messages[response.messages.length - 1];
  return { messages: [last] };
}
