# AutoDM ⚡

> **Turn Instagram comments into conversations — automatically.**

AutoDM is a high-performance, developer-grade comment-to-DM automation SaaS for creators, businesses, and agencies. Connect your Instagram account, configure trigger keywords on your posts, and automatically send resources, links, or AI-personalized direct messages to everyone who asks — backed by a fully traceable LangGraph workflow engine with deterministic safety guardrails.

---

## 🚀 Key Features

- **⚡ Instant Comment-to-DM Fulfillment**: Sub-500ms webhook ingestion with idempotent background dispatch.
- **🛡️ 3-Layer Duplicate Protection**: Database unique constraints eliminate race conditions and double-sends without external queue overhead.
- **🤖 LangGraph & LangChain Engine**: Explicit StateGraph orchestration with typed state, pure routing functions, and node-by-node execution tracing.
- **🔒 Deterministic AI Guardrails**: Strict URL/contact filtering with instant fallback to static templates on any LLM or guardrail anomaly.
- **📊 Real-time Observability**: Node-by-node run trace (`execution_steps`) visible directly in the execution audit drawer.
- **🎭 Dual Mode (Production & Mock)**: Complete end-to-end testing and demo workflow with simulated webhooks and failure injection modes (`[fail]`, `[ratelimit]`, `[expired]`, `[inject]`, `[llm-timeout]`).

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Framer Motion, Supabase Auth.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, httpx, cryptography (Fernet), LangGraph, LangChain.
- **Database & Auth**: Supabase PostgreSQL 15+ with Row-Level Security (RLS) policies.
- **Testing**: pytest, pytest-asyncio, respx, Vitest, React Testing Library.

---

## 📂 Project Structure

```
autodm/
├── frontend/             # React 18 + Vite + Tailwind + Radix UI
├── backend/              # FastAPI + LangGraph + LangChain engine
│   ├── app/
│   │   ├── api/          # Route handlers & dependencies
│   │   ├── core/         # Config, security (Fernet, JWT), error handling
│   │   ├── services/     # Business rules & facades
│   │   ├── integrations/ # Instagram & Mock adapter implementations
│   │   ├── repositories/ # Direct database access layer
│   │   ├── agents/       # LangGraph StateGraph, nodes, chains & guardrails
│   │   └── workers/      # Background recovery & webhook tasks
├── database/
│   ├── migrations/       # Plain SQL schema migrations
│   └── seed/             # Demo seeds
└── docs/                 # System architecture, API specs & guides
```

---

## 🚦 Quick Start

### 1. Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- Supabase project (or local PostgreSQL)

### 2. Environment Setup
```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 3. Local Development
```bash
# Terminal 1: Backend
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## 📄 License
MIT © AutoDM
