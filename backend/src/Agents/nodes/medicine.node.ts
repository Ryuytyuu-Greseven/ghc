import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { medicineTools } from '../tools/medicine.tools';
import { MEDICINE_PROMPT } from '../prompts/medicine.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';

export const medicineAgent = createAgent({
  model: llmInstance,
  tools: medicineTools,
  systemPrompt: withGuardrails(MEDICINE_PROMPT),
});

export async function medicineNode(state: typeof AgentState.State) {
  const response = await medicineAgent.invoke({ messages: state.messages });
  const last = response.messages[response.messages.length - 1];
  return { messages: [last] };
}
