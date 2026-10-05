# AutoDM — Product Requirements Document (PRD) v1.1

## Product Overview
AutoDM is a comment-to-DM automation SaaS platform for social-media creators, businesses and agencies.
- **Document Version**: 1.1 (MVP) — adds LangGraph + LangChain automation engine
- **Timeline**: 7 days (solo developer)
- **Primary Platform (MVP)**: Instagram (via Instagram API with Instagram Login), with a Mock Social Adapter as the default demo mode.
- **Stack**: React + TypeScript + Vite, FastAPI (Python), Supabase (Auth + PostgreSQL), LangGraph (workflow orchestration) + LangChain (LLM layer).

---

## Architecture Summary
The comment → match → dedupe → (optional AI) → send → record workflow is a LangGraph `StateGraph` with typed state, conditional edges, a retry loop, Postgres checkpointing, and per-node tracing. LangChain supplies the model factory, prompt templates, and output parsing for two optional AI nodes: an intent gate and an AI-personalized reply generator. Deterministic code (matching, dedupe, sending, guardrails) stays in plain services; the LLM never acts, has no tools, and always falls back to the static template on failure.

---

## 25 Acceptance Criteria (PRD §39)
1. User can register (Manual + frontend test)
2. User can login (Manual + frontend test)
3. User can access dashboard (Protected route test)
4. User can create automation (API + UI test)
5. User can define trigger keyword (Form + API validation test)
6. User can define DM message (Form + API validation test)
7. User can define destination URL (https only validation)
8. Incoming comment can be received (Webhook integration test)
9. Trigger can be detected (Matcher unit tests)
10. Duplicate events are prevented (Dedupe tests incl. concurrency)
11. Execution is created (Integration test)
12. DM is sent through mock or real adapter (Integration test + demo)
13. Execution status is stored (DB assertion)
14. Dashboard displays result (Manual + UI test)
15. Errors are handled (Error-envelope tests, forced-failure demo)
16. Tests exist and pass in CI (CI badge)
17. README exists and is complete (§37 checklist)
18. Project can be deployed (Live URLs)
19. No secrets committed (gitleaks/manual history review)
20. Full flow demonstrable in < 5 minutes (Timed run of §38)
21. Every processed comment runs through the LangGraph `automation_graph` and writes a node-by-node trace (`execution_steps`)
22. An automation can use `reply_mode = ai`; the LangChain reply chain runs (mock or real LLM)
23. Guardrails block any URL/contact other than the configured link; AI or guardrail failure falls back to static message
24. Graph state is checkpointed in Postgres and a stuck run resumes without double-sending
25. AI preview works and the per-user daily cap is enforced; CI uses no real LLM
