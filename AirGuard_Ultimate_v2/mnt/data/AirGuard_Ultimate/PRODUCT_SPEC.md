# AirGuard Product Specification — v2.0

## Positioning
**AirGuard is an air-quality decision operating system, not an AQI dashboard.**

The product is optimized around a narrow question: *What decision can a person or institution change today to reduce modeled pollution exposure while still doing what they need to do?*

## User groups
1. Families planning children's outdoor time.
2. Students and athletes planning walks/runs/sports.
3. School administrators scheduling assembly, recess, and PE.
4. People deciding when to ventilate a home or classroom.
5. Commuters with flexible departure times.
6. School research pilots using low-cost PM2.5 sensors.

## Differentiated product loop

**Need → constraints → forecast search → one decision → completion → impact evidence**

The defensible differentiation is the full loop, especially:
- natural-language constraint extraction;
- non-overlapping multi-activity school scheduling;
- completion-based local impact ledger;
- sensor CSV analysis in the same public app;
- a transparent objective instead of an unexplained wellness score.

## Signature object: One Better Hour
Each day, AirGuard surfaces one 60-minute period with the lowest modeled PM2.5 in the practical 06:00–22:00 range. This is deliberately easy to remember, explain, demo, and measure.

## Decision confidence
AirGuard includes a **decision stability score**, not forecast-model confidence. It reflects:
- completeness of candidate windows;
- separation between the best and second-best window;
- how much PM2.5 varies across the user's available range.

It must never be described as probability that the forecast is correct.

## Personal planner objective
Primary objective:
1. enumerate 15-minute start times;
2. retain only windows that fit the user's constraints;
3. estimate mean PM2.5 using the hourly forecast that covers each 15-minute segment;
4. choose the lowest mean PM2.5;
5. show rain/heat/UV as separate practical flags.

## School Mode objective
For up to six activities:
- normalize each duration to 15-minute schedule slots;
- generate every feasible interval inside the school day;
- prevent interval overlap;
- minimize the sum of activity-weighted PM2.5 × duration proxies across all activities.

This is solved with a memoized search over occupied schedule slots, so the output is deterministic and reproducible for the supplied inputs.

## Emotional design principles
AirGuard should not use fear as the main engagement mechanic.

It emphasizes:
- agency: “one better window”;
- care: “who are you planning for?”;
- completion: plans only become impact after the user marks them done;
- honesty: forecasts can be wrong and no period is declared safe.

## Evidence model
The product can generate application/competition evidence without inventing impact:
- completed plan count;
- completed better-air minutes;
- modeled concentration-time proxy difference;
- exported school schedules;
- local sensor analysis;
- future observed forecast-vs-sensor error.

## What AirGuard intentionally does not build
- medical diagnosis;
- asthma-risk prediction;
- fake “AI” chat backed by a language model;
- street-level clean-route claims without sufficiently resolved pollution data;
- social accounts or surveillance-heavy tracking;
- a proprietary black-box “health score.”
