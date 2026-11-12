// Builds the per-sol environment for a mission from real data:
//   - DONKI WSA-ENLIL forecast CME arrivals at Mars  -> storm sols and forecast messages
//   - JPL ephemeris                                   -> Earth-Mars radio delay on each date
//   - Mars24 season + site latitude                   -> sunlight -> solar power
//   - InSight archived air temperatures               -> heater demand
//   - seeded dust opacity                             -> simulated dusty days (labelled simulated)
import { v } from './constants';
import { arrayEnergyKWh, deltaJ2000, lightTimeSeconds, marsSeason, solStartMs } from './astro';
import { mulberry32 } from './rng';

export interface MarsForecast {
  simulationID: string;
  issued: string;
  arrival: string;
  glancing: boolean;
  speed_km_s: number | null;
  link?: string;
}

export type StormLevel = 'none' | 'minor' | 'moderate' | 'strong';

export interface WeatherSol {
  sol: number;
  at_avg_c: number;
  at_min_c: number;
  at_max_c: number;
}

export interface SolEnv {
  index: number;
  startMs: number;
  dateISO: string;
  ls: number;
  rAU: number;
  lightTimeS: number;
  dustTau: number;
  dustSimulated: true;
  generationKWh: number;
  outsideAvgC: number;
  insightSol: number;
  heaterKWh: number;
  storm: StormLevel;
  stormExtraMSv: number;
  /** Forecasts that reach the outpost radio during this sol (Earth issue time + light time). */
  messages: MarsForecast[];
  /** Forecast arrivals that land in this sol (what actually happens). */
  arrivals: MarsForecast[];
}

export function stormLevel(f: Pick<MarsForecast, 'glancing' | 'speed_km_s'>): Exclude<StormLevel, 'none'> {
  if (f.glancing) return 'minor';
  return (f.speed_km_s ?? 0) >= v('STRONG_CME_KM_S') ? 'strong' : 'moderate';
}

const RANK: Record<StormLevel, number> = { none: 0, minor: 1, moderate: 2, strong: 3 };
export const stormDose = (l: StormLevel): number =>
  l === 'strong' ? v('STORM_STRONG_MSV') : l === 'moderate' ? v('STORM_MODERATE_MSV') : l === 'minor' ? v('STORM_MINOR_MSV') : 0;

/** Simulated dust opacity per sol: calm days near 0.5 with occasional dusty spells. Seeded. */
export function dustSeries(seed: number, n: number): number[] {
  const rnd = mulberry32(seed ^ 0x5eed);
  const out: number[] = [];
  let spell = 0;
  for (let i = 0; i < n; i++) {
    if (spell === 0 && rnd() < 0.08) spell = 2 + Math.floor(rnd() * 3);
    const base = 0.4 + rnd() * 0.3;
    out.push(spell > 0 ? 1.5 + rnd() * 1.5 : base);
    if (spell > 0) spell--;
  }
  return out;
}

export interface MissionInput {
  startISO: string;
  sols: number;
  siteLatDeg: number;
  forecasts: readonly MarsForecast[];
  weather: readonly WeatherSol[];
  seed: number;
}

export function buildMission(inp: MissionInput): SolEnv[] {
  const start = Date.parse(inp.startISO);
  if (!Number.isFinite(start)) throw new Error('bad start date');
  if (inp.weather.length === 0) throw new Error('no weather sols');
  const dust = dustSeries(inp.seed, inp.sols);
  const solIndexOf = (ms: number): number => Math.floor((ms - start) / (v('MARS_SOL_EARTH_DAYS') * 86400000));

  const env: SolEnv[] = [];
  for (let k = 0; k < inp.sols; k++) {
    const t = solStartMs(start, k);
    const mid = t + 0.5 * v('MARS_SOL_EARTH_DAYS') * 86400000;
    const dt = deltaJ2000(mid);
    const season = marsSeason(dt);
    const w = inp.weather[k % inp.weather.length] as WeatherSol;
    const heaterKWh = v('HAB_HEAT_LOSS_KW_PER_K') * (v('HAB_INSIDE_C') - w.at_avg_c) * v('MARS_SOL_HOURS');
    const tau = dust[k] as number;
    env.push({
      index: k, startMs: t, dateISO: new Date(t).toISOString(),
      ls: season.ls, rAU: season.rAU, lightTimeS: lightTimeSeconds(dt),
      dustTau: tau, dustSimulated: true,
      generationKWh: arrayEnergyKWh(inp.siteLatDeg, season, tau),
      outsideAvgC: w.at_avg_c, insightSol: w.sol, heaterKWh,
      storm: 'none', stormExtraMSv: 0, messages: [], arrivals: [],
    });
  }
  for (const f of inp.forecasts) {
    const arr = solIndexOf(Date.parse(f.arrival));
    const issuedMs = Date.parse(f.issued);
    const recv = Math.max(0, solIndexOf(issuedMs + lightTimeSeconds(deltaJ2000(issuedMs)) * 1000));
    if (arr >= 0 && arr < inp.sols) {
      const e = env[arr] as SolEnv;
      e.arrivals.push(f);
      const lvl = stormLevel(f);
      if (RANK[lvl] > RANK[e.storm]) e.storm = lvl;
      e.stormExtraMSv = stormDose(e.storm);
    }
    // A forecast is useful only if it arrives before the storm does.
    if (arr >= 0 && recv < inp.sols && recv <= arr) (env[recv] as SolEnv).messages.push(f);
  }
  return env;
}
