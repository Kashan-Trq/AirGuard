# AirGuard 2.1 — code audit and QA report

## What was inspected

Original user-provided package: `AirGuard_Ultimate_Vercel.zip`. All 22 original project files were inspected, with particular attention to `app.js`, the planner and assistant logic, the Vercel API route, PWA files, and existing automated tests. The audit produced this **separate corrected project**; the old zip remains unchanged.

## Confirmed defects corrected

1. **Question misclassification:** "How do I ask my school to act?" routed to family advice. Explicit civic requests now route to Community Action.
2. **Tomorrow question gave an incorrect timeframe:** "Is tomorrow less polluted?" previously matched a generic timing rule, or compared rolling 12-hour windows rather than the Pakistan calendar date. It now compares matched remaining daytime/clock-hour forecasts to tomorrow and declines when data is insufficient.
3. **Child health questions routed to exercise planning:** Vulnerable-group questions now prioritize appropriate care guidance, with uncertainty explained.
4. **Planner exceeded selected horizon:** Multi-hour windows could run past the selected 12/24/48/72-hour boundary. Activity duration must now be fully contained.
5. **Stale results persisted after form changes:** Changing duration, activity, or horizon now clears the previous displayed recommendation until the user recalculates.
6. **Last saved plan button appeared ineffective:** The old version showed a short toast and no visible saved-plan view. It now opens a readable plan card with copy and remove actions.
7. **Ask button disabled when source offline:** General air-quality education and community-help questions now work without live data; questions needing live data explicitly decline to invent an answer.
8. **Refreshing temporarily presented old data without cached labeling:** Retained data now stays marked cached until refresh succeeds.
9. **Cache status missing from shared family notes and letters:** Messages now explicitly mark data retrieved from cache.
10. **CSV exports omitted provenance:** Exports now contain retrieval timestamp, cached/fresh status, and the model source.
11. **Privacy erase did not reset the in-memory screen:** Erase now clears local AirGuard entries and reloads the interface.
12. **WhatsApp pop-up blocked silently:** When a pop-up fails to open, the app attempts to copy the text and explains what happened.
13. **Installed PWA had only an SVG icon:** Added 192px and 512px PNG icons and updated the cache version and manifest.
14. **Long-running mobile sessions may use stale data:** Returning to the app after 30 minutes now triggers a data refresh when feasible.
15. **Old forecast window could start slightly in the past:** Planner start times must be future times, not earlier than the current moment.

## Verified

- `npm run check`: **17 / 17 tests passed** after the initial fixes.
- Browser-based UI test via Chromium and a controlled, explicitly synthetic forecast feed: all six views and key actions exercised, including 24/48/72-hour chart controls; CSV download; plan calculation/save/view/delete; sample and typed Q&A; English/Urdu letters; family toggles; personal checklists; navigation to note drafts; city change; simulated forecast failure with cached fallback; mobile bottom-navigation actions. **0 uncaught JavaScript errors** in this scenario.
- No external paid service required for tests.

## Limitations, not concealed

- **Real provider calls are blocked in the test environment.** The live Open-Meteo/CAMS service and real-world forecast accuracy have **not** been verified from this environment. The API's 503 failure path works as expected.
- Chromium UI tests used a controlled in-page feed because direct browser navigation to the local HTTP server was blocked. This verifies frontend logic in a browser, but is not the same as a full public-deployment end-to-end test.
- **Live Vercel deployment has not been run**, so actual production routing, permissions, headers and serverless resource limits must be checked after deployment.
- WhatsApp handoff, installed-PWA behavior, microphone/read-aloud voices, and clipboard permissions depend on the user's browser, mobile operating system, and installed apps. These cannot be guaranteed across every device.
- The deterministic assistant is intentionally narrow. It is **not** a web-wide search engine or a paid LLM.
- Regional atmospheric model forecast resolution does not support street-level claims, health outcomes, or emergency use.

## Vercel production acceptance checklist

1. Deploy **this** folder at the Vercel repository root with Framework **Other** and no build command.
2. Open `/api/air?city=lahore` and confirm `200`, `modelBased: true`, `current`, and forecast points. If `503`, check upstream availability and API terms.
3. Open the public HTTPS site on Android Chrome, iPhone Safari, and desktop if available. Switch cities and wait for provider response.
4. Calculate a 2-hour plan and verify the displayed end time does not exceed the selected horizon; save, view, and delete the plan.
5. Ask "Is tomorrow less polluted?", "Can children play outside?", and "How do I ask my school to act?". Verify correct categories.
6. Switch English / Urdu and download a letter. Review the spelling and communication before sending.
7. In DevTools, simulate failed `/api/air` requests. Confirm explicit cached/error banners, never invented live numbers.
8. Verify install/Add to Home Screen and open offline after a first online visit; confirm the page clearly labels any cached forecast.
9. Verify real copy, share and read-aloud actions on the user's devices; browsers can legitimately block these features.
10. Refresh the page after a code update. Test service-worker update and old-cache eviction.

**Status:** Audited and improved; automated checks passed. It is not accurate to promise literally zero bugs or guaranteed provider availability.
