## 2.2.0 — Formal research-oriented interface

- Removed marketing-like blocks, decorative banners and slogans.
- Added a usable PM2.5 forecast chart, alongside AQI.
- Added source provenance in the overview rather than decorative art.
- Restrictive CSP prevents unexpected off-origin ad scripts and frames on Vercel.
- Neutral copy throughout; functional workflows preserved.

# Changelog

## v2.1.0 — Quality and reliability release (13 October 2026)

- Fixed misunderstanding of school action, family safety and tomorrow forecast questions.
- Limited planner recommendations to full-duration future windows within the selected horizon.
- Removed stale results when planner inputs change.
- Replaced the saved-plan toast with viewable, removable, shareable saved plan details.
- Enabled general air-quality Q&A even when the model provider is unavailable.
- Added cached-data warnings to family messages and draft letters.
- Added provenance columns in exported CSV forecasts.
- Fixed local-data erasure so visible state is immediately reset by reloading.
- Added an explanation and copy fallback for blocked WhatsApp pop-ups.
- Added automatic refresh on returning to a tab after the forecast becomes older than 30 minutes.
- Added PNG PWA icons to support installation on more browsers.
- Added regression tests and browser-interaction verification; see QA_REPORT.md.
