# AirGuard v2.0 QA Report

## Automated checks completed
- `node --check core.js` — passed.
- `node --check app.js` — passed.
- `npm test` — 9/9 tests passed.
- Static DOM ID validation — no missing static IDs referenced by application code.
- Manifest JSON parsed successfully.
- Required project files present.

## Unit-test coverage
The zero-dependency test suite currently verifies:
1. AM/PM time formatting.
2. Relative exposure-proxy arithmetic.
3. Personal lower-PM2.5 window selection.
4. Percentage reduction calculation.
5. Natural-language parsing of date/duration/time windows.
6. Non-overlapping School Mode optimization.
7. Sensor-record analysis.
8. Football/child and ventilation query parsing.
9. Preservation of a 20-minute school activity duration.

## Performance check
A six-activity school optimization over an eight-hour school day completed successfully in a local Node benchmark. Exact time varies by device; the feature is capped at six simultaneous activities to keep the browser workload bounded.

## External API validation
The Open-Meteo request fields and endpoints used by the app were checked against the current official Air Quality, Weather Forecast, and Geocoding API documentation.

This development container does not provide reliable outbound browser networking, so a final live-network smoke test should be performed immediately after Vercel deployment. The application is designed to fall back to a clearly labeled cached forecast, or clearly labeled demo data when neither live nor cached data is available.

## Claims QA
The interface deliberately avoids:
- “safe time” claims;
- diagnosis or disease prediction;
- presenting modeled concentration as street-level measurement;
- describing the current public forecast as hyperlocal;
- presenting the exposure proxy as inhaled dose.
