import { createAgent } from 'langchain';
import { llmInstance } from '../../google/vertex.config';
import { patientTools } from '../tools/patient.tools';
import { PATIENT_PROMPT } from '../prompts/patient.prompt';
import { withGuardrails } from '../prompts/guardrails.prompt';
import { AgentState } from '../state';

export const patientAgent = createAgent({
  model: llmInstance,
  tools: patientTools,
  systemPrompt: withGuardrails(PATIENT_PROMPT),
});

export async function patientNode(state: typeof AgentState.State) {
  const response = await patientAgent.invoke({ messages: state.messages });
  const last = response.messages[response.messages.length - 1];
  return { messages: [last] };
}
