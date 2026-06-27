import { HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { AgentState } from '../state';
import { withGuardrails } from '../prompts/guardrails.prompt';

const ROUTING_PROMPT = `You are a domain router for a healthcare management system.
Classify the doctor's spoken request into exactly ONE domain.

Domains:
- hospital  → hospital facilities, beds, locations
- patient   → patient records, admissions, demographics
- medicine  → pharmacy, drug list, prescriptions
- staff     → doctors, nurses, departments, personnel
- inventory → inventory master items, catalog, warehouse stock, branch stock, stock transfer request approvals, transfer transactions, low stock analytics

Reply with ONLY one word: hospital | patient | medicine | staff | inventory`;

const VALID_DOMAINS = new Set(['hospital', 'patient', 'medicine', 'staff', 'inventory']);

export async function supervisorNode(state: typeof AgentState.State) {
  const agent = createAgent({
    model: llmInstance,
    systemPrompt: withGuardrails(ROUTING_PROMPT),
  });

  const response = await agent.invoke({
    messages: [new HumanMessage(state.transcript)],
  });

  const last = response.messages[response.messages.length - 1];
  const raw = (last.content as string).trim().toLowerCase();
  const domain = VALID_DOMAINS.has(raw) ? raw : 'patient';

  return {
    domain,
    messages: [new HumanMessage(state.transcript)],
  };
}
