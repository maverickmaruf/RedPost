# Data Dependency Test

For each NASA dataset: what breaks if it is removed. If the answer were "nothing", the data would be decoration.

| Dataset | Remove it and... | Verdict |
|---|---|---|
| **DONKI WSA-ENLIL Mars forecasts** | There are no radiation storms, no warnings, and the radio and shelter choices stop mattering. Shelter becomes a pure loss, the dose meter just ticks up linearly, and the hardest real month (May 2024 solar maximum) plays the same as the quietest. | Core. The mission no longer works. |
| **JPL ephemeris + Mars24** (computed from cited NASA formulas) | No radio light-time (the "message took 16 min" moment), no seasons, and solar power becomes a constant. Site choice stops mattering: the Gusev-in-southern-winter failure only exists because of Mars24 declination and distance. | Core. |
| **MOLA MEGDR + Mars Trek bookmarks** | There's no landing check: the player can't be told "Slope 22°: too steep" at Gale's mountain flank, and the three real landing sites lose their real latitudes. | Core for setup. Without it you can't choose a site. |
| **InSight archived temperatures** | Heater demand becomes an invented constant. With it, heater power is a physical function of real measured Mars air temperature. | Supporting. Still changes the power budget every sol. |
| **BVAD (NTRS 20210024855)** | Oxygen and food use become invented numbers. They are the crew's daily drain on two of the three resources. | Core constants. |
| **Curiosity RAD (0.67 mSv/day, 8.1 mGy record) + 600 mSv limit** | The dose meter has no scale and no limit. | Core constants. |
| **OSDR OSD-2** | One "Did you know?" card loses its study reference. | Context only, stated honestly. |

## What judges can check

- Every number on screen comes from `src/compute/` (pure, unit-tested) or `content/sources.json`.
- The provenance drawer (ⓘ Data) names the dataset, the record (e.g. `WSA-ENLIL/30869/1`), the URL and the retrieval date.
- `npm test` runs the Mars24 worked example from NASA GISS as a test, and checks that 1361 / 1.5237² reproduces the NSSDC 586.2 W/m².
