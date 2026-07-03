import { createAgent } from 'langchain';
import { AIMessage } from '@langchain/core/messages';
import { llmInstance } from '../../google/vertex.config';
import { inventoryTools } from '../tools/inventory.tools';
import { inventoryAnalyticsTools } from '../tools/inventory-analytics.tools';
import { INVENTORY_PROMPT } from '../prompts/inventory.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { runInventoryAgent } from '../agents.graph';

// Used by voice.gateway.ts for live streaming (ReAct loop with all inventory tools)
export const inventoryAgent = createAgent({
  model: llmInstance,
  tools: [...inventoryTools, ...inventoryAnalyticsTools],
  systemPrompt: withGuardrails(INVENTORY_PROMPT),
});

// Used by voice-agent.ts graph — runs the full multi-step inventoryAgentGraph
export async function inventoryNode(state: typeof AgentState.State) {
  console.log('Inventory Node State', state);
  const firstMessage = state.messages[state.messages.length - 1];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'Check inventory status';

  console.log('Inventory Node Query', query);
  const response = await runInventoryAgent(query);
  console.log('Inventory Node Response', response);
  return { messages: [new AIMessage(response)] };
}
