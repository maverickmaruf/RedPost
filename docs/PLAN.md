# Plan

## What we're building

**Red Outpost**: a browser game (offline PWA, EN/BN) where kids 7-12 keep a 4-person Mars outpost alive for 30 sols. It answers the 2026 statement directly: life support, radiation shielding, power budgeting, food production and communication delay, all driven by real NASA data.

The core loop per sol: read the meters and the space-weather forecast → set the air plant, greenhouse, radio and crew activity → End sol → see what happened. A failure opens the Flight Director's Review: why it happened, a chart of you against the Flight Director's run with the same storms, and a cited fact.

## Architecture

```
scripts/acquire/   build-time only: NASA APIs -> cache/ -> public/data/*.json (+ demo_fixtures/)
src/compute/       pure, deterministic, unit-tested: astro.ts (Mars24, JPL), terrain.ts, mission.ts,
                   outpost.ts (rules), planner.ts (ghost), constants.ts (cited vs simplified)
src/game/          session (replay saves), storage (never throws), audio (synth)
src/ui/            screens: title, setup, sol, review, about; provenance drawer; i18n
content/           strings.en/bn.json, facts.json, sources.json
tests/unit         Vitest (37)        tests/e2e  Playwright offline suite (7)
```

## Phase status

| Phase | Status |
|---|---|
| 0 Verify and plan | Done. DATA_PLAN.md, sources.json, CI. Pivot recorded (D-001). |
| 1 Vertical slice | Done. Title, setup, sol loop, review, provenance, judge mode, offline PWA, EN/BN. |
| 2 Core | Mostly done in the slice (review, badges/ranks, EN/BN). Left: adaptive difficulty, "daily mission" seed. |
| 3 Completion | Audio done. Left: optional extras (see the cut list). |
| 4 Hardening | Partly done: e2e offline, storage-blocked, verify:claims, budgets. Left: Lighthouse/axe runs, CPU-throttle check, translating the model card. |
| 5 Submission kit | Drafts written: SCORECARD, DEMO_SCRIPT, SUBMISSION, HANDOFF. Team needs to finish the team section and record the video. |

## Next features, in priority order

1. **Adaptive difficulty**: after 3 failed attempts on the same mission, start with +10 kWh battery and say so.
2. **Daily mission**: seed from the date, with a short share code (no backend).
3. **Moon mode** (statement allows "lunar or Martian"): same rules, lunar night power problem. Stretch.
4. **Resupply docking mini-game** (the original prompt's Clohessy-Wiltshire rendezvous) as a bonus mission. Stretch.

## Risks

- **Bangla quality**: machine-drafted, needs a native reviewer (TODO_HUMAN).
- **Hard site/month pairs** may frustrate young players; mitigated by the sun forecast in the site picker and the review's ghost message.
- **DEMO_KEY rate limits** when refreshing data; register a key.
- **Challenge Resources tab** opens 13 Nov and might name datasets we should add.
