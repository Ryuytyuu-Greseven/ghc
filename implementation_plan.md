# Implementation Plan - AI-Driven Inventory Analytics & Resource Redistribution

This plan details the implementation of early stock-out warnings, AI-driven demand forecasting, and smart resource redistribution recommendations across GHC district facilities (PHCs/CHCs).

---

## User Review Required

> [!IMPORTANT]
> - We will use the existing `llmInstance` (Gemini via Vertex AI) in NestJS to perform the AI-driven demand forecasting.
> - Redistribution recommendations will be calculated dynamically based on real-time inventory levels, average consumption rates, and predicted AI demand.
> - An "Apply Transfer" feature will allow authorized users to automatically trigger branch-to-branch `InventoryRequest` records.

---

## Proposed Changes

### 1. Database & Schema Updates

No new collections are required. We will reuse the existing:
- `BranchInventory` (available quantity per facility and item)
- `InventoryTransaction` (audit trail of transactions: issues, transfers, adjustments)
- `InventoryRequest` (branch transfer requests)

---

### 2. Backend Implementation (NestJS)

#### [NEW] [inventory-analytics.service.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/inventory/inventory-analytics/inventory-analytics.service.ts)
Implement the core analytics logic:
- `getLowStockWarnings()`: Calculates Days of Stock (DOS) = `availableQty / dailyConsumptionRate`. Flags items with DOS < 7.
- `getDemandForecast(itemId, branchId)`: Aggregates historical transaction issues, feeds the daily distribution to Gemini (`llmInstance`), and gets a predicted demand curve for the next 7 and 30 days.
- `getRedistributionRecommendations()`: Matches recipient facilities (stock-out warnings or high forecasted demand) with surplus facilities (excess inventory above 30-day forecast) to generate recommended transfer actions.
- `applyRecommendation(fromBranchId, toBranchId, itemId, quantity)`: Programmatically creates a pending `InventoryRequest` to execute the suggested redistribution.

#### [NEW] [inventory-analytics.controller.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/inventory/inventory-analytics/inventory-analytics.controller.ts)
Expose REST API endpoints:
- `GET /inventory-analytics/stockout-warnings`
- `GET /inventory-analytics/forecast/:itemId/:branchId`
- `GET /inventory-analytics/redistribution-recommendations`
- `POST /inventory-analytics/redistribution/apply`

#### [MODIFY] [inventory.module.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/inventory/inventory.module.ts)
Register `InventoryAnalyticsService` and `InventoryAnalyticsController`.

---

### 3. Agent Integration (NLP/Voice Interface)

#### [NEW] [inventory-analytics.tools.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/Agents/tools/inventory-analytics.tools.ts)
Define tool wrappers for langchain:
- `get_stockout_warnings`: Lists critical low-stock items at branches.
- `get_demand_forecast`: Fetches AI predictions for specific items/branches.
- `get_redistribution_recommendations`: Summarizes recommended stock transfers.

#### [MODIFY] [inventory.prompt.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/Agents/prompts/inventory.prompt.ts)
Add instructions for the agent to answer questions about stock out alerts, demand forecasts, and redistribution options.

#### [MODIFY] [inventory.node.ts](file:///Users/raghu.nodagala/Raghu/projects/ghc/backend/src/Agents/nodes/inventory.node.ts)
Register the new tools in the inventory agent.

---

### 4. Frontend Implementation (React)

#### [NEW] [AIInventoryAnalyticsTab.tsx](file:///Users/raghu.nodagala/Raghu/projects/ghc/frontend/src/pages/inventory/AIInventoryAnalyticsTab.tsx)
A premium dashboard tab containing:
1. **Critical Alerts Panel**: Shows items with <7 days of stock left.
2. **Demand Forecasting Tool**: Allows selection of a facility and drug to visualize projected vs historic demand using interactive charts.
3. **Smart Redistribution Table**: Lists suggested transfers (Item, From Facility, To Facility, Quantity, and AI Justification). Includes an **"Apply Transfer"** button that fires the API and refreshes the recommendations.

#### [MODIFY] [MedicineList.tsx](file:///Users/raghu.nodagala/Raghu/projects/ghc/frontend/src/pages/medicines/MedicineList.tsx)
Add the "AI Analytics" tab option and render `AIInventoryAnalyticsTab`.

---

## Verification Plan

### Automated Tests
- Create unit tests in backend `inventory-analytics.service.spec.ts` to verify mathematical calculation of average daily consumption, threshold detection, and redistribution matching.

### Manual Verification
1. Open the UI, navigate to "Medicines & Supplies" -> "AI Analytics" tab.
2. Verify early stock-out warnings are displayed with accurate days-of-stock count.
3. Select an item and a branch, verify the AI demand forecast renders with projections from Gemini.
4. Review the redistribution recommendations card list, click "Apply Transfer", and verify a new request is created in the "Requests" tab.
5. Use chatbot text/voice command (e.g. *"Are there any stock out warnings?"*) and verify the GHC AI Chatbot reports them in the active language.
