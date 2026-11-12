# Handoff

## Run it

```bash
npm ci
npm run build
npm run preview        # http://localhost:4173
```

The data products are already in `public/data/`, so nothing needs the network. To refresh data: `NASA_API_KEY=... npm run acquire`. To rebuild data from cache and fixtures only: `npm run acquire:offline`.

## Demo offline

1. Open the app once while online (this installs the service worker).
2. Turn on flight mode and reload: it still works.
3. Judge shortcut: `/?judge=1`, or tap the planet 5 times on the title screen. This lands on sol 12 of May 2024 with a real "Big solar storm on sol 13" forecast.

## Check it

```bash
npm run typecheck && npm run lint && npm test && npm run verify:claims
npm run build && PW_CHANNEL=msedge npx playwright test
```

## What to record
See `docs/DEMO_SCRIPT.md` (30 s and 240 s). No minors on camera, in voice or by name.

## Human punch-list
See `docs/TODO_HUMAN.md`. The short version: read the Resources tab when it opens on 13 Nov; register an api.nasa.gov key; get a native Bangla review; fill in the README team section; test with a newcomer; record the videos; make the repo public; paste `docs/SUBMISSION.md` into the project page.
