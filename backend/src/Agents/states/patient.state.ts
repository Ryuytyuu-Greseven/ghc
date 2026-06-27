import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const PatientState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  daysAhead: Annotation<number>({ reducer: (_, b) => b, default: () => 7 }),
  patients: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  dischargingSoon: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  byDisease: Annotation<
    { condition: string; count: number; patients: any[] }[]
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  byAge: Annotation<
    { group: string; ageRange: string; count: number; patients: any[] }[]
  >({
    reducer: (_, b) => b,
    default: () => [],
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});
