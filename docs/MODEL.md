# How the model works

The whole simulation is `src/compute/`: pure functions, no DOM, no clock, no network, and no `Math.random` (lint enforces all of these). Each value in `src/compute/constants.ts` is tagged `cited` (with its source) or `simplified` (a teaching value). The About screen shows the same table to players.

## One sol, step by step (`stepSol` in outpost.ts)

1. **Power available** = battery + solar energy today.
2. **Solar energy** = sol-averaged sunlight on flat ground × e^(−0.4 τ) × 75 m² × 22% × 24.66 h.
   - Sunlight: (S/π)(h₀ sinφ sinδ + cosφ cosδ sin h₀), with S = 1361 W/m² ÷ r². r and δ come from the NASA GISS Mars24 algorithm for that date; φ is the landing-site latitude from Mars Trek.
   - τ (dust) is **simulated**, seeded per mission.
3. **Systems are powered in priority order**: heaters → air plant → crew activity → radio → greenhouse. A system that doesn't fit is switched off for the sol. Unpowered heaters end the mission (blackout).
4. **Heaters** = 0.008 kW/K × (20 °C − outside average) × 24.66 h, using the outside temperature from **InSight archived sols**.
5. **Oxygen**: the crew uses 4 × 0.895 kg (BVAD). The air plant makes exactly that (Normal) or 1.5× (Boost) at 4 kWh/kg (simplified).
6. **Food**: the crew eats 4 × 0.8 kg (BVAD). The greenhouse grows 2.6 kg (simplified), or half that if the crew is in the shelter.
7. **Radiation**: 0.67 mSv/day (Curiosity RAD) × 0.8 inside or × 1.0 on a walk, plus the storm dose × 0.25 in the shelter, × 1.0 inside or × 1.5 outside.
8. **Storms**: a sol has a storm if a DONKI WSA-ENLIL forecast puts a CME arrival at Mars in it. Glancing = 0.5 mSv, direct < 1000 km/s = 1.5 mSv, direct ≥ 1000 km/s = 4.0 mSv (simplified; the record measured by Curiosity in May 2024 was 8.1 mGy).
9. **Radio**: if powered, it delivers forecasts that reached Mars (Earth issue time + light-time) and sends buffered science. Forecasts that arrive while it's off wait in a queue.
10. **Failure checks**: oxygen < 0, food < 0, or dose > 30 mSv (the 600 mSv career limit ÷ 20 missions; game rule).

## Exactness

Unit tests check that energy, oxygen and food balances close exactly every sol, that the Mars24 worked example is reproduced to 10⁻⁴ degrees, and that missions are bit-for-bit deterministic for a given seed.

## Limits, stated honestly

- DONKI forecasts a CME's arrival, not a surface radiation dose; the dose mapping is a teaching simplification.
- The 75 m² array, 4 kWh/kg oxygen plant, greenhouse yield and shelter factor are invented for gameplay balance, not engineering estimates.
- Dust is simulated. InSight weather is from Elysium Planitia in 2020, applied to every site.
- Slope uses MOLA's 463 m pixels, so it misses boulders and small craters that matter to real landers.
- This is a teaching game, not medical guidance.
