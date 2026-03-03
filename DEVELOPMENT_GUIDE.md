# MindAll Development Guide

This document outlines the technical architecture and development workflows for the MindAll Strategic Intelligence Engine.

## 🏗️ Core Architectural Patterns

### 1. Backend Authority Model (BAM)
To ensure multi-tenant security, the AI is never allowed to specify a `tenantId` or `userId`.
*   The AI suggests a tool call (e.g., `createTask`).
*   The `ToolExecutorService` intercepts the call and injects the `tenantId` and `userId` directly from the user's verified JWT.
*   **Security Rule:** AI is strictly forbidden from outputting internal database IDs in its conversational responses.

### 2. Strategic Intelligence Routing
Instead of a simple RAG, we use a **Think-Search-Answer** flow:
1.  **Intelligence Router:** Gemini 1.5 Pro analyzes the request vs. Internal Context.
2.  **External Trigger:** If a factual gap exists, it generates a structured search query.
3.  **Synthesis:** The `ChatService` fetches live data via Tavily and injects it into the final prompt as read-only data.

### 3. Knowledge Lineage & Polarity Inference
Level 3.5 introduces a semantic graph approach to memory:
*   **Semantic Deduplication:** Insights are compared against existing embeddings. If similarity > 0.92, they are merged.
*   **Relation Mapping:** The `MemoryRelation` table tracks how insights interact (`SUPPORTS`, `CONTRADICTS`, `REFINES`).
*   **Active Strategy Sidebar:** The Chat UI now features a real-time sidebar displaying "Confirmed Strategy" and "Emerging Observations" fetched from the `MemoryStore`.

### 4. CPU-Intensive Offloading (Elite Workers)
CPU-heavy tasks are strictly offloaded to **Piscina Worker Threads** (`backend/src/ai/embedding.worker.js`).
*   **Model Isolation:** Uses `Xenova/all-MiniLM-L6-v2` with a singleton pattern and **60s loading timeout**.
*   **Recovery:** 3-attempt retry strategy with exponential backoff for inference stability.
*   **Elite Chunking:**
    *   **Semantic Merging:** Uses dot-product optimized cosine similarity to group paragraphs into cohesive chunks (0.75 threshold).
    *   **Sliding Window:** Implements a **20% word-level context overlap** to improve RAG recall.
    *   **Batch Optimization:** Re-embeds final merged chunks in a single pass for a **2x-5x speed gain**.
*   **Safety Guards:**
    *   **5MB Document Guard:** Prevents oversized file ingestion.
    *   **500 Paragraph Guard:** Caps memory usage for large documents.
    *   **Worker Refresh:** The `Piscina` pool automatically cycles workers after 20 tasks to prevent memory fragmentation.
*   **Real-time Progress:** Streamed via Server-Sent Events (SSE).

---

## 🛠️ Internal Services

### `AiOrchestrationService`
*   **Intelligence Flow:** Manages the **Think-Search-Answer** flow.
*   **Streaming Support:** Now streams **live tool results** (Web Search, Tasks) directly into the conversational output.
*   **Context Isolation:** Uses XML tags (`<online_intelligence>`, `<operational_tasks>`) to prevent prompt injection.

### `ChatService`
*   **Multi-Tool Loop:** Detects and auto-executes tools like `searchWeb` and `listTasks`.
*   **Result Formatting:** Dynamically formats search results as markdown tables/lists for the UI.
*   **Conversation Management:** Ensures session persistence; new conversations are only created upon explicit user request.
*   **Memory Integration:** Asynchronously extracts insights to the Strategic Ledger using similarity deduplication.

### `MemoryService`
*   **Semantic Deduplication:** Merges redundant insights (similarity > 0.92).
*   **Graph Relations:** Tracks knowledge lineage (`SUPPORTS`, `CONTRADICTS`).
*   **Salience Filtering:** Focuses context injection on high-signal (>= 0.5) data points.

---

## 🚦 Development Workflows

### Docker-Based Development (Recommended)
The entire stack can be run via Docker.
```bash
docker compose up --build -d
```
The frontend is built in **standalone mode** for production-grade performance.

### Database Sync
We use Prisma 7. The backend container automatically runs `npx prisma db push` on startup. To update your local client:
```bash
cd backend
npx prisma generate
```

### Adding New Tools
1.  Define the tool in `getSystemInstructions()` inside `AiOrchestrationService`.
2.  Add the execution logic to `ToolExecutorService.ts`.
3.  For UI-based approval (like `createTask`), ensure the tool is NOT in the `autoExecuteTools` list in `ChatService.ts`.

---

## 🛡️ Security Protocols

### Context Isolation
All external data (Web or Vault) MUST be wrapped in XML tags:
```xml
<historical_memories>...</historical_memories>
<online_intelligence>...</online_intelligence>
```

### Internal Data Hygiene
AI responses are filtered to ensure no internal IDs are leaked. The system prompt contains a dedicated "Internal Data Hygiene" section to enforce this at the model level.

---
🚀 Grounded Intelligence for Strategic Growth.
