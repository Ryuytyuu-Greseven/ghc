import { StateGraph, START, END } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { StaffState } from '../states/staff.state';
import {
  staffClassifyIntent,
  staffListAll,
  staffOnLeaveToday,
  routeStaff,
} from '../nodes/staff.node';
import { latestHumanMessages } from '../nodes/helper.node';

export const staffAgentGraph = new StateGraph(StaffState)
  .addNode('classify_intent', staffClassifyIntent)
  .addNode('list_staff', staffListAll)
  .addNode('on_leave_today', staffOnLeaveToday)
  .addEdge(START, 'classify_intent')
  .addConditionalEdges('classify_intent', routeStaff, {
    list_staff: 'list_staff',
    on_leave_today: 'on_leave_today',
  })
  .addEdge('list_staff', END)
  .addEdge('on_leave_today', END)
  .compile();

export async function runStaffAgent(
  query: string,
  parentMessages: BaseMessage[] = [],
): Promise<string> {
  const messages = latestHumanMessages(parentMessages, query);
  const result = await staffAgentGraph.invoke({
    query,
    messages,
    intent: '',
    staffList: [],
    onLeaveToday: [],
    finalResponse: '',
  });
  return result.finalResponse || 'Staff query complete.';
}
