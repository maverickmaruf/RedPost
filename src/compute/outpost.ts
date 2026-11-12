// The outpost rules: one sol at a time. Pure, deterministic, exactly accounted.
import { MISSION_DOSE_BUDGET_MSV, v } from './constants';
import type { MarsForecast, SolEnv } from './mission';

export type AirMode = 'off' | 'normal' | 'boost';
export type CrewMode = 'eva' | 'lab' | 'shelter';

export interface Plan {
  air: AirMode;
  greenhouse: boolean;
  radio: boolean;
  crew: CrewMode;
}

export type Failure = 'air' | 'food' | 'radiation' | 'blackout';

export interface OutpostState {
  sol: number;
  batteryKWh: number;
  o2Kg: number;
  foodKg: number;
  doseMSv: number;
  scienceBuffered: number;
  scienceSent: number;
  /** Forecasts the crew has heard about over the radio. */
  known: MarsForecast[];
  /** Forecasts that reached Mars while the radio was off; delivered next time it is on. */
  queued: MarsForecast[];
  status: 'running' | 'won' | 'failed';
  failure: Failure | null;
}

export type System = 'heaters' | 'air' | 'crew' | 'radio' | 'greenhouse';

export interface SolReport {
  sol: number;
  generatedKWh: number;
  wastedKWh: number;
  demandKWh: Record<System, number>;
  served: Record<System, boolean>;
  cut: System[];
  o2MadeKg: number;
  o2UsedKg: number;
  foodGrownKg: number;
  foodEatenKg: number;
  doseBaseMSv: number;
  doseStormMSv: number;
  scienceGained: number;
  scienceSentNow: number;
  heard: MarsForecast[];
  before: OutpostState;
  after: OutpostState;
}

export const crewO2 = (): number => v('CREW') * v('O2_PER_CREW_KG_DAY');
export const crewFood = (): number => v('CREW') * v('FOOD_PER_CREW_KG_DAY');

export function initialState(): OutpostState {
  return {
    sol: 0, batteryKWh: v('BATTERY_KWH_START'), o2Kg: v('O2_TANK_START_KG'), foodKg: v('FOOD_START_KG'),
    doseMSv: 0, scienceBuffered: 0, scienceSent: 0, known: [], queued: [], status: 'running', failure: null,
  };
}

export function airOutputKg(mode: AirMode): number {
  return mode === 'off' ? 0 : mode === 'normal' ? crewO2() : 1.5 * crewO2();
}

export function demandFor(plan: Plan, env: SolEnv): Record<System, number> {
  return {
    heaters: env.heaterKWh,
    air: airOutputKg(plan.air) * v('O2_KWH_PER_KG'),
    crew: plan.crew === 'eva' ? v('EVA_KWH') : plan.crew === 'lab' ? v('LAB_KWH') : v('SHELTER_KWH'),
    radio: plan.radio ? v('RADIO_KWH') : 0,
    greenhouse: plan.greenhouse ? v('GREENHOUSE_KWH') : 0,
  };
}

/** Power goes to systems in this order. Anything that does not fit is switched off for the sol. */
export const PRIORITY: readonly System[] = ['heaters', 'air', 'crew', 'radio', 'greenhouse'];

