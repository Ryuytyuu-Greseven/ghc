// import { createAgent } from 'langchain';
// import { llmInstance } from '../../google/vertex.config';
// import { hospitalTools } from '../tools/hospital.tools';
// import { HOSPITAL_PROMPT } from '../prompts/hospital.prompt';
// import { withGuardrails } from '../prompts/guardrails.prompt';
import { AIMessage } from '@langchain/core/messages';
import { AgentState } from '../state';
import { END, START, StateGraph } from '@langchain/langgraph';
import { PatientState } from '../states/patient.state';
import { createHospitalTools, type HospitalTools } from './hospital.agent.node';

let hospitalToolsClass: HospitalTools | undefined;

function getHospitalToolsClass(): HospitalTools {
  if (!hospitalToolsClass) {
    hospitalToolsClass = createHospitalTools();
  }
  return hospitalToolsClass;
}

// export const hospitalAgent = createAgent({
//   model: llmInstance,
//   tools: hospitalTools,
//   systemPrompt: withGuardrails(HOSPITAL_PROMPT),
// });

export const hospitalGraph = new StateGraph(PatientState)
  .addNode('classify_intent', (state) =>
    getHospitalToolsClass().clasifyHospitalIntent(state),
  )
  .addNode('fetchHospitals', (state) =>
    getHospitalToolsClass().fetchHospitals(state),
  )
  .addEdge(START, 'classify_intent')
  .addEdge('classify_intent', 'fetchHospitals')
  .addEdge('fetchHospitals', END).compile();

export async function hospitalNode(state: typeof AgentState.State) {
  const lastContent = state.messages.at(-1)?.content;
  const query =
    state.transcript ||
    (typeof lastContent === 'string' ? lastContent : 'List hospitals');

  const result = await hospitalGraph.invoke({
    query,
    messages: state.messages,
  });

  const text =
    result.finalResponse ||
    (typeof result.messages?.at(-1)?.content === 'string'
      ? (result.messages.at(-1)!.content as string)
      : 'No hospital data found');

  return { messages: [new AIMessage(text)], finalResponse: text };
}
