import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentState } from './state';
import { supervisorNode } from './nodes/supervisor.node';
import { hospitalNode } from './nodes/hospital.node';
import { patientNode } from './nodes/patient.node';
import { medicineNode } from './nodes/medicine.node';
import { staffNode } from './nodes/staff.node';
import { inventoryNode } from './nodes/inventory.node';
import { transcribeAudio, type TranscribeOptions } from '../google/speech.service';
import { toPlainSpeechText } from './prompts/guardrails.prompt';

const DOMAIN_NODES = new Set(['hospital', 'patient', 'medicine', 'staff', 'inventory']);

function routeDomain(state: typeof AgentState.State): string {
  console.log('Route Domain', state.domain);
  return DOMAIN_NODES.has(state.domain) ? state.domain : 'patient';
}

// Each domain node runs a full createAgent ReAct loop internally,
// so no ToolNode or tool-routing edges are needed in the outer graph.
export const voiceAgentGraph = new StateGraph(AgentState)
  .addNode('supervisor', supervisorNode)
  .addNode('hospital', hospitalNode)
  .addNode('patient', patientNode)
  .addNode('medicine', medicineNode)
  .addNode('staff', staffNode)
  .addNode('inventory', inventoryNode)
  .addEdge(START, 'supervisor')
  .addConditionalEdges('supervisor', routeDomain)
  .addEdge('hospital', END)
  .addEdge('patient', END)
  .addEdge('medicine', END)
  .addEdge('staff', END)
  .addEdge('inventory', END)
  .compile();

export async function runVoiceAgent(
  audioBuffer: Buffer,
  transcribeOptions?: TranscribeOptions,
): Promise<string> {
  const transcript = await transcribeAudio(audioBuffer, transcribeOptions);
  if (!transcript) return 'Could not transcribe audio. Please try again.';

  const result = await voiceAgentGraph.invoke({
    transcript,
    messages: [],
    domain: '',
    finalResponse: '',
  });

  const last = result.messages[result.messages.length - 1];
  const content =
    typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content ?? '');
  return toPlainSpeechText(content);
}