export function stepSol(state: OutpostState, plan: Plan, env: SolEnv): SolReport {
  if (state.status !== 'running') throw new Error('mission already over');
  const demand = demandFor(plan, env);
  let available = state.batteryKWh + env.generationKWh;
  const served = { heaters: false, air: false, crew: false, radio: false, greenhouse: false } as Record<System, boolean>;
  const cut: System[] = [];
  for (const sys of PRIORITY) {
    const d = demand[sys];
    if (d === 0) continue; // switched off by the player: not served, not cut
    if (d <= available + 1e-9) {
      served[sys] = true;
      available -= d;
    } else {
      cut.push(sys);
    }
  }
  const battery = Math.min(v('BATTERY_KWH_MAX'), available);
  const wasted = available - battery;

  // Crew mode actually achieved: if the crew system was cut, everyone waits in the habitat.
  const crew: CrewMode | 'idle' = served.crew ? plan.crew : 'idle';

  const o2Made = served.air ? airOutputKg(plan.air) : 0;
  const o2Used = crewO2();
  const o2 = Math.min(v('O2_TANK_MAX_KG'), state.o2Kg + o2Made) - o2Used;

  const tending = crew === 'shelter' ? 0.5 : 1;
  const foodGrown = served.greenhouse ? v('GREENHOUSE_KG_PER_SOL') * tending : 0;
  const foodEaten = crewFood();
  const food = state.foodKg + foodGrown - foodEaten;

  const doseBase = v('MARS_SURFACE_DOSE_MSV_DAY') * (crew === 'eva' ? 1 : v('HAB_GCR_FACTOR'));
  const stormFactor = crew === 'shelter' ? v('SHELTER_FACTOR') : crew === 'eva' ? v('EVA_STORM_FACTOR') : 1;
  const doseStorm = env.stormExtraMSv * stormFactor;
  const dose = state.doseMSv + doseBase + doseStorm;

  const gained = crew === 'eva' ? v('EVA_SCIENCE') : crew === 'lab' ? v('LAB_SCIENCE') : 0;
  let buffered = state.scienceBuffered + gained;
  let sentNow = 0;

  // Radio: hear forecasts that reached Mars this sol plus anything queued while it was off.
  const incoming = [...state.queued, ...env.messages];
  let known = state.known;
  let queued: MarsForecast[] = [];
  let heard: MarsForecast[] = [];
  if (served.radio) {
    heard = incoming;
    known = [...state.known, ...incoming];
    sentNow = buffered;
    buffered = 0;
  } else {
    queued = incoming;
  }

  let status: OutpostState['status'] = 'running';
  let failure: Failure | null = null;
  if (!served.heaters) failure = 'blackout';
  else if (o2 < 0) failure = 'air';
  else if (food < 0) failure = 'food';
  else if (dose > MISSION_DOSE_BUDGET_MSV()) failure = 'radiation';
  if (failure) status = 'failed';
  else if (state.sol + 1 >= v('MISSION_SOLS')) status = 'won';

  const after: OutpostState = {
    sol: state.sol + 1, batteryKWh: battery, o2Kg: o2, foodKg: food, doseMSv: dose,
    scienceBuffered: buffered, scienceSent: state.scienceSent + sentNow, known, queued, status, failure,
  };
  return {
    sol: state.sol, generatedKWh: env.generationKWh, wastedKWh: wasted, demandKWh: demand, served, cut,
    o2MadeKg: o2Made, o2UsedKg: o2Used, foodGrownKg: foodGrown, foodEatenKg: foodEaten,
    doseBaseMSv: doseBase, doseStormMSv: doseStorm, scienceGained: gained, scienceSentNow: sentNow,
    heard, before: state, after,
  };
}

export type Stars = 0 | 1 | 2 | 3;
export function stars(s: OutpostState): Stars {
  if (s.status !== 'won') return 0;
  const goal = v('SCIENCE_GOAL');
  if (s.scienceSent >= goal && s.doseMSv <= 0.9 * MISSION_DOSE_BUDGET_MSV()) return 3;
  if (s.scienceSent >= 0.8 * goal) return 2;
  return 1;
}

/** Forecast storms the crew knows about that land within the next `horizon` sols. */
export function knownStormsAhead(s: OutpostState, env: readonly SolEnv[], horizon = 3): { sol: number; f: MarsForecast }[] {
  const ids = new Set(s.known.map((f) => f.simulationID));
  const out: { sol: number; f: MarsForecast }[] = [];
  for (let k = s.sol; k < Math.min(env.length, s.sol + horizon); k++) {
    for (const f of (env[k] as SolEnv).arrivals) if (ids.has(f.simulationID)) out.push({ sol: k, f });
  }
  return out;
}
