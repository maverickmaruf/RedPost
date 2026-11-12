# Data plan

Phase 0 verification spike, run 2026-11-12 (Asia/Dhaka evening). Every row below was requested live from this machine unless marked otherwise. `id` values match `content/sources.json`.

## Datasets the game ships

| id | Dataset | Access | Auth | What we keep | Size shipped | Licence | Status |
|---|---|---|---|---|---|---|---|
| `donki-enlil` | NASA DONKI WSA-ENLIL simulations | `https://api.nasa.gov/DONKI/WSAEnlilSimulations?startDate&endDate` | api.nasa.gov key (DEMO_KEY works, rate-limited) | Per CME: latest simulation with a `location: "Mars"` impact; `issued` (modelCompletionTime), `arrival`, `isGlancingBlow`, CME speed, simulationID, link | ~22 KB for 3 months | US Gov, public domain | VERIFIED (HTTP 200, 128 sims for May 2024, 33 Mars impacts) |
| `donki-sep` | NASA DONKI SEP events | `https://api.nasa.gov/DONKI/SEP` | same | sepID, eventTime, instruments, link (shown as context) | in the same product | US Gov | VERIFIED (14 events May 2024) |
| `insight-weather` | InSight Mars Weather Service API | `https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0` | same | Sols 675-681 (Oct 2020): air temperature min/max/avg, pressure | 1.1 KB | US Gov | VERIFIED, **archived feed** (frozen at 2020, shown as "archived 2020") |
| `mola-megdr` | MGS MOLA MEGDR, 128 px/deg (PDS Geosciences Node) | HTTP Range on `meg128/megt44n000hb.img`, `megt00n090hb.img`, label `.lbl` parsed for geometry | none | 96×96 px (0.75°) int16 elevation grid per site | ~160 KB JSON for 3 sites | NASA PDS | VERIFIED (label: 11520×5632, MSB int16, 463 m/px; Range 206) |
| `trek-bookmarks` | NASA Mars Trek search API, landing-site bookmarks | `trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?key=Jezero` etc. | none | bbox of "Perseverance Landing Site", "Curiosity Landing Site", "Spirit Landing Site" -> site centre | in sites.json | NASA public portal | VERIFIED |
| `osdr-osd-2` | NASA OSDR study OSD-2 | `osdr.nasa.gov/osdr/data/search?term=...` | none | accession + title for the debrief fact | 0.3 KB | OSDR open data | VERIFIED |

## Reference sources (constants and formulas, not downloaded at runtime)

| id | Used for | Status |
|---|---|---|
| `nssdc-mars-fact`, `nssdc-earth-fact` | 1361 W/m² at 1 au, 586.2 W/m² at Mars (test check), obliquity 25.19°, sol 24.6597 h | VERIFIED |
| `jpl-approx-pos` | Table 1 Keplerian elements for EM barycentre and Mars (Earth-Mars distance) | VERIFIED |
| `jpl-astro-par` | c = 299792.458 km/s, 1 au = 149597870.7 km | VERIFIED |
| `giss-mars24` | Ls, Sun distance, declination; worked example used as a unit test | VERIFIED |
| `bvad-2022` | O₂ 0.895 kg/crew/day, food 0.800 kg/crew/day (NTRS 20210024855, table read from the PDF) | VERIFIED |
| `nasa-rad-2013` | 0.67 mSv/day at Gale; chest X-ray 0.02 mSv | VERIFIED |
| `nasa-may2024-storm` | 8,100 µGy record storm dose (May 2024) | VERIFIED |
| `ntrs-career-limit` | 600 mSv NASA career limit (NTRS 20230005246 abstract) | VERIFIED |
| `nasa-moxie-2023` | MOXIE best rate 12 g/h, total 122 g | VERIFIED |
| `ntrs-rad-hassler-2014` | Primary paper record for the RAD surface measurement | VERIFIED (abstract only; numbers taken from the NASA release) |

## Candidates checked and not used

| Candidate | Result | Why not used |
|---|---|---|
| NASA Open Data Portal CKAN API `data.nasa.gov/api/3/action/package_search` | VERIFIED working (73 EPIC hits, 136 ISS trajectory hits) | Used for discovery only. |
| DSCOVR EPIC `epic.gsfc.nasa.gov/api/natural` | VERIFIED | Belonged to the original prompt's Earth mission; the 2026 statement asks for an outpost (see DECISIONS.md D-001). |
| ISS OEM ephemeris (`nasa-public-data.s3.amazonaws.com/iss-coords/current/...`) | VERIFIED | Same reason (ISS docking cut). |
| `kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/*` | FAILED (connection timeout from this network) | Use the api.nasa.gov mirror instead. |
| Mars Trek DEM products (HiRISE/CTX mosaics) | VERIFIED listed | Files are 2-10 GB; MOLA MEGDR via Range is enough for a 463 m slope check. |
| spaceappschallenge.org from shell | TLS failure (local proxy re-signs HTTPS) | Read in the in-app browser instead. |

## Pipeline

`npm run acquire` runs `scripts/acquire/index.mjs`:

1. Each fetch goes **live → cache/ → demo_fixtures/**. `OFFLINE=1` (or `--offline`) skips live.
2. Raw responses go to `cache/` with a `.meta.json` (URL with key redacted, retrieval time, mode).
3. Small raw sources are pinned to `demo_fixtures/`; large MOLA rows stay in `cache/` only.
4. Compact products are written to `public/data/*.json` and pinned as `demo_fixtures/product.*.json`, so a clean clone builds with no network.
5. A DONKI month that cannot be fetched is skipped, not fatal (the 2023-03 window hit the DEMO_KEY limit on the first run).

The game only reads `public/data/`. Nothing calls a network API at runtime. The provenance drawer shows `cache` for anything acquired live at build time and `fixture` for anything restored from fixtures; shipped data is never labelled `live`.
