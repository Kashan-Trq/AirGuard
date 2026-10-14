# AirGuard v3.0 — Production diagnostic guide

## 1. Start with the two server endpoints

- `https://YOUR-DOMAIN/api/health` should return HTTP 200 JSON with `status=ok`, `apiRoute=ready`, `version=3.0.0`.
- `https://YOUR-DOMAIN/api/air?city=lahore` should return either HTTP 200 forecast JSON or HTTP 503 structured JSON with code `UPSTREAM_UNAVAILABLE`.

If **health returns 404, HTML, or a Vercel crash page**, the API folder was not deployed as functions. Check Vercel settings, the selected Git branch, root directory and `api/health.js` in GitHub. In Vercel Deployments, inspect the deployment's Functions/Runtime Logs and whether it is actually production.

If **health succeeds but air returns JSON 503**, the function is running but the third-party provider failed; check function logs and source quotas/connectivity. The UI attempts the same provider directly as a fallback. If both fail it intentionally shows `Source unavailable` and disables forecast-only planning.

If **health and air succeed but the UI still fails**, refresh once (Ctrl+Shift+R on desktop), check your browser's Network tab for `/app.js`, `/lib/forecast-transport.mjs` and `/api/air`, and verify the service worker updates to `airguard-shell-v3-0`. The browser's Clear Site Data function also removes personal saved plans; export needed data first.

## 2. Data-handling safeguards

- Invalid/HTML JSON responses never appear as raw `Unexpected token` parsing errors.
- A failed same-origin API request gets **its own time budget**; the direct-provider retry uses a separate timeout.
- No silent fabrication of measurements, error conversion to fake AQI, or replacement of negative values with zero.
- A cached forecast older than twelve hours is discarded. Recently cached forecasts remain visibly labeled; AirTwin refuses to use cached forecasts older than three hours.
- Browser location is **not** requested; city choice is manual. During direct-provider fallback, your IP is shared with Open-Meteo under its own privacy policy.

## 3. Local diagnostics

Node.js 20+:

```bash
npm run check
npm run dev
```

Then use `http://127.0.0.1:3000/api/health` to verify the same exported handler. Connectivity to the real provider is still necessary for live numbers.

## 4. What test results do and do not prove

Tests include Node calculations/API contract, isolated Chromium clicks at multiple viewport widths, and offline HTML-error/outage/retry simulations. The live public Vercel deployment and a live Open-Meteo response were inaccessible to the current testing environment; **a successful local test does not imply that either external service is online.**
