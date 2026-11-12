# Scorecard: honest self-audit

As of 12 Nov 2026, end of the vertical slice. These are our estimates, not claims; judges decide.

| Criterion | Max | Our estimate | Evidence | Gaps |
|---|---|---|---|---|
| Impact | 20 | 13-15 | Free, offline after first load, 26.7 KB gzipped JS, works at 360 px, Bangla + English, no accounts. | Not yet tested with real kids or teachers; no classroom guide yet. |
| Creativity | 20 | 14-16 | The radio-vs-power-vs-warning trade-off with real forecast lead times and real light-time; a "ghost" Flight Director run on the same storms. | Visuals are simple (icons, bars). |
| Validity | 20 | 15-17 | `src/compute/` is pure and tested (37 tests, incl. the NASA GISS Mars24 worked example and exact mass/energy balances); every constant is tagged cited or simplified and shown in-game. | Several gameplay constants are simplified (stated openly); dust is simulated; storm dose is a mapping, not a model. |
| Relevance | 20 | 15-17 | DONKI WSA-ENLIL Mars forecasts are the core mechanic; MOLA/Trek for landing; InSight for heating; BVAD/RAD for crew needs. Data Dependency Test in RELEVANCE.md. | OSDR use is light (one fact). Artemis data not used. |
| Presentation | 20 | ? | Judge mode lands on a real storm forecast in one tap. | Video not recorded yet. |
| Teamwork | 5 | ? | Small commits, decisions log. | Team section and roles not filled in yet. |
| User experience | 5 | 3-4 | Contextual hints instead of a tutorial; 48 px+ targets; keyboard play; screen-reader labels; reduced motion. | No Lighthouse/axe run yet; no usability test yet. |
| NASA data usage | 5 | 5 | NASA data (DONKI, MOLA, InSight, BVAD, Curiosity RAD) + CCMC models + ESA Mars Express HRSC (partner agency source), all with UI provenance badges. | All partner agency criteria met. |
| Category / repo / page | 3 | 3 | Challenge named in README; Apache-2.0; verified citation graph. | Ready for submission. |

## Quality gates

| Gate | Status | Evidence |
|---|---|---|
| typecheck, lint, unit tests | PASS | `npm run typecheck`, `npm run lint` (0 problems), `npm test` 47/47 |
| verify:claims | PASS | 14 facts, 20 sources resolve (including ESA partner agency); verified claims gate |
| Offline e2e | PASS | Playwright 7/7 on Edge: no foreign hosts, offline reload and play, BN switch, persistence, blocked storage, judge mode, loss + review |
| Bundle budget (≤ 400 KB gz initial JS) | PASS | 26.7 KB gz |
| Precache budget (≤ 25 MB) | PASS | 17 entries, ~417 KB |
| No external requests | PASS | e2e test 1; CSP `default-src 'self'` |
| Lighthouse PWA / a11y ≥ 90, axe | NOT RUN | — |
| 30 fps at 4× CPU throttle | NOT APPLICABLE / NOT RUN | No continuous animation; turn-based DOM |
| Clean-clone offline build | NOT RUN | `acquire:offline` path exists; to verify on a second machine |
