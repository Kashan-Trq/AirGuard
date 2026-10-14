# AirGuard v3.0 — Final code-level quality assurance

**Release scope:** This report describes test results obtained against files in this source package. No verified production launch or measured social impact is claimed.

## Automated test results

| Check | Result | What was exercised |
|---|---|---|
| Node native unit/API checks | **37 / 37 passed** | Forecast normalization, AQI bands, activity window logic, city constraints, API status/JSON, error paths, invalid dates, timeouts, cancellation, payload validation, bilingual letters, privacy and UI code checks |
| Desktop Chromium interactions (1380px) | **21 / 21 passed** | Navigation, charts, download, planner, saving, all main UI features, city change, refresh |
| Mobile Chromium interactions (390px) | **21 / 21 passed** | As above, including bottom navigation and touch-sized controls |
| Narrow mobile Chromium interactions (320px) | **21 / 21 passed** | As above, after correcting scroll obstruction |
| Tablet Chromium interactions (768px) | **21 / 21 passed** | As above, no horizontal overflow |
| Browser failure/recovery simulations | **4 / 4 passed** | HTML server error + direct-provider recovery, total outage, malformed JSON, retry after outage |

Total: **125 distinct automated assertions/workflow checks passed** across the listed runs. This is a **test count**, not a count of independent features or proof of zero defects. Browser test inputs were explicitly synthetic and local to the QA harness; **the application has no fake-data mode in production**.

## Defects fixed in this release

1. **Shared request deadline:** when the same-origin function hung, the fallback request could inherit an already-aborted signal. Fixed by independent abort controllers/deadlines, preserving genuine user cancellation.
2. **Invalid upstream dates:** malformed calendar timestamps could cause date-formatting exceptions. Invalid dates are now dropped.
3. **Incomplete current data:** if `current` is missing entirely, the nearest valid hourly model point within ninety minutes is used and labeled as an hourly model estimate, never described as a ground-sensor reading. Explicitly invalid current values stay null.
4. **Corrupted persisted forecasts:** cached data now must pass a structural/numeric validator and have a sane storage timestamp.
5. **Excessively old cached forecasts:** cached datasets expire after 12 hours; AirTwin will not calculate on stored forecasts older than 3 hours.
6. **Question assistant using old data:** expired cached forecasts are excluded from Q&A comparisons; general educational answers continue to work.
7. **Mobile fixed navigation obstructed controls:** mobile scroll position/margin adjustments keep actionable controls tappable at common screen widths.
8. **Small-screen smooth-scroll instability:** stopped global smooth scrolling on narrow screens while preserving functional navigation.
9. **Local image MIME handling:** standalone Node development server now serves PNG icons correctly.
10. **Unclear backup provider privacy disclosure:** methods page now states that direct-fallback requests contact Open-Meteo from the browser and may disclose the caller's IP.
11. **Raw Markdown impact plan:** public-facing research pilot plan now has a styled, mobile-friendly HTML page.
12. **Old PWA cached assets:** the service worker cache namespace was bumped to v3.0.
13. **Release documentation:** reconciled version strings and deployment troubleshooting with the actual package.

## Pages and functions manually exercised in Chromium

Air Overview (both SVG graphs and 24h/48h/72h selections, metrics and CSV), AirTwin (all activity inputs, result, alternatives, copy, save/view/hide/remove), Ask AirGuard (five suggestions, typed question, copy), Family Shield (three household flags, English and Urdu institutional letters, download, copy, read-aloud invocation, WhatsApp handoff invocation), Community Action (three institutional drafting shortcuts, four checkboxes), Methods (CSV, source disclosures), city selector, refresh, mobile navigation and active error notifications.

## Deliberately limited or not verified

- **Live Vercel deployment:** not accessible from the QA environment. Serverless route startup, CDN/edge caching, platform permissions, and production function logs must be verified using the checklist.
- **Live provider response:** Open-Meteo connectivity was blocked in the QA runtime. Accurate modeled values and future uptime have **not** been certified.
- **Cross-device permissions:** speech playback, real WhatsApp launch and clipboard on different mobile operating systems may be blocked by browser permission settings. The tests verified handlers and fallback UI paths with controlled browser stubs.
- **Service worker installation on public HTTPS:** source and cache version tested, but actual installability/offline mode on a deployed domain remains to be confirmed.
- **Security claims:** CSP, no third-party advertising scripts, and minimal data storage were reviewed. This is not a professional penetration test.
- **Science/impact:** no trained original forecasting model, health outcome trial, or independently measured environmental improvement is claimed.

**Outcome:** Code-level release candidate passed the tests above. A permanent bug-free guarantee is impossible; external APIs, hosting services, browser behavior and policies may require updates in the future.
