import { AIMessage } from '@langchain/core/messages';
import { AgentState } from '../state';
import { END, START, StateGraph } from '@langchain/langgraph';
import { HospitalState } from '../states/hospital.state';
import { createHospitalTools, type HospitalTools } from './hospital.agent.node';

let hospitalToolsClass: HospitalTools | undefined;

function getHospitalToolsClass(): HospitalTools {
  if (!hospitalToolsClass) {
    hospitalToolsClass = createHospitalTools();
  }
  return hospitalToolsClass;
}

function routeHospitalAfterClassify(state: typeof HospitalState.State): string {
  switch (state.intent) {
    case 'fetchHospitals':
      return 'fetchHospitalsNode';
    case 'bedsAvailability':
      return 'bedsAvailabilityNode';
    case 'medicalInchargeDetails':
      return 'medicalInchargeDetailsNode';
    case 'patientsDetails':
      return 'patientsDetailsNode';
    case 'staffDetails':
      return 'staffDetailsNode';
    case 'availableSpecialists':
      return 'availableSpecialistsNode';
    default:
      return 'fetchHospitalsNode';
  }
}

export const hospitalGraph = new StateGraph(HospitalState)
  .addNode('classify_intent', (state) =>
    getHospitalToolsClass().clasifyHospitalIntent(state),
  )
  .addNode('fetchHospitalsNode', (state) =>
    getHospitalToolsClass().fetchHospitals(state),
  )
  .addNode('bedsAvailabilityNode', (state) =>
    getHospitalToolsClass().bedsAvailability(state),
  )
  .addNode('medicalInchargeDetailsNode', (state) =>
    getHospitalToolsClass().medicalInchargeDetails(state),
  )
  .addNode('patientsDetailsNode', (state) =>
    getHospitalToolsClass().patientsDetails(state),
  )
  .addNode('staffDetailsNode', (state) =>
    getHospitalToolsClass().staffDetails(state),
  )
  .addNode('availableSpecialistsNode', (state) =>
    getHospitalToolsClass().availableSpecialists(state),
  )
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routeHospitalAfterClassify, {
    fetchHospitalsNode: 'fetchHospitalsNode',
    bedsAvailabilityNode: 'bedsAvailabilityNode',
    medicalInchargeDetailsNode: 'medicalInchargeDetailsNode',
    patientsDetailsNode: 'patientsDetailsNode',
    staffDetailsNode: 'staffDetailsNode',
    availableSpecialistsNode: 'availableSpecialistsNode',
  })
  .addEdge('fetchHospitalsNode', END)
  .addEdge('bedsAvailabilityNode', END)
  .addEdge('medicalInchargeDetailsNode', END)
  .addEdge('patientsDetailsNode', END)
  .addEdge('staffDetailsNode', END)
  .addEdge('availableSpecialistsNode', END)
  .compile();

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
