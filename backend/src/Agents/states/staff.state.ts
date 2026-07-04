import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const StaffState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  staffList: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  onLeaveToday: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});
