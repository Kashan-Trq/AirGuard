# AirGuard Privacy Design

AirGuard is designed to work without an account.

## Stored on the user's device
The following are stored in browser local storage:
- chosen location;
- Care Circle name/relationship;
- most recently saved forecast cache;
- saved/completed AirGuard plans and their modeled comparison metrics.

## Not intentionally sent to an AirGuard server
This static build has no custom analytics backend and no user database. Care Circle and impact-log content are not intentionally transmitted to an AirGuard server.

## External data requests
The browser contacts Open-Meteo services to retrieve:
- location search results;
- modeled air-quality forecasts;
- weather forecasts.

If the user chooses “Use my device location,” browser geolocation is requested and the resulting coordinates are used to fetch environmental data.

## Sensor Lab
Sensor CSV analysis happens locally in the browser. The selected file is read by JavaScript and is not uploaded by this static build.

## Clearing data
Users can clear the impact log from the interface. Browser site-data controls can remove all remaining local AirGuard storage.
