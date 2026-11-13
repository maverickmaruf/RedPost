# Project Page: Red Outpost — Mars Survival Trainer
**Challenge:** Junior Astronaut Mission Trainer Challenge (NASA Space Apps Challenge 2026)  
**Track:** Living Beyond Earth / Space Exploration Systems  

---

## High-Level Summary
Red Outpost is an offline-first, bilingual (English & বাংলা) living simulation designed for cadets aged 7–12. As challenge author Mike Givens (NASA / Kakhi International) framed the challenge:
> *"Picture this: it's Sol 214... a dust storm just rolled in, your solar panels are about to get buried, and you have about 10 seconds to decide: do you retract the panels and lose power tonight, or leave the exposed panels and risk losing a lot more? That single decision is the entire spirit of this challenge. Not a quiz. Not a slideshow. A living simulation where every choice costs something... putting someone in the commander's seat and making them own their consequences."*

Red Outpost puts students directly into the Commander's seat of a four-person outpost on Mars for 30 sols. There is no unlimited resource mode in space: every watt of solar power, liter of oxygen, and millisievert of radiation shielding is a real mathematical trade-off against survival and scientific exploration. Real NASA DONKI space weather forecasts drive coronal mass ejection (CME) solar storm risks, arriving only after actual Earth-Mars speed-of-light delays.

---

## Project Demo
- **Live Interactive App:** [https://maverickmaruf.github.io/redpost/](https://github.com/maverickmaruf/redpost.git) (or run locally: `npm run dev` at `http://localhost:5173/`)
- **Demo Video (30s teaser / 240s walkthrough):** *(Team video link)*

---

## The Five Core Pillars of Deep Space Survival

Red Outpost models the exact five trade-off systems highlighted in NASA's mission requirements:

1. **Power Budgeting & Microgrid (NASA InSight & GISS Mars24):**  
   Solar generation is determined by seasonal orbital solar insolation ($L_s$), solar distance ($r_{AU}$), latitude, and atmospheric dust optical depth ($\tau$). Night temperatures drop to $-95^\circ\text{C}$ (InSight TWINS data), requiring non-negotiable electric heaters to prevent catastrophic blackout.
2. **Life Support & MOXIE Oxygen Generation (NASA BVAD & Perseverance MOXIE):**  
   Each astronaut consumes $0.895\text{ kg } \text{O}_2/\text{day}$ (NASA Life Support Baseline Values). Oxygen is produced via solid oxide electrolysis inspired by Perseverance's MOXIE instrument, drawing power to replenish the habitat buffer tank.
3. **Food Production & Hydroponic Greenhouse:**  
   Packed provisions cover only half the mission. Cadets must power the hydroponic greenhouse ($12\text{ kWh/sol}$) to grow $2.6\text{ kg}$ of food per sol. When solar storms force the crew into the shelter, the greenhouse goes half-tended.
4. **Radiation Shielding & Space Weather (NASA DONKI & Curiosity RAD):**  
   Driven by real NASA DONKI WSA-ENLIL heliospheric simulations across historical storms (including the record May 2024 CME measured by Curiosity RAD) and future human exploration windows (2026–2035). Water-shielded storm bunkers attenuate radiation by $75\%$ ($0.25\times$ factor), whereas EVA spacewalks expose astronauts to heightened flux.
5. **Communication Delay & Autonomous Operations (JPL Planetary Ephemeris):**  
   Signals travel at light-speed ($300,000\text{ km/s}$), creating a $3\text{--}22\text{ minute}$ one-way delay. If the habitat radio is powered down to conserve energy, incoming storm warnings are queued and unread, teaching why deep space crews must make autonomous life-or-death decisions.

---

## Key Gameplay Innovations & Commander Experience

- **Commander's Critical Decision Gates:** When a cadet orders an EVA during a predicted CME impact or life support faces a power deficit, a high-stakes decision modal forces them to choose: shelter the crew or risk high-dose exposure for scientific discovery.
- **Living Interactive Habitat Viewport:** An animated SVG diorama dynamically reflects outpost telemetry: greenhouse biodomes glow, MOXIE vents pulse $\text{O}_2$ plumes, antennas track signals, and sky gradients shift with real space weather and dust storms. Every module serves as an interactive tactical hotspot.
- **Flight Director's Review ("Ghost" Strategy):** At mission completion or failure, interactive charts contrast the player's resource trajectory against an optimal heuristic flight plan operated by NASA's Flight Director on the exact same storms.
- **Narrative Commander's Sol Logs:** Contextual radio chatter and outpost logs provide immediate emotional immersion following every sol.
- **Personalized Official NASA Flight Certificate:** Cadets enter their name upon mission completion to print a framed Junior Astronaut Certificate of Achievement.
- **100% Offline-First & Private:** Built with zero external runtime network requests, zero trackers, and complete bilingual parity in English and বাংলা (Bengali).

---

## NASA Data and Resources Used
- **DONKI WSA-ENLIL Simulations & SEP Events** (NASA CCMC, via api.nasa.gov): CME arrival predictions, shock speeds, and interplanetary storm alerts.
- **MGS MOLA MEGDR 128 px/deg Elevation Data** (NASA PDS Geosciences Node): Real topographic slope and landing hazard verification.
- **InSight Mars Weather Service** (NASA PDS): Mars surface temperatures and atmospheric pressure constraints.
- **NASA GISS Mars24 Algorithm & JPL Approximate Positions of the Planets**: Orbital position vectors, solar coordinates, and light-travel latency.
- **Life Support Baseline Values and Assumptions Document (BVAD, NTRS 20210024855)**: Human metabolic requirements ($\text{O}_2$, calories, hydration).
- **Curiosity RAD Radiation Measurements (NTRS 20180007641 & May 2024 Storm Release)**: Surface dose rates and solar particle event spikes.
- **Perseverance MOXIE In-Situ Resource Utilization Results (NASA/JPL 2023)**: Solid-oxide electrolysis efficiency and yield.
- **NASA Career Astronaut Radiation Limits (NTRS 20230005246)**: $600\text{ mSv}$ career cap, scaled to $30\text{ mSv}$ per 30-sol mission.
- **NASA Open Science Data Repository (OSDR Study OSD-2)**: Cellular cosmic radiation response.

---

## Space Agency Partner Integration
- **ESA Mars Express High Resolution Stereo Camera (HRSC) & Polar Investigations** (European Space Agency Planetary Science Archive, MEX-M-HRSC-5-REFDR-DTM-V1.0): 3D topography data and Martian atmospheric dynamics, highlighted with in-game educational facts and provenance tracking.

---

## Use of Artificial Intelligence
AI coding assistance (Anthropic Claude) was utilized for Phase 0 API verification, architecture design, deterministic compute implementation, bilingual drafting, and test authoring. **No artificial intelligence runs at runtime**: all game physics, astronomical positions, and space weather models run on pure, deterministic, unit-tested TypeScript. Details available in `docs/AI_USE.md`.

---

## References & Source Verification
All 20 scientific sources and physical constants are cataloged in `content/sources.json` and validated through automated build verification (`npm run verify:claims`).
