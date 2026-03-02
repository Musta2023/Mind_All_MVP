# MindAll Deployment Guide

MindAll is designed for high-fidelity containerized deployment: PostgreSQL (with pgvector) + Redis + Multi-service Docker infrastructure.

## 🐳 Full Stack Docker Setup (Recommended)
The project root contains a complete `docker-compose.yml` for orchestrating the entire system.

### Services:
*   **db:** PostgreSQL 15-alpine (Local development fallback).
*   **redis:** Redis 7-alpine (BullMQ + Caching).
*   **backend:** NestJS API (Node.js 20-slim).
*   **frontend:** Next.js Web App (Standalone mode).

### Deployment Steps:
1.  **Configure `.env`**: Create a `.env` file in the root directory (refer to `README.md` for required keys).
2.  **Launch Stack**:
    ```bash
    docker compose up --build -d
    ```
3.  **Automatic Schema Sync**: The backend container automatically runs `npx prisma db push` on startup to synchronize your schema with the database.

---

## 🛠️ Infrastructure Requirements

### 1. OS Compatibility (Native Modules)
The backend uses **onnxruntime-node** for local embeddings. 
*   **Docker:** Use the provided `Dockerfile` based on `node:20-slim` (Debian) to ensure `glibc` compatibility.
*   **Alpine Note:** Do not use `alpine` for the backend, as it lacks the shared libraries required for vector embedding generation.

### 2. Database (PostgreSQL + pgvector)
MindAll requires **pgvector** support for semantic search.
*   **Recommended:** db.prisma.io or Neon.tech.
*   **Manual Setup**: If self-hosting, run `CREATE EXTENSION IF NOT EXISTS vector;` on your database.

### 3. Compute Resources
*   **CPU:** Multithreaded tasks (PDF parsing, embeddings) are offloaded to Piscina workers. Ensure at least **2 vCPUs** are available.
*   **Memory:** Minimum **2GB RAM** recommended for the backend to handle large document ingestion.

---

## 🔑 Environment Configuration

### Mandatory Variables
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Prisma connection string (PostgreSQL). |
| `REDIS_URL` | Redis URL (e.g., `redis://redis:6379`). |
| `GEMINI_API_KEY` | Google AI API Key. |
| `TAVILY_API_KEY` | Real-time search API Key. |
| `JWT_SECRET` | Secret for access token generation. |
| `JWT_REFRESH_SECRET` | Secret for refresh token rotation. |
| `NEXT_PUBLIC_API_URL` | Frontend pointer to the Backend (e.g., `http://localhost:3001`). |

---

## 🚀 Production Optimization
1.  **Standalone Frontend**: The Next.js frontend is built in `standalone` mode, which minimizes the Docker image size significantly.
2.  **SSE Readiness**: Ensure your reverse proxy (Nginx/Cloudflare) supports long-lived connections for Server-Sent Events (SSE).
3.  **Health Checks**: Use `/health` (Backend) and `/vault/health` to monitor service status.

---
MindAll: Secure, Scalable, Strategic. 🛡️
