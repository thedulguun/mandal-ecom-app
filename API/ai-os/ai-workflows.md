# ai-workflows.md — Standard Operating Steps

## Chat Routines
- Start of session: run `chat init` to load `/ai-os` files.
- After `chat init`: respond by confirming OS load, giving a one-sentence project summary, confirming rule adherence, and asking "What do you want to work on?" Keep it concise; no file dumps or unsolicited plans.
- If misaligned or after changes: run `chat resync`.
- After `chat resync`: confirm re-sync, mention any OS changes relevant to the task, and continue without resetting context or writing an essay.

## Capturing Ebuuhia Traffic
1) Use the browser devtools/network tab while performing actions on Ebuuhia’s site.  
2) Save request and response bodies (and relevant headers) into `docs/ebuuhia-api-templates/<request-name>/`. Include a README note if the capture is partial.  
3) Keep dev captures local; never commit secrets or live PII. If preparing for production or sharing, strip/redact secrets and PII before committing.

## Adding or Updating an Endpoint
1) Gather inputs/outputs from captures; note auth, required fields, and response shapes.  
2) Define/adjust TypeScript types/interfaces for request and response payloads.  
3) Implement/extend the typed client function (e.g., `getItems`, `getDeliveries`, `getInventory`, later `createDelivery`, etc.) that:
   - Validates inputs (light schema or manual checks).
   - Builds the request with proper auth/headers.
   - Calls the lower-level request helper.
   - Parses/returns a typed result or a structured error.  
4) Keep a lower-level `request` helper that accepts path/method/body/headers for exploratory or yet-unsupported endpoints.  
5) Add minimal tests or stubs where feasible (e.g., mock fetch) to avoid hitting real endpoints in dev by default.  
6) Document any new assumptions and update captures if response shapes change.

## Configuration
- Use env vars for runtime settings: base URL, auth token/API key, timeout, retry limits. Provide sensible dev defaults; do not hardcode production secrets.
- Centralize config in a small module; read env once, validate, and expose typed config to the client and helper.

## Error Handling & Logging
- Classify errors: validation, auth, client (4xx), server/transient (5xx/network).  
- Retry transient cases with capped backoff; avoid retries on validation/auth errors.  
- Log enough context to debug without leaking secrets. In dev, PII may be present locally; when hardening, mask or omit PII in logs.

## Production Hardening (when requested)
- Separate envs (dev/stage/prod) with distinct credentials and base URLs.
- Ensure no secrets/PII in committed captures or logs.
- Consider rate limiting, circuit breaking, and structured logging.
- Add more rigorous validation and monitoring hooks as the surface grows.

## Governance
- Any change to scope, workflows, or assumptions requires updating `OS_SUMMARY.md` and `PROJECT_SUMMARY.md` immediately.
- Do not modify `DEV_GUIDE.md`; ensure workflows stay compatible with it.
