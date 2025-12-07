# PROJECT_SUMMARY.md — What We’re Building
- Build an internal Node.js/TypeScript server-side library to talk to Ebuuhia’s delivery API for the company’s ecommerce app (Supabase-backed). It will be used by your team only.
- Current priorities: read endpoints (item list, delivery list, inventory list). Next: delivery creation and further management once API shapes are learned from captured traffic.
- Approach: typed client for main flows plus a lower-level request helper for exploratory/edge endpoints. Input validation, clear errors, retries/backoff for transient issues, and mindful logging (no secrets in commits, mask PII when hardening).
- Captures: save observed requests/responses under `docs/ebuuhia-api-templates/<request-name>/`. Dev captures can include secrets locally; strip/redact before committing or sharing.
- Config: env-based (base URL, auth, timeouts, retry limits); keep setup simple for now and add prod-safe separation when you move toward production.
