# AirGuard v3.0 — Deploy once, correctly

1. **Extract** `AirGuard_Final_v3.0_Vercel.zip`.
2. Upload the **contents of the extracted folder** (not the containing folder) to a GitHub repository: confirm `index.html` and `vercel.json` are visible at repository root, with `api/` and `lib/` beside them.
3. Vercel → New Project → Import GitHub repository → **Framework: Other** → **Root: `./`**. Leave **Build** and **Output** overrides empty.
4. Deploy. Open `/api/health` and check that its response contains `"version":"3.0.0"`.
5. Open `/api/air?city=lahore` to verify the forecast API returns JSON. A `503` JSON error during a provider outage is expected; an HTML error indicates a deployment/platform issue.
6. Open the dashboard. Check that both forecast graphs appear, calculate a 1-hour AirTwin plan, and test a Family Shield letter.
7. Open the site on your phone and test the fixed mobile navigation and WhatsApp handoff.

The release needs **no paid API key or database**. A third-party air-quality service is required for fresh data. If the API does not respond, read `DEPLOY_AND_DEBUG.md` and Vercel Function Logs.
