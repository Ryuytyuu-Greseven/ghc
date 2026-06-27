import { HumanMessage } from '@langchain/core/messages';
import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { AgentState } from '../state';
import { withGuardrails } from '../prompts/guardrails.prompt';

const ROUTING_PROMPT = `You are a domain router for a healthcare management system.
Classify the doctor's spoken request into exactly ONE domain.

Domains:
- hospital  → hospital facilities, beds, locations, list of hospitals
- patient   → patient records, admissions, demographics
- medicine  → pharmacy, drug list, prescriptions
- staff     → doctors, nurses, departments, personnel
- inventory → inventory master items, catalog, warehouse stock, branch stock, stock transfer request approvals, transfer transactions, low stock analytics

Reply with ONLY one word: hospital | patient | medicine | staff | inventory`;

const VALID_DOMAINS = new Set(['hospital', 'patient', 'medicine', 'staff', 'inventory']);

function parseDomain(content: string): string {
  const normalized = content.trim().toLowerCase();
  for (const domain of VALID_DOMAINS) {
    if (normalized.includes(domain)) return domain;
  }
  const first = normalized.split(/[\s,.]+/)[0];
  return VALID_DOMAINS.has(first) ? first : 'patient';
}

export async function supervisorNode(state: typeof AgentState.State) {
  const agent = createAgent({
    model: llmInstance,
    systemPrompt: withGuardrails(ROUTING_PROMPT),
  });

  const response = await agent.invoke({
    messages: [new HumanMessage(state.transcript)],
  });

  const last = response.messages[response.messages.length - 1];
  const domain = parseDomain(String(last.content ?? ''));

  console.log('[supervisor] transcript:', state.transcript, '→ domain:', domain);

  return {
    domain,
    messages: [new HumanMessage(state.transcript)],
  };
}
