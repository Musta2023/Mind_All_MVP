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

### 4. CPU-Intensive Offloading (Workers)
CPU-heavy tasks like PDF parsing (`pdf-parse`) and embedding generation (`@xenova/transformers`) are strictly offloaded to **Piscina Worker Threads**.
*   **Environment:** Must use a Debian-based image (like `node:20-slim`) to provide `glibc` for the `onnxruntime` shared library.
*   **Worker:** `backend/src/ai/embedding.worker.js`.
*   **Real-time Progress:** `MemoryService` emits `vault.progress` events via `EventEmitter2`, which are streamed to the frontend using Server-Sent Events (SSE).

---

## 🛠️ Internal Services

### `AiOrchestrationService`
The primary interface for Gemini. 
*   Handles exponential backoff retries (rotating between `gemini-2.5-flash` and `gemini-flash-latest`).
*   Enforces the **Epistemic Honesty Protocol**.
*   Manages the XML-based context isolation.

### `MemoryService`
Manages the semantic memory engine.
*   **Ingestion:** Chunks and embeds documents. Emits progress via `vault.progress`.
*   **Retrieval:** Performs vector similarity search using `pgvector` operators (`<=>`).
*   **Compaction:** Background service that summarizes low-salience memories to prevent context bloat.

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
