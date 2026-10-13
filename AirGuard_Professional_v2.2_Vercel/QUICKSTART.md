# AirGuard 2.1 audited Vercel version
# AirGuard deployment: 5-minute checklist

## Upload
- Unzip `AirGuard_Ultimate_Vercel.zip` so that `index.html`, `vercel.json`, `package.json`, `app.js`, `api/` and `lib/` are at the **root** of your repository.
- Create a **private or public** GitHub repository; choose whether you want the project to be open source.
- Upload the project files to that repository.

## Vercel configuration
- Open https://vercel.com/new and import the repository.
- Framework preset **Other**; root directory `./`.
- Leave Build Command and Output Directory empty / defaults for static assets.
- No environment variables or paid keys are required.
- Click **Deploy**.

## First live verification
- Open `https://YOUR-SITE.vercel.app/api/air?city=lahore` and confirm the response contains `modelBased: true` and actual values from the upstream provider.
- Confirm the homepage does not show invented numbers if the forecast API fails.
- Test AirTwin: choose activity, duration, horizon, calculate, save, copy.
- Test Ask: "When should I walk?" and an out-of-domain question.
- Test Family Shield: English/Urdu, save a school note, browser read-aloud if supported.
- Test mobile navigation on your phone.
- Run `npm run check` locally if you have Node 20+.

## After publishing
- Check the public link from another network. Verify Open-Meteo data terms and source attribution.
- Ask a school/community partner to pilot the tool, with consent and documented outcomes (`docs/impact-validation.md`).
- Expect occasional API outages, Vercel limits and maintenance; the code is deliberately low-dependency, **not permanent without upkeep**.
