# AirGuard

AirGuard is a Lahore-focused environmental decision-support web app. It converts modeled PM2.5 forecasts into lower-exposure outdoor activity windows rather than merely displaying an AQI number.

## What this build does

- Loads Lahore PM2.5, PM10 and US AQI forecasts from Open-Meteo's Air Quality API.
- Loads temperature, relative humidity, wind, precipitation and surface pressure from Open-Meteo's weather API.
- Ranks all contiguous activity windows inside a user-selected schedule.
- Recommends the available window with the lowest mean forecast PM2.5.
- Compares a planned time against the recommended time using a concentration × duration exposure proxy.
- Exports the current forecast as CSV.
- Clearly separates environmental decision support from medical advice.

## Important scientific wording

Do **not** call the current public forecast “hyperlocal.” For Lahore, the Open-Meteo air-quality feed is based on the CAMS global atmospheric-composition forecast, whose underlying grid is much coarser than a school-level sensor network. This build is location-specific decision support; a later research phase should validate against local sensors and/or an independently trained Lahore model.

The app never labels a period “safe.” It only ranks lower-exposure periods relative to other available forecast hours.

## Deploy to Vercel

This is a zero-build static project.

### Option A — GitHub
1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and `vercel.json` at the repository root.
3. In Vercel, click **Add New → Project** and import the repository.
4. Framework preset: **Other**.
5. Build command: leave empty.
6. Output directory: leave empty / root.
7. Deploy.

### Option B — Vercel CLI
From this folder:

```bash
npx vercel
```

No API key is currently required because this build calls public Open-Meteo endpoints from the browser.

## Local test

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Research roadmap

### Phase 1 — current build
Public CAMS/Open-Meteo forecast → AirGuard decision engine → lower-exposure activity window.

### Phase 2 — independent Lahore model
Build a reproducible historical dataset combining PM2.5 and weather, train a baseline/predictive model, and compare it with a persistence baseline using MAE/RMSE/R².

### Phase 3 — school validation
Place low-cost PM2.5 sensors at participating schools, compare modeled vs observed concentrations, and test whether schedule changes reduce the concentration-time exposure proxy.

### Phase 4 — publication
Report dataset provenance, prediction performance, intervention simulation, limitations, and real-world pilot results.

## Files

- `index.html` — product interface and content
- `styles.css` — responsive visual system
- `app.js` — live data, charting, optimizer, CSV export
- `vercel.json` — Vercel headers and static deployment config
- `RESEARCH_PROTOCOL.md` — paper/product research plan
- `PRODUCT_BACKLOG.md` — prioritized next features

## Disclaimer

AirGuard provides environmental information and decision support. It is not medical advice, a diagnostic tool, or a guarantee of safety.
