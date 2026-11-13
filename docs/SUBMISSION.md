# Project page draft (NASA Space Apps 2026)

## Project name
Red Outpost: Mars Survival Trainer

## High-Level Summary
Red Outpost is a free, offline browser game where kids aged 7-12 keep a four-person Mars outpost alive for 30 sols. Every sol they split limited solar power between oxygen, food, a radio link to Earth and the crew's work, and every choice costs something. The solar storms are real NASA DONKI forecasts of CMEs reaching Mars, and the warnings arrive only if the radio is on, after the real Earth-Mars light delay. Kids learn why astronauts trade science for safety, and they learn it by failing and trying again. It runs on cheap phones, in English and Bangla.

## Project Demo
_Link to the 30 s / 240 s video (team to add)._

## Project Details

**What it does.** Players pick a real landing site (Jezero, Gale or Gusev), checked for slope using NASA MOLA laser-altimeter data, and a real or future mission window (from historical NASA DONKI storm events in 2024-2025 through simulated human exploration windows in 2026-2035). Each sol they set the air plant, greenhouse, radio and crew activity (walk outside, lab, or storm shelter). Power comes from sunlight computed for that Mars season and latitude; heaters follow temperatures measured by NASA InSight. Storms land on the sols NASA's WSA-ENLIL model predicted. A failed mission opens a Flight Director's Review that explains why, compares the run with a simple expert plan on the same storms, and cites a NASA fact.

**How it works.** All science and rules live in pure, deterministic, unit-tested TypeScript (`src/compute/`): the NASA GISS Mars24 algorithm (tested against its published worked example), JPL's planetary elements for light-time, a slope calculation on MOLA elevation grids, and exact oxygen, food, energy and dose bookkeeping using NASA's Life Support Baseline Values (BVAD) and Curiosity RAD measurements. NASA data is fetched at build time and shipped with the app, so the game makes no network requests while playing. A provenance drawer on every screen names the dataset, record ID, URL and retrieval date, with badges for cached, archived, simulated and computed data.

**Benefits and impact.** Teaches real trade-offs (power vs oxygen, science vs radiation, communication vs energy) instead of trivia. Free, open source (Apache-2.0), works offline on low-end phones, no accounts or tracking, and in Bangla for students in Bangladesh as well as English.

## Use of Artificial Intelligence
The team used Anthropic's Claude (Claude Code) as a coding assistant to verify data sources, write code, tests and documentation, and draft the Bangla text (under native review). No AI runs inside the game: every number is computed by deterministic, tested code or quoted from a cited NASA source. Details: `docs/AI_USE.md`.

## NASA data and resources used
- DONKI WSA-ENLIL Simulations and SEP events (NASA CCMC, via api.nasa.gov)
- MGS MOLA MEGDR 128 px/deg elevation (NASA PDS Geosciences Node)
- Mars Trek landing-site bookmarks (NASA Solar System Treks)
- InSight Mars Weather Service API (archived)
- NASA GISS Mars24 algorithm; JPL Approximate Positions of the Planets; JPL astrodynamic parameters
- NSSDCA Mars and Earth fact sheets
- Life Support Baseline Values and Assumptions Document (NTRS 20210024855)
- Curiosity RAD results (NASA release; NTRS 20180007641), May 2024 Mars solar storm (NASA)
- NASA career radiation limit (NTRS 20230005246)
- MOXIE mission results (NASA/JPL 2023)
- OSDR study OSD-2

## Space agency partner and other data
- **ESA Mars Express High Resolution Stereo Camera (HRSC) & Atmospheric Investigations** (European Space Agency Planetary Science Archive, MEX-M-HRSC-5-REFDR-DTM-V1.0) — Martian 3D terrain topography and polar atmospheric dynamics. Cited in-game with dedicated provenance metadata and educational fact.

## References
See `content/sources.json` for full titles, URLs, licences and retrieval dates.
