# Architecture and threat model

## Components
1. `/index.html`, `/app.css`, `/app.js`: static, dependency-free frontend. All state is client-side.
2. `/lib/air-core.mjs`: shared tested calculation utilities; no access to secrets or storage.
3. `/api/air.js`: Vercel Node serverless function. City allowlist only; not an arbitrary-URL proxy.
4. Open-Meteo Air Quality API: retrieved by serverless function; Copernicus CAMS global model for Pakistan.
5. Service worker caches **static application shell only**. API calls use Vercel caching headers; last successful forecast may also be retained in browser localStorage and is marked stale when used as fallback.

## Trust boundaries
- Never take coordinate inputs directly into an upstream URL. Only allow a fixed city list. No SSRF proxy.
- Source payloads are normalized to known numeric or null fields. We don't interpolate missing hours.
- User questions and messages are inserted into HTML only through HTML-escaping or DOM `textContent`.
- Unknown or unsupported questions get an explicit no-answer response.
- No external fonts, tracking tags, map tile servers, analytics, ad scripts, or purchased AI calls.
- For external links, use `rel="noopener noreferrer"`.
- API failures return 503 without fallback numbers.

## Limits
- There is no independent machine-learning model trained by AirGuard. AirTwin is a transparent decision-support optimization on top of a third-party atmospheric model.
- The Open-Meteo CAMS global grid is approximately 45 km; individual street or commute-route differences are not resolvable.
- User-defined sensitivity categories do not calculate medical risks.
- Client localStorage is convenient, not encrypted; do not store private medical information there.
- A person using a shared device should clear local preferences via the Science page.
- Vercel and the data provider can change prices, usage limits or service terms, and outage recovery cannot be guaranteed.
