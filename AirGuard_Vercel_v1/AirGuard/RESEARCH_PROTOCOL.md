# AirGuard Research Protocol — v1

## Working title
**AirGuard: A Forecast-Informed Decision Support System for Lower-Exposure Outdoor Activity Planning During Lahore Smog Episodes**

## Core question
Can short-term PM2.5 forecasts identify lower-exposure windows for outdoor school activities, and how much could schedule shifting reduce a concentration-time exposure proxy relative to a fixed activity time?

## Product contribution
The novelty claim should **not** be “we invented PM2.5 forecasting.” AirGuard's contribution is the decision layer: forecast → schedule constraints → optimized window → transparent exposure-proxy comparison.

## Current public prototype
- Study area: Lahore, Pakistan.
- Primary environmental variable: PM2.5 concentration (µg/m³).
- Supporting variables: temperature, relative humidity, wind speed, precipitation and surface pressure.
- Forecast source: CAMS through Open-Meteo.
- Decision output: lowest-mean-PM2.5 contiguous activity window within user-selected constraints.
- Exposure proxy: PM2.5 × activity duration.

## Evaluation plan
### A. Product/algorithm evaluation
For a set of school-like schedules, compare:
1. fixed baseline activity time;
2. AirGuard-selected activity time;
3. percent reduction in the concentration-time proxy.

Report median, IQR and range of reductions across days. Do not present the proxy as inhaled dose.

### B. Forecast evaluation
When independent historical observations are available, compare the forecast against observations using:
- MAE
- RMSE
- R²
- error during high-pollution episodes

### C. Independent ML model
Train at least:
- persistence baseline;
- Random Forest or Gradient Boosting;
- optional XGBoost if available.

Use chronological splits, not random splits. Avoid future leakage when creating lag/rolling features.

## Stronger validation phase
Deploy at least one outdoor PM2.5 sensor at a school and, if feasible, one indoor sensor. Measure observed concentrations during school hours. Then evaluate whether AirGuard's chosen windows correspond to lower observed concentrations than the school's usual schedule.

## Claims to avoid
- “AirGuard prevents asthma.”
- “AirGuard identifies safe times.”
- “AirGuard is hyperlocal” before local sensors exist.
- “AirGuard diagnoses respiratory risk.”
- causal claims from weather-feature correlations.

## Recommended figures for the paper
1. System architecture diagram.
2. Lahore PM2.5 time series.
3. Hour-of-day PM2.5 profile.
4. Forecast vs observation plot.
5. Model performance table.
6. Feature importance / SHAP plot for the independent ML model.
7. Example daily AirGuard schedule recommendation.
8. Distribution of modeled exposure-proxy reductions.

## Minimum viable competition evidence
- working public URL;
- screen-recorded product demo;
- documented data source;
- reproducible decision algorithm;
- at least one quantitative evaluation table;
- limitations clearly stated;
- roadmap for local-sensor validation.
