# OS_SUMMARY.md — Quick Guide
- This Project OS lives in `/ai-os/` and governs AI behavior for the Ebuuhia integration library. File precedence: `ai-rules.md` → `ai-context.md` → `ai-workflows.md` → `ai-roadmap.md`. Summaries do not override rules.
- Chat commands: `chat init` (load all OS files at session start; respond by confirming OS load, one-sentence project summary, rule adherence, and ask "What do you want to work on?"), `chat resync` (reload during a session; respond by confirming re-sync, noting relevant OS changes, and continuing the task concisely).
- Scope: Node.js + TypeScript, server-side library to integrate with Ebuuhia. Initial focus on read flows (items, deliveries, inventory); write flows (create delivery, etc.) come next as the API is learned.
- Safety/autonomy: moderate-to-strict. Validate inputs, handle errors clearly, retry transient failures, avoid leaking secrets/PII. Follow `DEV_GUIDE.md`; do not modify it.
- Captures: store request/response samples in `docs/ebuuhia-api-templates/<request-name>/`. Dev captures may contain secrets locally; never commit secrets or PII. Redact for production/shared use.
- Config: env-driven (base URL, auth, timeouts, retry limits); dev defaults now, production hardening added when requested.
