import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  transcript: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
  domain: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});
