import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const HospitalState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  hospitals: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  bedsAvailability: Annotation<any>({ reducer: (_, b) => b, default: () => null }),
  medicalIncharge: Annotation<any>({ reducer: (_, b) => b, default: () => null }),
  patients: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  staff: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  specialists: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});
