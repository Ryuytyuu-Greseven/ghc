import { END, START, StateGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';

import {
  patientClassifyIntent,
  patientFetchAll,
  patientFilterDischarging,
  patientFilterDischarged,
  patientFindByName,
  patientGroupByAge,
  patientGroupByDisease,
  patientGeneralList,
  routePatientAfterClassify,
  routePatientAfterFetch,
} from '../nodes/patient.node';
import { PatientState } from '../states/patient.state';

export const patientAgentGraph = new StateGraph(PatientState)
  .addNode('classify_intent', patientClassifyIntent)
  .addNode('find_by_name', patientFindByName)
  .addNode('fetch_patients', patientFetchAll)
  .addNode('filter_discharging', patientFilterDischarging)
  .addNode('filter_discharged', patientFilterDischarged)
  .addNode('group_by_disease', patientGroupByDisease)
  .addNode('group_by_age', patientGroupByAge)
  .addNode('general_list', patientGeneralList)
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routePatientAfterClassify, {
    find_by_name: 'find_by_name',
    fetch_patients: 'fetch_patients',
    filter_discharged: 'filter_discharged',
  })
  .addEdge('find_by_name', END)
  .addConditionalEdges('fetch_patients', routePatientAfterFetch, {
    filter_discharging: 'filter_discharging',
    group_by_disease: 'group_by_disease',
    group_by_age: 'group_by_age',
    general_list: 'general_list',
  })
  .addEdge('filter_discharging', END)
  .addEdge('filter_discharged', END)
  .addEdge('group_by_disease', END)
  .addEdge('group_by_age', END)
  .addEdge('general_list', END)
  .compile();

export async function runPatientAgent(query: string): Promise<string> {
  const result = await patientAgentGraph.invoke({
    query,
    messages: [new HumanMessage(query)],
    intent: '',
    daysAhead: 7,
    patients: [],
    dischargingSoon: [],
    dischargedPatients: [],
    byDisease: [],
    byAge: [],
    finalResponse: '',
  });
  return result.finalResponse || 'Patient analysis complete.';
}
