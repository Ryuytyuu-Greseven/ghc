import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { inventoryTools } from '../tools/inventory.tools';
import { INVENTORY_PROMPT } from '../prompts/inventory.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';

export const inventoryAgent = createAgent({
  model: llmInstance,
  tools: inventoryTools,
  systemPrompt: withGuardrails(INVENTORY_PROMPT),
});

export async function inventoryNode(state: typeof AgentState.State) {
  const response = await inventoryAgent.invoke({ messages: state.messages });
  const last = response.messages[response.messages.length - 1];
  return { messages: [last] };
}
