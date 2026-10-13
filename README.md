# AirGuard — professional air-quality decision support

> **Your air. Your choices.** An installable, privacy-first, zero-dependency Vercel web app for making daily choices around *modeled* urban air-quality forecasts in Pakistan.

## What is actually implemented

- **Air overview:** selected city's real provider-derived US AQI, PM2.5, PM10, NO₂, 24/48/72-hour native SVG chart, provenance and CSV export.
- **AirTwin:** automatically compares 1–4-hour activities in the next 12/24/48/72 hours. The output is a lowest-forecast-PM2.5 **time window**, alternatives, an explicit earliest-possible baseline and transparent theoretical inhaled-mass arithmetic. Unsupported gaps are refused.
- **Ask AirGuard:** source-grounded deterministic question answering for common air-quality, outdoor planning and protection questions. It **does not** use or claim an LLM, general Google-like web search, or paid API.
- **Family Shield:** selected household concerns; English and Urdu practical messages and a draft note for schools, workplaces or authorities; copy, TXT export and user-initiated WhatsApp share.
- **Community Action:** actionable request templates, privacy-respecting **personal** action checklist and counters that never impersonate verified community impact.
- **Science & privacy:** full methodology, WHO/source links, live provenance, browser-data deletion and honest accuracy limitations.
- **Offline-friendly PWA:** installable shell, last retrieved forecast labeled **CACHED** during outages. No fabricated numbers.
- **No subscriptions required for the code itself:** no database, no paid AI, no npm dependencies, no analytics.

## Deploy to Vercel

1. Create a GitHub repository and put all project files in the **repository root**, with `index.html` at the root.
2. Vercel → Add New → Project → import repository.
3. **Framework preset: Other**. **Root directory: `./`**, **Build command: leave empty**, **Output directory: leave empty**. The `api/air.js` file is a Node.js Serverless Function.
4. Deploy. Check `/api/air?city=lahore`. It should return JSON with `modelBased: true` and a `points` array when the provider responds.
5. Open the site and test one AirTwin calculation, one Answer, one Family Shield letter, and mobile navigation.
6. **Non-commercial use only** with the free Open-Meteo API, within its limits and attribution requirements. Check updated terms before scaling or monetizing.

## Local development — no `npm install` needed

Requirements: **Node.js 20+**.

```sh
npm run dev
# http://127.0.0.1:3000
npm run check
```

The dev server uses the same serverless handler as Vercel. If network access is unavailable, forecast requests return a clear 503. Data is never substituted with fake demo readings in production.

## Tests

```sh
npm test
npm run check
```

Tests cover city validation, AQI thresholds, normalization, missing data, optimizer ranking, consistent duration, unsupported questions, English/Urdu letters, provider failure, and serverless success.

## Why this project is different

The purpose is **decision → conversation → social action**, rather than a graph of AQI alone. It helps a caregiver plan a necessary task, gives a transparent reasoning trail, and makes a respectful clean-air request easier to send. This purpose is meaningful; **novelty, clinical validity, real-world effectiveness, adoption and social impact have not been established**. See `docs/impact-validation.md` for a small ethical pilot.

## Important limitations

- Open-Meteo CAMS global atmospheric model, roughly **45 km spatial grid** for Pakistan. *No street-level routing or sensor-confirmed exposure claims.*
- PM2.5 inhaled-mass computation uses **illustrative** inhalation-rate assumptions, not measured dose, individualized medical risk or prediction accuracy.
- WHO 2021 24-hour PM2.5 limit (15 µg/m³) cannot be used to label an *hour* "safe".
- Community checkmarks and personal counts stay on the same device; not network-wide.
- Site forecasts are a third-party dependency. Cloud and API providers can change terms and limits; **software cannot be permanently maintenance-free**.
- The Q&A is rule-based, not a generative AI model. No hallucinated articles or subscription fees.
- This is not a medical device and is not for emergencies. Follow official advisories, independent monitors and medical advice where needed.

## Sources and data license

- Open-Meteo [Air Quality API](https://open-meteo.com/en/docs/air-quality-api) and [terms](https://open-meteo.com/en/terms), CC BY 4.0 data attribution, non-commercial fair-use API limits.
- [Copernicus Atmosphere Monitoring Service](https://atmosphere.copernicus.eu/).
- WHO Global Air Quality Guidelines (2021), [guideline table](https://www.ncbi.nlm.nih.gov/books/NBK574591/table/ch3.tab26/).

## Product ethics and contribution

Open source project code is released under MIT in `LICENSE`. It does not relicense Open-Meteo or Copernicus source data, which remain subject to their own terms. The project is designed for student-led public-interest pilots and future co-design with affected communities.

## Maintenance release: 2.2.0 (October 2026)

This version removes promotional-style banners, the decorative quote, and marketing headlines. The home view now contains a second working PM2.5 chart and a data-provenance panel. Third-party ad services are not included; the Vercel CSP restricts external scripts and frames. See `PROFESSIONAL_DESIGN.md`.

## Previous maintenance release: 2.1.0 (October 2026)

The 2.1 audit fixed question classification, tomorrow's calendar-day comparison, planner horizon enforcement, saved-plan visibility, offline question-answering, cache transparency, data export metadata, the privacy reset, pop-up handling, and PWA installation icons. See [`QA_REPORT.md`](QA_REPORT.md) for verification evidence, identified limitations, and a Vercel acceptance checklist. **Deploy v2.2 instead of v2.0 or v2.1.**
