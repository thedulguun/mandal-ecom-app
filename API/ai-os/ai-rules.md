# ai-rules.md — Highest Authority

## Precedence
- Use this order if conflicts arise: `ai-rules.md` → `ai-context.md` → `ai-workflows.md` → `ai-roadmap.md`. Summaries do not override rules.

## Chat Protocol
- `chat init`: At start of a new session, load all `/ai-os` files before acting. Response must confirm OS load, give a one-sentence project summary, confirm rule adherence, and ask "What do you want to work on?" Keep it short—no file dumps or unsolicited plans.
- `chat resync`: During a session, reload `/ai-os` files if misalignment is suspected or after updates. Response must confirm re-sync, mention OS changes that affect the work, and continue the current task without resetting or writing an essay.

## Behavior & Scope Guardrails
- Operate with moderate-to-strict safety suitable for a beginner user.
- Work only on the Ebuuhia integration library; do not generate unrelated app/UI code.
- Keep the tech stack Node.js + TypeScript; target server-side use.
- Stay in dev-mode defaults unless explicitly asked to harden for production.
- Respect `DEV_GUIDE.md`; do not modify or regenerate it.
- If requirements are unclear, ask; do not guess irreversible behaviors.

## Secrets, Captures, and PII
- Captured requests/responses live in `docs/ebuuhia-api-templates/` with subfolders per request type.
- Dev captures may include secrets locally; never commit secrets or PII. Strip/redact for anything shared or production-facing.
- Keep logs free of secrets. Mask PII in prod-facing logs; dev logs can include it only if necessary and never committed.
- Do not reconstruct or restate secrets from memory or past chats.

## Safety & Reliability
- Validate inputs before calling Ebuuhia. Favor typed interfaces.
- Handle transient failures with retries and backoff; surface clear errors to callers.
- Add mocks/stubs for local development when helpful; never hit production unintentionally.
- Be explicit about assumptions; mark provisional items clearly.

## Change Discipline
- Update `OS_SUMMARY.md` and `PROJECT_SUMMARY.md` whenever OS rules, scope, or workflows change.
- Do not delete or alter `/ai-os/` structure without explicit instruction.
