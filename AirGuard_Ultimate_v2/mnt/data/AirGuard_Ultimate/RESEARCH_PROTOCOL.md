# AirGuard Research Protocol — Product + Validation

## Working title
**AirGuard: Constraint-Aware Air-Quality Decision Support for Lower-Exposure Activity Scheduling**

## Primary research question
Can hourly PM2.5 forecasts, combined with real scheduling constraints, identify feasible activity windows with lower modeled concentration-time exposure than fixed or user-planned times?

## Secondary school-mode question
Can multi-activity schedule optimization lower the total modeled PM2.5 concentration-time exposure proxy for a school day compared with a fixed outdoor timetable while preserving all required activities?

## Current product data
Public mode uses modeled air-quality and weather forecasts. The app should be described as location-aware, not hyperlocal.

## Core algorithm
For a user-selected date, duration, earliest start, and latest finish:
1. create every feasible start time at 15-minute increments;
2. map each segment of the candidate window to the corresponding hourly forecast value;
3. calculate mean modeled PM2.5;
4. rank candidates by PM2.5;
5. present weather/UV practical flags separately;
6. compare the selected window with a user-selected baseline time.

## Relative exposure proxy
`mean PM2.5 × duration × activity factor`

This is not inhaled dose. The activity factor exists only to weight more active events when comparing schedule alternatives inside the product.

## Evaluation A — historical decision simulation
For at least 30–90 days of historical hourly PM2.5 data:
- define one or more fixed baseline schedules;
- run the AirGuard optimizer using only information that would have been available for that day;
- calculate modeled proxy difference;
- report median, IQR, range, and percentage of days with a meaningfully lower window.

Avoid cherry-picking only smog days.

## Evaluation B — forecast performance
Where independent observations exist, calculate:
- MAE;
- RMSE;
- R² (with cautious interpretation);
- error distribution during high-PM2.5 periods;
- bias (mean forecast minus observed).

Use chronological evaluation, not random leakage-prone splitting.

## Evaluation C — school pilot
At one or more schools:
1. place a calibrated/quality-checked outdoor PM2.5 sensor in a documented location;
2. record observed school-hour PM2.5;
3. generate AirGuard schedules before the relevant activities;
4. record whether each recommendation was followed;
5. compare observed concentrations during completed shifted activities with the school's prespecified baseline schedule.

The app's built-in Impact Log can record completed decisions, and Sensor Lab can analyze exported sensor CSV files.

## Outcomes that are defensible
- forecast error;
- modeled or observed PM2.5 during activity windows;
- modeled concentration-time proxy difference;
- number of activities successfully rescheduled;
- user/school adherence to recommendations;
- usability feedback.

## Claims to avoid
- prevention of asthma or cardiovascular disease;
- diagnosis or personalized medical risk;
- “safe air” claims;
- direct causal health benefits from an observational pilot;
- claiming that a coarse modeled forecast measures a particular school gate.

## Recommended figures
1. System architecture.
2. Example 24-hour PM2.5 forecast with candidate windows.
3. Personal planner optimization example.
4. School Mode schedule before vs optimized.
5. Distribution of proxy differences over evaluation days.
6. Forecast vs observed sensor scatter/time-series.
7. Pilot adherence/impact flow.

## Reproducibility
The public build uses pure JavaScript decision logic in `core.js`. The automated tests in `tests/core.test.mjs` should be run before every competition or research submission.
