import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { InventoryState } from "../states/inventory.state";
import { inventoryCheckExpiring, inventoryCheckStock, inventoryClassifyIntent, inventoryListAll, inventoryListRequests, inventoryRaiseRequests, inventorySummarize, routeInventory } from "../nodes/inventory.node";


export const inventoryAgentGraph = new StateGraph(InventoryState)
    .addNode('classify_intent', inventoryClassifyIntent)
    .addNode('list_inventory', inventoryListAll)
    .addNode('list_requests', inventoryListRequests)
    .addNode('check_stock', inventoryCheckStock)
    .addNode('check_expiring', inventoryCheckExpiring)
    .addNode('raise_requests', inventoryRaiseRequests)
    .addNode('summarize', inventorySummarize)
    .addEdge(START, 'classify_intent')
    .addConditionalEdges('classify_intent', routeInventory, {
        list_inventory: 'list_inventory',
        list_requests: 'list_requests',
        check_stock: 'check_stock',
    })
    .addEdge('list_inventory', END)
    .addEdge('list_requests', 'summarize')
    .addEdge('check_stock', 'check_expiring')
    .addEdge('check_expiring', 'raise_requests')
    .addEdge('raise_requests', 'summarize')
    .addEdge('summarize', END)
    .compile();

export async function runInventoryAgent(query: string): Promise<string> {
    const result = await inventoryAgentGraph.invoke({
        query,
        messages: [new HumanMessage(query)],
        searchQuery: undefined,
        intent: '',
        inventoryList: [],
        lowStockItems: [],
        outOfStockItems: [],
        expiringItems: [],
        serviceRequests: [],
        finalResponse: '',
    });
    return result.finalResponse || 'Inventory analysis complete.';
}
