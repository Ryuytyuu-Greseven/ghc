import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const InventoryState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  query: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  searchQuery: Annotation<string | undefined>({
    reducer: (_, b) => b,
    default: () => undefined,
  }),
  intent: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
  inventoryList: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  lowStockItems: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  outOfStockItems: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  expiringItems: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
  serviceRequests: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  finalResponse: Annotation<string>({
    reducer: (_, b) => b,
    default: () => '',
  }),
});
