# Red Outpost: Mars Survival Trainer

**NASA Space Apps Challenge 2026 · Challenge: [Build a Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)** (Education & gamification, Intermediate / Beginner-Youth)

Run a small outpost on Mars for 30 sols. Every sol you decide what gets power: the air plant, the greenhouse, the radio to Earth, and what the crew does. No choice is free: a walk outside earns science but raises radiation, the shelter blocks solar storms but the greenhouse goes half-tended, and the radio costs power but it's the only way to hear storm warnings from Earth.

**The storms are real.** Driven by NASA DONKI WSA-ENLIL heliospheric simulations of coronal mass ejections (CMEs) reaching Mars, spanning both historical benchmark storms (May 2024 solar max record, October 2024, June 2025) and future human exploration windows (October 2026, 2028 sample return, 2031 solar cycle 26, 2033 orbital, and 2035 crewed surface expedition). The warnings reach your outpost after the real Earth-Mars radio delay for that date (calculated via JPL planetary ephemeris).

- For kids 7-12, in **English and বাংলা**.
- **Works offline** after the first load, on cheap phones. No accounts, no tracking, no ads.
- Every number is computed by tested code (`src/compute/`) or quoted from a cited NASA source; tap **ⓘ Data** on any screen.

## Play

```bash
npm ci
npm run build
npm run preview
```

Open http://localhost:4173. For judges: open `/?judge=1` (or tap the planet 5 times) to jump to sol 12 of May 2024, the day before a big storm hits.

## NASA data used

| Data | Used for |
|---|---|
| [DONKI WSA-ENLIL simulations](https://api.nasa.gov/) (NASA CCMC) | Solar storm arrival forecasts at Mars, the core mechanic |
| [DONKI SEP events](https://api.nasa.gov/) | Context in the provenance drawer |
| [MGS MOLA MEGDR 128 px/deg](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) (PDS) | Ground slope at the landing site |
| [Mars Trek](https://trek.nasa.gov/mars/) landing-site bookmarks | Perseverance, Curiosity and Spirit site locations |
| [InSight Mars Weather API](https://api.nasa.gov/) (archived 2020) | Outside temperature, which drives heater power |
| [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | Earth-Mars distance, radio light-time |
| [NASA GISS Mars24 algorithm](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html) | Mars season, Sun distance, solar power |
| [Life Support BVAD, NTRS 20210024855](https://ntrs.nasa.gov/citations/20210024855) | Oxygen 0.895 kg and food 0.8 kg per astronaut per day |
| [Curiosity RAD results](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/) and [May 2024 storm](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/) | 0.67 mSv/day surface dose, 8,100 µGy record storm |
| [NTRS 20230005246](https://ntrs.nasa.gov/citations/20230005246) | 600 mSv astronaut career limit |
| [MOXIE completes mission](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) | 12 g/h oxygen fact |
| [OSDR OSD-2](https://osdr.nasa.gov/bio/repo/data/studies/OSD-2) | Radiation-biology fact |

Full list with retrieval dates: [`content/sources.json`](content/sources.json) and [`docs/DATA_PLAN.md`](docs/DATA_PLAN.md). What is real and what is simplified: [`docs/MODEL.md`](docs/MODEL.md). Why each dataset matters: [`docs/RELEVANCE.md`](docs/RELEVANCE.md).

## Develop

```bash
npm run acquire          # refresh data (live -> cache -> fixture); set NASA_API_KEY for more than DEMO_KEY limits
npm run acquire:offline  # rebuild data products from cache/fixtures only
npm run typecheck && npm run lint && npm test && npm run verify:claims
npm run build && npx playwright test   # PW_CHANNEL=msedge or chrome to use an installed browser
```

Layout: `src/compute/` pure science and rules (no DOM, no clock, no network, enforced by lint) · `src/game/` session, saves, audio · `src/ui/` screens and i18n · `content/` strings, facts, sources · `scripts/acquire/` build-time data pipeline · `tests/` Vitest unit and Playwright offline e2e.

## Team

_To be filled in by the team: team name, members and roles._ (See `docs/TODO_HUMAN.md`.)

## Licence and credits

Apache-2.0 (see `LICENSE` and `NOTICE`). NASA data is public domain unless noted. Fonts: Atkinson Hyperlegible and Noto Sans Bengali (SIL Open Font License), via Fontsource. AI use is disclosed in [`docs/AI_USE.md`](docs/AI_USE.md). This is a teaching game, not medical advice.
