import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { hospitalTools } from '../tools/hospital.tools';
import { HOSPITAL_PROMPT } from '../prompts/hospital.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';

export const hospitalAgent = createAgent({
  model: llmInstance,
  tools: hospitalTools,
  systemPrompt: withGuardrails(HOSPITAL_PROMPT),
});

export async function hospitalNode(state: typeof AgentState.State) {
  const response = await hospitalAgent.invoke({ messages: state.messages });
  const last = response.messages[response.messages.length - 1];
  return { messages: [last] };
}
