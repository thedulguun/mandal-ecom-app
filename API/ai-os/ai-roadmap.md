# ai-roadmap.md — Direction

## Near Term
- Establish config module (env-driven) and shared request helper.
- Implement typed client scaffolding for read flows.
- Capture and document current Ebuuhia endpoints in `docs/ebuuhia-api-templates/`.

## Phase 1 — Read Flows
- Implement `getItems`, `getDeliveries`, `getInventory` using captured shapes.
- Add basic input validation and structured error handling.
- Provide simple mocks/stubs for offline dev where practical.

## Phase 2 — Write Flows
- Add `createDelivery` (and related updates/cancel if supported).
- Expand types and validation to match observed shapes.
- Add retry/backoff for transient failures; avoid retrying validation/auth errors.

## Phase 3 — Hardening (on request)
- Introduce distinct dev/stage/prod configs and secret handling.
- Mask/omit PII in logs; ensure no secrets/PII in committed captures.
- Consider rate limiting/circuit breaking and structured logging.
- Add monitoring hooks and tighter validation.

## Future Considerations
- Webhooks or polling strategies if Ebuuhia offers async updates.
- Bulk operations if supported.
- Documentation of breaking changes as the provider evolves.
