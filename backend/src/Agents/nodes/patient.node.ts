import { createAgent } from 'langchain';
import { AIMessage } from '@langchain/core/messages';
import { llmInstance } from '../../google/vertex.config';
import { patientTools } from '../tools/patient.tools';
import { PATIENT_PROMPT } from '../prompts/patient.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';
import { runPatientAgent } from '../agents.graph';

// Used by voice.gateway.ts for live streaming (ReAct loop with all patient tools)
export const patientAgent = createAgent({
  model: llmInstance,
  tools: patientTools,
  systemPrompt: withGuardrails(PATIENT_PROMPT),
});

// Used by voice-agent.ts graph — runs the full multi-step patientAgentGraph
export async function patientNode(state: typeof AgentState.State) {
  const firstMessage = state.messages[0];
  const query =
    typeof firstMessage?.content === 'string'
      ? firstMessage.content
      : state.transcript || 'List patients';

  const response = await runPatientAgent(query);
  return { messages: [new AIMessage(response)] };
}
