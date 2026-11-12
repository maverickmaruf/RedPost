// Game session: wraps the pure compute core with setup, saves (by replaying plans) and progress.
import { v } from '../compute/constants';
import { buildMission, type SolEnv } from '../compute/mission';
import { initialState, stars, stepSol, type OutpostState, type Plan, type SolReport, type Stars } from '../compute/outpost';
import { flightDirectorPlan, runMission, type RunResult } from '../compute/planner';
import { checkLanding, pixelSizeM, type Grid } from '../compute/terrain';
import type { GameData, SiteData, SpaceWindow } from '../data/load';
import { store } from './storage';

export interface Setup {
  siteId: SiteData['id'];
  landing: { r: number; c: number };
  windowId: string;
  seed: number;
}

export function siteGrid(site: SiteData): Grid {
  const { dxM, dyM } = pixelSizeM(site.grid.pixelDeg, site.center.lat);
  return { rows: site.grid.rows, cols: site.grid.cols, elevation_m: site.grid.elevation_m, dxM, dyM };
}

export function landingCheck(site: SiteData, r: number, c: number) {
  return checkLanding(siteGrid(site), r, c, v('SLOPE_LIMIT_DEG'));
}

export function envFor(data: GameData, setup: Setup): SolEnv[] {
  const site = data.sites.sites.find((s) => s.id === setup.siteId);
  const win = data.space.windows.find((w) => w.id === setup.windowId);
  if (!site || !win) throw new Error('unknown site or window');
  return buildMission({
    startISO: win.start, sols: v('MISSION_SOLS'), siteLatDeg: site.center.lat,
    forecasts: win.marsForecasts, weather: data.weather.sols, seed: setup.seed,
  });
}

export type PlayedSol = SolReport & { plan: Plan };

export const DEFAULT_PLAN: Plan = { air: 'normal', greenhouse: true, radio: true, crew: 'lab' };

export class Session {
  readonly env: SolEnv[];
  readonly reports: PlayedSol[] = [];
  state: OutpostState = initialState();
  draft: Plan = { ...DEFAULT_PLAN };
  private ghostCache: RunResult | null = null;

  constructor(readonly data: GameData, readonly setup: Setup, plans: Plan[] = []) {
    this.env = envFor(data, setup);
    for (const p of plans) {
      if (this.state.status !== 'running') break;
      this.step(p, false);
    }
    if (plans.length) this.draft = { ...(plans[plans.length - 1] as Plan) };
  }

  get site(): SiteData {
    return this.data.sites.sites.find((s) => s.id === this.setup.siteId) as SiteData;
  }
  get window(): SpaceWindow {
    return this.data.space.windows.find((w) => w.id === this.setup.windowId) as SpaceWindow;
  }
  get today(): SolEnv {
    return this.env[Math.min(this.state.sol, this.env.length - 1)] as SolEnv;
  }
  get plans(): Plan[] {
    return this.reports.map((r) => r.plan);
  }

  step(plan: Plan, save = true): PlayedSol {
    const r: PlayedSol = { ...stepSol(this.state, plan, this.today), plan: { ...plan } };
    this.reports.push(r);
    this.state = r.after;
    if (save) this.save();
    if (this.state.status !== 'running') recordResult(this.setup, stars(this.state));
    return r;
  }

  /** The Flight Director's run on the same environment: the ghost in the review. */
  ghost(): RunResult {
    this.ghostCache ??= runMission(this.env, flightDirectorPlan);
    return this.ghostCache;
  }

  save(): void {
    if (this.state.status === 'running') store.set('game', { setup: this.setup, plans: this.plans });
    else store.remove('game');
  }
}

export function loadSaved(data: GameData): Session | null {
  const saved = store.get<{ setup: Setup; plans: Plan[] } | null>('game', null);
  if (!saved?.setup) return null;
  try {
    const s = new Session(data, saved.setup, saved.plans ?? []);
    return s.state.status === 'running' ? s : null;
  } catch {
    store.remove('game'); // data changed or save corrupt: start fresh rather than crash
    return null;
  }
}

/** Judge mode: Jezero in May 2024, the Flight Director flies the first 11 sols, the judge takes over before the big storms. */
export function judgeSession(data: GameData): Session {
  const win = data.space.windows.find((w) => w.id === '2024-05') ?? (data.space.windows[0] as SpaceWindow);
  const setup: Setup = { siteId: 'jezero', landing: { r: 48, c: 48 }, windowId: win.id, seed: 2024 };
  const s = new Session(data, setup);
  while (s.state.sol < 11 && s.state.status === 'running') s.step(flightDirectorPlan(s.state, s.env), false);
  s.draft = { ...DEFAULT_PLAN, radio: true };
  return s;
}

// --- Progress: best stars per site+month, ranks from total stars. Local only. ---
type Best = Record<string, Stars>;
export function recordResult(setup: Setup, st: Stars): void {
  const best = store.get<Best>('best', {});
  const key = `${setup.siteId}|${setup.windowId}`;
  if ((best[key] ?? 0) < st) best[key] = st;
  store.set('best', best);
}
export function totalStars(): number {
  return Object.values(store.get<Best>('best', {})).reduce((a: number, b) => a + b, 0);
}
export const rankIndex = (stars: number): 0 | 1 | 2 | 3 => (stars >= 9 ? 3 : stars >= 6 ? 2 : stars >= 3 ? 1 : 0);
export const bestFor = (siteId: string, windowId: string): Stars => store.get<Best>('best', {})[`${siteId}|${windowId}`] ?? 0;
