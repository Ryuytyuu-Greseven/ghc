import { END, START, StateGraph } from "@langchain/langgraph";
import { HumanMessage } from "langchain";

import { patientClassifyIntent, patientFetchAll, patientFilterDischarging, patientGroupByAge, patientGroupByDisease, patientSummarize, routePatientAfterFetch } from "../nodes/patient.node";
import { PatientState } from "../states/patient.state";

export const patientAgentGraph = new StateGraph(PatientState)
    .addNode('classify_intent', patientClassifyIntent)
    .addNode('fetch_patients', patientFetchAll)
    .addNode('filter_discharging', patientFilterDischarging)
    .addNode('group_by_disease', patientGroupByDisease)
    .addNode('group_by_age', patientGroupByAge)
    .addNode('summarize', patientSummarize)
    .addEdge(START, 'classify_intent')
    .addEdge('classify_intent', 'fetch_patients')
    .addConditionalEdges('fetch_patients', routePatientAfterFetch, {
        filter_discharging: 'filter_discharging',
        group_by_disease: 'group_by_disease',
        group_by_age: 'group_by_age',
        summarize: 'summarize',
    })
    .addEdge('filter_discharging', 'summarize')
    .addEdge('group_by_disease', 'summarize')
    .addEdge('group_by_age', 'summarize')
    .addEdge('summarize', END)
    .compile();

export async function runPatientAgent(query: string): Promise<string> {
    const result = await patientAgentGraph.invoke({
        query,
        messages: [new HumanMessage(query)],
        intent: '',
        daysAhead: 7,
        patients: [],
        dischargingSoon: [],
        byDisease: [],
        byAge: [],
        finalResponse: '',
    });
    return result.finalResponse || 'Patient analysis complete.';
}
