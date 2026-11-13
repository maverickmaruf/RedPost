# Red Outpost: Mars Survival Trainer

**NASA Space Apps Challenge 2026 · Challenge: [Junior Astronaut Mission Trainer](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/)**  
*(Track: Living Beyond Earth · Education & Simulation · Intermediate / Beginner-Youth)*  
**Live Application:** [https://maverickmaruf.github.io/redpost/](https://github.com/maverickmaruf/redpost.git)  

> *"Picture this: it's Sol 214 on a lunar outpost, a dust storm just rolled in, your solar panels are about to get buried, and you have about 10 seconds to decide: do you retract the panels and lose power tonight, or leave the exposed panels and risk losing a lot more? That single decision is the entire spirit of this challenge. Your challenge is to design and build an interactive game or app where kids ages 7 to 12 run a lunar or Martian outpost, making real decisions about life support, radiation shielding, power budgeting, food production, and communication delay, and then watching those consequences play out. Not a quiz. Not a slideshow. A living simulation where every choice costs something... putting someone in the commander's seat and making them own their consequences."*  
> — **Mike Givens**, Challenge Author (NASA / Kakhi International)

---

## Quick Start & Play

```bash
# Clone the repository
git clone https://github.com/maverickmaruf/redpost.git
cd redpost

# Install dependencies and start local dev server
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

### 🚀 Judge Mode Shortcut
For competition judges and evaluators who want to inspect the record-breaking May 2024 solar storm immediately without playing through earlier sols:
- Append `?judge=1` to the URL: `http://localhost:5173/?judge=1`
- **OR** tap the Mars habitat hero illustration on the Title screen **5 times**.  
*This fast-forwards through the Flight Director's first 11 sols at Jezero Crater and places you in the Commander's seat directly on Sol 12, the day before the largest CME in modern history hits.*

---

## Table of Contents
1. [Challenge Overview & Vision](#challenge-overview--vision)
2. [The Five Core Survival Pillars](#the-five-core-survival-pillars)
3. [Key Gameplay Innovations](#key-gameplay-innovations)
4. [Scientific & Mathematical Models (`src/compute/`)](#scientific--mathematical-models-srccompute)
5. [Codebase Architecture & File Guide](#codebase-architecture--file-guide)
6. [NASA & Partner Space Agency Data](#nasa--partner-space-agency-data)
7. [Bilingual Engine (English & বাংলা)](#bilingual-engine-english--বাংলা)
8. [Offline-First PWA & Privacy](#offline-first-pwa--privacy)
9. [Development & Verification Commands](#development--verification-commands)
10. [License & Credits](#license--credits)

---

## Challenge Overview & Vision

In deep space, there is **no unlimited resource mode**. Every decision is a zero-sum mathematical trade-off against survival:
- **Oxygen vs. Power:** Running the MOXIE electrolysis plant replenishes the air tanks, but drains battery capacity needed for night heaters.
- **Science vs. Radiation:** Sending astronauts outside on EVA spacewalks gathers essential geological data for Earth, but burns suit energy and exposes the crew to cosmic radiation and solar particle events.
- **Storm Shelters vs. Agriculture:** Taking refuge in the water-walled storm bunker blocks $75\%$ of solar storm radiation, but leaves the hydroponic greenhouse half-tended.
- **Communication vs. Autonomy:** The deep-space radio antenna consumes power to transmit science data and receive NASA DONKI storm alerts, but orbital light-time ($3\text{--}22\text{ min}$) means Earth can never intervene in an emergency.

---

## The Five Core Survival Pillars

Red Outpost models the five critical deep-space life-support systems:

### 1. Power Budgeting & Martian Microgrid (NASA InSight & GISS Mars24)
- **Solar Insolation:** Calculated per sol using the NASA GISS Mars24 algorithm, factoring in orbital eccentricity ($r_{AU} = 1.38\text{--}1.66\text{ AU}$), solar declination ($L_s$), and landing latitude.
- **Dust Opacity ($\tau$):** Atmospheric dust scatters sunlight according to Beer-Lambert extinction ($\text{Transmission} = e^{-0.4\tau}$).
- **Extreme Night Cold:** Surface temperatures drop to $-95^\circ\text{C}$ (NASA InSight TWINS sensor). Baseline electric heaters consume $16\text{--}24\text{ kWh/sol}$ and occupy Priority 1. A heater power shortfall triggers an immediate habitat freezeout blackout.

### 2. Life Support & MOXIE Oxygen Generation (NASA BVAD & Perseverance MOXIE)
- **Metabolic Consumption:** The 4-person crew consumes $3.58\text{ kg } \text{O}_2/\text{sol}$ ($0.895\text{ kg}$ per astronaut per day, NASA Life Support Baseline Values).
- **ISRU Electrolysis:** Modeled on Perseverance's **MOXIE** instrument ($12\text{ g/h}$ baseline yield), scaling solid-oxide electrolysis to an industrial outpost system with Off ($0\text{ kWh}$), Normal ($1.0\times$ demand), and Boost ($1.5\times$ demand) modes.

### 3. Food Production & Hydroponic Greenhouse
- **Packed Rations:** Pre-packaged shelf-stable rations provide food for only 17 sols ($0.8\text{ kg}$ dry food/astronaut/day, NASA BVAD).
- **Hydroponics:** Running the greenhouse consumes $12\text{ kWh/sol}$ to grow $2.6\text{ kg/sol}$ of fresh food. Shelter confinement drops yield to $50\%$.

### 4. Radiation Shielding & Space Weather (NASA DONKI & Curiosity RAD)
- **GCR Background:** Continuous surface cosmic radiation averages $0.67\text{ mSv/sol}$ (Curiosity RAD). Habitat structural shielding attenuates this to $0.8\times$.
- **Coronal Mass Ejections (CMEs):** Real solar storm events from NASA DONKI WSA-ENLIL simulations deliver $4\text{--}18\text{ mSv}$ in a single sol.
- **Water-Shielded Bunker:** Sheltering the crew cuts CME dose by $75\%$ ($0.25\times$ factor). Walking outside on EVA during a storm spikes exposure by $1.5\times$.
- **Safety Threshold:** Enforces NASA's $600\text{ mSv}$ career cap scaled to a $30\text{ mSv}$ mission ceiling.

### 5. Communication Delay & Autonomous Operations (JPL Planetary Ephemeris)
- **Orbital Light-Time:** Evaluates real Euclidean distances ($0.37\text{--}2.68\text{ AU}$) from JPL Keplerian tables. Signal latency ranges from $3.1$ to $22.2\text{ minutes}$ one-way.
- **Radio Telemetry Gating:** Powering off the high-gain dish ($4\text{ kWh}$) buffers science in local memory and queues incoming DONKI storm alerts, leaving the outpost blind to imminent space weather.

---

## Key Gameplay Innovations

- **Living Animated SVG Viewport (`viewport.ts`):** A responsive $720 \times 300$ vector diorama. Sky gradients shift with diurnal cycles, dust storms, and CME auroras. MOXIE vents emit oxygen plumes, greenhouse domes glow emerald, antennas pulse radio waves, and astronaut sprites explore the regolith. Every module is a clickable tactile control hotspot.
- **Commander's Critical Decision Gates (`sol.ts`):** High-tension confirmation gates intercept risky commands before sol execution (e.g. attempting an EVA spacewalk during an incoming CME storm, or facing a power shortfall that threatens life support).
- **Junior Astronaut Flight Briefing Deck (`briefing.ts`):** An illustrated 4-card onboarding slide deck teaching young cadets the fundamental physics of deep-space survival.
- **Earth-Mars Telemetry Relay Diagram (`relay.ts`):** Visualizes the relative speed disparity between solar storm plasma ($800\text{--}1400\text{ km/s}$) and speed-of-light radio waves ($300,000\text{ km/s}$).
- **Narrative Commander's Sol Logs (`sol.ts`):** Atmospheric, sol-by-sol mission debrief logs capturing the drama of weathered storms and scientific breakthroughs.
- **Printable Personalized Flight Certificate (`review.ts`):** Cadets enter their name upon mission completion to print an official, framed NASA Space Apps Mission Certificate with their custom rank and seal.
- **Flight Director Heuristic Solver (`planner.ts`):** At mission end, interactive charts contrast the cadet's resource curves against the NASA Flight Director's reference strategy on the exact same storms.
- **31-Bit Base32 Mission Codes (`codes.ts`):** Deterministic flight codes (e.g. `ABC-1234`) allow teachers and students to replay and compete on identical storm profiles.

---

## Scientific & Mathematical Models (`src/compute/`)

All core mathematical routines reside in `src/compute/` and are isolated from browser APIs:

| Module | Physics & Mathematical Implementation | Primary Citations |
|---|---|---|
| `astro.ts` | GISS Mars24 solar orbital coordinates ($L_s$, $\nu$, $M$, $r_{AU}$), daily daylight insolation integral, JPL planetary 3D coordinates, Kepler solver, and speed-of-light delay | NASA GISS Mars24 Algorithm, JPL Approximate Positions of the Planets Table 1 |
| `terrain.ts` | 4-neighbor central difference gradient slope calculation on $128\text{ px/deg}$ MOLA elevation grids; landing safety filter ($\le 15^\circ$) | NASA PDS MGS MOLA MEGDR, Mars Trek |
| `outpost.ts` | Sol step state machine, priority power dispatch, metabolic consumption bookkeeping, radiation shielding attenuation, failure mode verification | NASA BVAD (NTRS 20210024855), Curiosity RAD (NTRS 20180007641), Perseverance MOXIE |
| `planner.ts` | Autonomous heuristic solver simulating an expert NASA Flight Director using only radio-received telemetry | NASA Space Apps Challenge 2026 Statement |
| `mission.ts` | Sol environment synthesizer mapping DONKI CME forecasts and InSight weather telemetry into sol-by-sol conditions | NASA CCMC DONKI, InSight Mars Weather Service |
| `constants.ts` | 33 physical constants linking in-game variables directly to primary scientific literature | BVAD, RAD, MOXIE, NTRS, IAU, JPL |

---

## Codebase Architecture & File Guide

```
E:/NSAC 2026/
├── index.html                   # HTML entry point with PWA metadata and CSP headers
├── package.json                 # Project manifest, scripts, and devDependencies
├── tsconfig.json                # Strict TypeScript configuration
├── vite.config.ts               # Vite build configuration with VitePWA plugin
│
├── content/                     # Data definitions and localization
│   ├── facts.json               # 14 educational facts with source citations
│   ├── sources.json             # 20 verified scientific data sources
│   ├── strings.en.json          # English localization dictionary (293 keys)
│   └── strings.bn.json          # Bengali (বাংলা) localization dictionary (294 keys)
│
├── docs/                        # Architecture and submission documentation
│   ├── AI_USE.md                # Detailed disclosure of AI coding assistance
│   ├── DATA_PLAN.md             # Dataset acquisition specifications and schemas
│   ├── MODEL.md                 # Scientific simplification disclosures
│   ├── PROJECT_DOCUMENTATION.md # Comprehensive master technical documentation
│   ├── RELEVANCE.md             # Scientific justification for all NASA data
│   ├── SUBMISSION.md            # Official NASA Space Apps project draft
│   └── SCORECARD.md             # Space Apps judging criteria self-audit
│
├── public/data/                 # Build-time compiled offline datasets
│   ├── sites.json               # Landing site metadata and elevation tiles (Jezero, Gale, Gusev)
│   ├── spaceweather.json        # Compiled DONKI storm forecasts (8 mission windows)
│   └── weather.json             # Compiled InSight daily weather telemetry
│
├── src/                         # Application source code
│   ├── compute/                 # Pure mathematical core (No DOM, no clock, zero randomness)
│   │   ├── astro.ts             # Mars24 orbit, insolation, JPL light-time
│   │   ├── constants.ts         # 33 physical constants with citation links
│   │   ├── mission.ts           # Sol-by-sol mission environment synthesizer
│   │   ├── outpost.ts           # State machine, life support, priority queue
│   │   ├── planner.ts           # NASA Flight Director heuristic ghost policy
│   │   ├── rng.ts               # Seeded deterministic pseudo-random generator
│   │   └── terrain.ts           # MOLA grid parser, slope checker, landing hazard
│   │
│   ├── game/                    # Game state and hardware abstractions
│   │   ├── audio.ts             # Web Audio procedural synthesizer and Martian wind
│   │   ├── codes.ts             # 31-bit Base32 mission code encoder/decoder
│   │   ├── session.ts           # Session manager, replay engine, adaptive difficulty
│   │   └── storage.ts           # LocalStorage wrapper with error fallbacks
│   │
│   └── ui/                      # Presentation layer and visual screens
│       ├── app.ts               # Screen router and app coordinator
│       ├── briefing.ts          # Junior Astronaut Flight Briefing onboarding deck
│       ├── dom.ts               # Typed hyperscript DOM builder `h()`
│       ├── i18n.ts              # Internationalization and pluralization engine
│       ├── icons.ts             # Vector icon sprite generator (hand-drawn SVG)
│       ├── provenance.ts        # Data provenance drawer and badge renderer
│       ├── relay.ts             # Dynamic Earth-Mars orbital telemetry diagram
│       ├── style.css            # Responsive styles, glassmorphism, print layout
│       ├── viewport.ts          # Interactive animated Mars habitat diorama
│       └── screens/             # Application screen views
│           ├── about.ts         # Scientific model explanation and source matrix
│           ├── review.ts        # Debrief charts, timeline, printable certificate
│           ├── setup.ts         # MOLA altimeter radar, site & window selector
│           ├── sol.ts           # Main command dashboard & decision gates
│           └── title.ts         # Title wordmark, feature pills, navigation menu
│
└── tests/                       # Automated test suites
    ├── e2e/offline.spec.ts      # Playwright offline verification tests
    └── unit/                    # Vitest unit test suites (astro, terrain, outpost, codes, i18n)
```

---

## NASA & Partner Space Agency Data

All data originates from official, verified space agency archives:

| Dataset / Publication | Publisher | Identifier / URL | Role in Simulation |
|---|---|---|---|
| **DONKI WSA-ENLIL Simulations** | NASA CCMC | `api.nasa.gov` | Real CME arrival dates, shock speeds, and storm hazard levels |
| **MGS MOLA MEGDR 128 px/deg** | NASA PDS Geosciences | `megr_e_128.img` | Laser topographic elevation and landing site slope verification |
| **Mars Trek Site Bookmarks** | NASA Solar System Treks | JPL Trek API | Precise coordinates for Jezero, Gale, and Gusev craters |
| **InSight Mars Weather (TWINS)**| NASA PDS / JPL | Archived 2020 Telemetry | Diurnal surface temperatures driving heater consumption |
| **JPL Planetary Elements** | NASA JPL SSD | Table 1 Ephemeris | Earth-Mars distance vectors and radio light-delay |
| **NASA GISS Mars24 Algorithm** | NASA GISS | Mars24 Publication | Solar orbital coordinates ($L_s$) and insolation |
| **Life Support BVAD** | NASA NTRS | NTRS 20210024855 | Human consumption rates ($0.895\text{ kg } \text{O}_2$, $0.8\text{ kg}$ food) |
| **Curiosity RAD Measurements** | NASA NTRS | NTRS 20180007641 | Surface dose rates and May 2024 record storm calibration |
| **Perseverance MOXIE Results** | NASA JPL | Mars 2020 ISRU | Solid oxide electrolysis efficiency and oxygen rate |
| **Career Radiation Limits** | NASA NTRS | NTRS 20230005246 | $600\text{ mSv}$ career cap, scaled to $30\text{ mSv}$ mission ceiling |
| **ESA Mars Express HRSC** | European Space Agency | PSA MEX-M-HRSC | 3D topography and polar atmospheric dynamics |

---

## Bilingual Engine (English & বাংলা)

Red Outpost features complete bilingual parity:
- **Instant Toggle:** Switch between English and Bengali at any time via the navigation bar.
- **Dynamic Formatting:** Translates numerals and calendar dates automatically (e.g. `123` $\rightarrow$ `১২৩`).
- **Accessible Typography:** Shipped with pre-cached WOFF2 font files for **Atkinson Hyperlegible** (Braille Institute) and **Noto Sans Bengali**.

---

## Offline-First PWA & Privacy

- **Zero Runtime Requests:** All datasets, fonts, and logic are bundled locally. Once loaded, the device can be placed in airplane mode indefinitely.
- **Child-Safe & Private:** Contains zero analytics, zero external scripts, zero trackers, and zero telemetry collection.
- **Lightweight:** Entire production bundle compiles to only $\approx 51\text{ kB}$ gzipped JavaScript and $\approx 10\text{ kB}$ gzipped CSS.

---

## Development & Verification Commands

```bash
# 1. Run unit test suite (Vitest: terrain, astro, codes, i18n, outpost physics)
npm test

# 2. Type-check TypeScript codebase
npx tsc --noEmit

# 3. Lint codebase and enforce compute isolation boundaries
npx eslint .

# 4. Verify all citation claims, source URLs, and facts resolve
node scripts/verify-claims.mjs

# 5. Build production PWA bundle
npm run build

# 6. Preview production PWA locally
npm run preview
```

---

## License & Credits

- **Software License:** Apache-2.0 (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).
- **NASA Data:** Public domain per NASA open data policy.
- **Typography:** Atkinson Hyperlegible and Noto Sans Bengali (SIL Open Font License).
- **AI Use Disclosure:** Anthropic Claude was utilized as a coding assistant for API verification, architecture design, and bilingual translation drafting. **No artificial intelligence runs at runtime.** Details available in [docs/AI_USE.md](docs/AI_USE.md).

---

*Dedicated to inspiring the next generation of space commanders.* 🚀
