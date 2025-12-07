# ai-context.md — Project Scope and Intent

## Purpose
Build a Node.js/TypeScript server-side library that integrates with Ebuuhia’s delivery API for the company’s internal ecommerce app (Supabase-backed). Initial focus is read flows (item list, delivery list, inventory list), followed by delivery creation and related actions as the API surface is learned.

## Scope
- In-scope: typed client for main flows, lower-level request helper for edge cases; request/response validation; error handling; retries/backoff for transient errors; logging mindful of secrets/PII; lightweight mocks/stubs for development.
- Out-of-scope: frontend/UI, general app features, unrelated services, regenerating or modifying `DEV_GUIDE.md`.
- Current mode: development-first; production hardening added when explicitly requested.

## Constraints & Assumptions (provisional)
- Runtime: Node.js 18+ with TypeScript.
- Execution: server-side only.
- Configuration: env-driven (base URL, auth, timeouts, retry limits); simple single-env defaults now, with room to expand to prod later.
- API knowledge is incomplete; endpoints inferred from captured fetch traffic.
- Captures stored at `docs/ebuuhia-api-templates/` by request type; secrets may exist locally for dev but must not be committed or shared.
- Logging: PII allowed in local dev only; plan to mask or omit for production.

## Non-goals
- No multi-tenant logistics orchestrator; this is for the company’s own deliveries.
- No persistence layer beyond what the host app already provides (Supabase).
- No production deployment automation until requested.
