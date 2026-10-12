# AirGuard School Pilot Playbook

## Goal
Test whether AirGuard can help a school shift outdoor activities toward periods with lower observed PM2.5 while preserving the activities themselves.

## Smallest credible pilot
- 1 school
- 1 outdoor PM2.5 sensor
- 10 school days
- 2–3 recurring outdoor activities (for example assembly, recess, PE)
- a prespecified usual timetable
- AirGuard recommendation generated before each school day

## Daily workflow
1. Confirm the sensor is operating and timestamped correctly.
2. Record the school's normal planned times before viewing AirGuard's recommendation.
3. Run School Mode for the same day and activity durations.
4. Record whether the school follows each recommended shift.
5. At the end of the day, export observed sensor data as CSV.
6. Use Sensor Lab to identify the observed lower-PM windows.
7. Mark only activities that actually occurred as completed in the Impact Log.

## Minimum spreadsheet columns
`date, activity, usual_start, airguard_start, actual_start, duration_min, followed_recommendation, observed_pm25_usual_window, observed_pm25_actual_window, notes`

## Primary pilot outcome
Difference in observed PM2.5 concentration-time proxy between the actual completed activity window and the prespecified usual timetable.

## Secondary outcomes
- percentage of recommendations followed;
- number of activities successfully shifted;
- teacher/admin usability rating;
- forecast error vs the local sensor;
- reasons recommendations could not be followed.

## Integrity rules
- Do not remove days because the recommendation was inconvenient.
- Do not call a lower-PM window “safe.”
- Keep the school's usual timetable documented before analysis.
- Record failures and non-adherence.
- Document sensor model, placement, height, calibration/quality checks, and missing data.

## Simple outreach message
Subject: Student-built air-quality scheduling pilot for school outdoor activities

Hello,

I am developing AirGuard, a student-built tool that uses hourly PM2.5 forecasts to identify lower-pollution windows for activities such as assembly, recess, and PE. I am looking for one school willing to test a short pilot in which we compare the normal timetable with AirGuard's suggested timings and a local PM2.5 sensor. The project does not diagnose health conditions or label any time as safe; the purpose is to test whether better scheduling can reduce measured pollution exposure while keeping normal school activities.

The pilot can be kept small and the school can stop at any time. I would be happy to share the full methodology and results with the school.
