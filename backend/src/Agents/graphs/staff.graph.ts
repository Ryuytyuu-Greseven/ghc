import { StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { StaffState } from '../states/staff.state';
import {
  staffClassifyIntent,
  staffListAll,
  staffOnLeaveToday,
  staffSummarize,
  routeStaff,
} from '../nodes/staff.node';

export const staffAgentGraph = new StateGraph(StaffState)
  .addNode('classify_intent', staffClassifyIntent)
  .addNode('list_staff', staffListAll)
  .addNode('on_leave_today', staffOnLeaveToday)
  .addNode('summarize', staffSummarize)
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routeStaff, {
    list_staff: 'list_staff',
    on_leave_today: 'on_leave_today',
  })
  .addEdge('list_staff', 'summarize')
  .addEdge('on_leave_today', 'summarize')
  .addEdge('summarize', END)
  .compile();

export async function runStaffAgent(query: string): Promise<string> {
  const result = await staffAgentGraph.invoke({
    query,
    messages: [new HumanMessage(query)],
    intent: '',
    staffList: [],
    onLeaveToday: [],
    finalResponse: '',
  });
  return result.finalResponse || 'Staff query complete.';
}
