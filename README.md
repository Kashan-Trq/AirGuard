# AirGuard 3.0 — stable, standalone Vercel release

AirGuard is a **public-interest air-quality decision-support web app** for 12 Pakistani cities. It compares outdoor activity times using **modeled hourly PM2.5**, produces source-conscious family guidance and formal school/workplace requests, and keeps individual preferences local. It is **not** a health device, emissions-reduction instrument, street-level air sensor, general web search engine, or verified social-impact intervention.

## Single-project setup

The ZIP is the whole project. Do not upload ZIP files *inside* a GitHub repository: **extract it, then place its contents in the repository root**, so `index.html`, `app.js`, `app.css`, `api/`, `lib/`, `assets/`, and `vercel.json` are siblings. Deploy through Vercel with **Framework Preset: Other**, **Root Directory: `./`**, **no overridden Build Command**, and **no Output Directory override**. No environment variables, paid API key, database, npm installation or build step is required for this project.

If Vercel already hosts an older AirGuard version, commit **all files** and redeploy the new commit; avoid uploading only `index.html` because `/api/air` and `/api/health` must also be deployed. Allow a hard refresh after deployment. The service worker uses a new versioned cache to retire the previous release's app shell.

## Release acceptance checklist

1. Visit `https://YOUR-DOMAIN/api/health`. Expect JSON with `"status":"ok"` and `"version":"3.0.0"`.
2. Visit `https://YOUR-DOMAIN/api/air?city=lahore`. Expect real normalized forecast JSON with `"modelBased":true`, or JSON `503` with `"code":"UPSTREAM_UNAVAILABLE"` if the provider is unavailable.
3. On the homepage, verify that AQI and PM2.5 charts load and the city picker, all three chart ranges, and CSV download work.
4. Open AirTwin and calculate a plan; save, open, copy and delete it. Then change the city and plan again.
5. Ask the five sample questions and an unsupported question. The assistant is transparent, deterministic and **not an LLM**.
6. In Family Shield test household groups, Urdu and English notes, the text download, and optional read-aloud/WhatsApp sharing on your device.
7. In Community Action test all three institutional links and personal checklist. In Methods test data export, privacy disclosure and local-data erasure.
8. On a phone, verify controls remain tappable above the fixed bottom navigation.

## Local verification

Node.js 20+ is required for the *local test server*, but not for the Vercel static frontend. No third-party npm dependencies are installed.

```bash
npm run check
npm run dev
```

Open `http://127.0.0.1:3000`. Local API handlers are identical to the source used by Vercel. Optional Chromium interaction testing (requires Python Playwright and system Chromium; no Playwright dependency is required to run the application):

```bash
python tests/browser_qa.py
python tests/browser_failures.py
```

Use `python tests/browser_qa.py --all` to exercise 1380px, 768px, 390px and 320px layouts. These browser tests mount the **actual frontend source** in an isolated document and intercept forecasts with test-only fixtures because network navigation is restricted in the test environment; they do **not** certify Vercel infrastructure or forecast accuracy.

## Six functional areas

- **Air Overview:** AQI, PM2.5, PM10, NO₂, regional modeled forecast charts, timestamp, provider and CSV export.
- **AirTwin:** transparent ranking of complete 1–4-hour activity windows, 12–72-hour horizon, modeled inhaled mass comparison, save/view/copy/delete.
- **Ask AirGuard:** documented air-quality Q&A, honest unsupported answers, calendar-day comparisons only when sufficient forecast data exists.
- **Family Shield:** practical generic advice, bilingual English/Urdu institutional notes, copy, download, speech if supported, WhatsApp handoff.
- **Community Action:** institution letters, private action checklist, transparent local-only activity counts and ethical pilot guide.
- **Methods & Privacy:** assumptions, WHO context, data provenance, export and erasure.

## Technical and ethical limits

- Forecasts come from the **Open-Meteo Air Quality API using CAMS Global**. Its effective spatial resolution in Pakistan is roughly **45 km**, not street-level exposure. The app does not train its own predictive AI model.
- The AirTwin comparison is a mathematical illustration. Assumed ventilation values are not measured individual breathing rates, clinical risk assessments, or proof that a timing change caused a health benefit.
- The assistant is a **rules-based knowledge interface**, not a replacement for all of Google Search. It cannot answer arbitrary questions or diagnose people.
- When the same-origin Vercel server route fails, the browser may request the same public Open-Meteo model endpoint directly. This discloses the browser IP and selected city coordinates to the provider. Do not describe this as entirely first-party-only network traffic.
- The free provider may restrict commercial use, quotas and permissible redistribution. See [Open-Meteo Terms](https://open-meteo.com/en/terms). Model data/source rights are separate from the MIT license on this project code.
- The model feed, Vercel hosting, user browser permissions and other external systems can change. **No application is guaranteed permanently maintenance-free.**
- WHO 2021 PM2.5 24-hour guideline (15 µg/m³) is **not an instantaneous threshold**.
- Real data was not available to the automated environment; browser test fixtures are *not shipped to production*. Real-world performance, live Vercel deployment, and forecast accuracy require post-deployment verification.

Full audit results: [QA_REPORT.md](QA_REPORT.md). Deployment failures: [DEPLOY_AND_DEBUG.md](DEPLOY_AND_DEBUG.md).
