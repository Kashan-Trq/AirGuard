# AirGuard — Air Quality Decision OS

AirGuard is a Lahore-first, location-aware environmental decision-support product. Its job is not to show an AQI number and stop. It turns hourly air-quality forecasts into concrete decisions for families, schools, commuters, and outdoor activities.

## The product thesis

Most air-quality products answer **“What is the air like?”**

AirGuard is designed to answer **“Given what I need to do, when is the better time to do it?”**

Examples:
- “When should my younger brother play football tomorrow between 3 PM and 6 PM?”
- “What is the lowest-PM2.5 30-minute window for our school assembly?”
- “When should I open the windows today?”
- “If I can leave for a walk any time after 6 PM, when is the lower-exposure option?”

## Signature features

### 1. Ask AirGuard
A lightweight natural-language decision engine parses activity, date, duration, and time constraints and returns one practical lower-PM2.5 window. It is deliberately narrow and deterministic rather than pretending to be a general AI assistant.

### 2. One Better Hour
Every day, AirGuard finds the lowest modeled PM2.5 60-minute period between 6 AM and 10 PM. It is the emotional center of the product: the city may not become clean today, but one decision can still be better.

### 3. Constraint-aware activity planner
Searches every 15-minute start time that fits the user's allowed range. PM2.5 controls the primary ranking. Rain, heat, and UV are displayed separately as practical flags rather than hidden inside an opaque score.

### 4. School Mode
Schedules several outdoor school activities without overlap and minimizes the total modeled concentration-time exposure proxy across the school day. This turns air quality into an operations/scheduling problem rather than a dashboard problem.

### 5. Care Circle
Users can save who they are planning for (for example, “Mom,” “my brother,” or “Grade 6 students”). This changes the product language only; it does not change scientific thresholds or make medical claims.

### 6. Impact Log
A recommendation can be saved as a plan and later marked completed. Completed plans contribute to:
- number of lower-air plans completed;
- minutes of lower-air activity completed;
- modeled exposure-proxy units avoided compared with the chosen baseline time.

The impact metric is explicitly a planning metric, not a measured health outcome.

### 7. Sensor Lab
A school can upload a CSV containing observed PM2.5 data. AirGuard analyzes it entirely in the browser and identifies lower-PM2.5 windows. This makes the same public product usable for later pilot validation without rebuilding it.

### 8. PWA + offline resilience
AirGuard is installable. The app shell is cached, and the most recent forecast is kept locally so the interface remains useful when the network is unreliable. A cached forecast is clearly labeled.

### 9. Location search
AirGuard is Lahore-first but not Lahore-locked. The location picker uses Open-Meteo geocoding and can fetch modeled environmental data for other locations.

## Data sources

Public mode uses:
- Open-Meteo Air Quality API for modeled PM2.5, PM10, US AQI, NO2, ozone, dust, and UV.
- Open-Meteo Forecast API for temperature, apparent temperature, humidity, wind, precipitation, and pressure.
- Open-Meteo Geocoding API for place search.

These are modeled forecasts. AirGuard does not claim school-level hyperlocal accuracy without local sensors.

## Scientific guardrails

AirGuard does **not**:
- diagnose asthma or any disease;
- claim to prevent a health outcome;
- label a time as medically “safe”;
- claim that a modeled forecast equals observed street-level pollution;
- call its public forecast hyperlocal;
- present the concentration-time proxy as inhaled dose.

Primary comparison metric:

`relative exposure proxy = mean PM2.5 × duration × activity factor`

The activity factor is only used for relative scheduling comparisons and is not a clinical ventilation-rate model.

## Vercel deployment

This build has **no package dependencies and no build step**.

1. Create a GitHub repository, e.g. `airguard`.
2. Put every file from this folder in the repository root, including `tests/`.
3. In Vercel choose **Add New → Project** and import the repository.
4. Framework preset: **Other**.
5. Build command: leave blank.
6. Output directory: leave blank.
7. Deploy.

No API key or environment variable is required for the public build.

## Local run

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Automated tests

Node 18+:

```bash
npm test
```

The test suite covers the time formatter, exposure proxy, personal-window optimizer, natural-language parser, school no-overlap optimizer, and sensor analysis.

## Sensor Lab CSV format

Use one of these timestamp column names:
- `time`
- `timestamp`
- `datetime`
- `date_time`

and one of these PM2.5 column names:
- `pm2_5`
- `pm25`
- `pm2.5`
- `pm_2_5`

Example:

```csv
time,pm2_5
2026-10-12T07:00,48
2026-10-12T08:00,55
```

## Files

- `index.html` — complete interface
- `styles.css` — responsive UI
- `core.js` — pure decision algorithms
- `app.js` — API, UI, local storage, export and interaction layer
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker/offline shell
- `icon.svg` — app icon
- `vercel.json` — Vercel headers
- `tests/core.test.mjs` — zero-dependency automated tests
- `PRODUCT_SPEC.md` — product rationale and defensible differentiation
- `RESEARCH_PROTOCOL.md` — research/validation plan
- `PRIVACY.md` — privacy design
- `sample_sensor.csv` — Sensor Lab example
- `PILOT_PLAYBOOK.md` — small-school-pilot protocol and outreach template
- `DEMO_SCRIPT.md` — 90-second competition/product demo

## Important operational reality

No web product can honestly be promised to need “no future upgrades.” Public APIs change, browsers change, and real-world validation may reveal improvements. This build is intentionally designed as a complete submission-ready product with minimal infrastructure and no paid dependencies, so maintenance burden stays low.
