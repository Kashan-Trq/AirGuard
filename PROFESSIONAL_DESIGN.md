# AirGuard v2.2 — Professional interface update

## Advertising audit
The application source contains no ad-network SDK, tracking pixels, sponsored placements, affiliate links, or advertising iframes. The previous version *did* contain internal promotional design blocks and marketing-style copy that could feel like ads.

## Changes
- Removed the quote/promo block from the sidebar and substituted a compact provenance summary.
- Replaced the home-screen self-promotional feature panel with a second **real PM2.5 forecast chart**.
- Replaced the decorative heart/marketing graphic with useful source, model resolution, time, and cache status.
- Removed the story banner; retained access to Family Shield in navigation.
- Rewrote landing, assistant, planning, family, community and methods copy to use a research-oriented and neutral tone.
- Added a restrictive Content Security Policy on Vercel to block external scripts, iframes, images and cross-origin requests in the deployed app.
- Preserved the original functional ids and data attributes; updated regression assertions for the new section labels.

## Deployment caveat
A live site may show injected ads for reasons *outside this repository* (a third-party hosting wrapper, a browser extension, a custom domain parked by a provider, or a different live deployment). If those persist after deploying this version and clearing the service worker cache, inspect the URL and browser screenshot separately.
