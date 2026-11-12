import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MISSION_DOSE_BUDGET_MSV, v } from '../../src/compute/constants';
import { buildMission, stormLevel, type MarsForecast, type SolEnv, type WeatherSol } from '../../src/compute/mission';
import { crewFood, crewO2, initialState, stepSol, stars, type Plan } from '../../src/compute/outpost';
import { flightDirectorPlan, runMission } from '../../src/compute/planner';

const root = join(__dirname, '..', '..');
const load = (f: string) => JSON.parse(readFileSync(join(root, 'public', 'data', f), 'utf8'));
const space = load('spaceweather.json') as { windows: { id: string; start: string; marsForecasts: MarsForecast[] }[] };
const weather = load('weather.json') as { sols: WeatherSol[] };

const flatEnv = (over: Partial<SolEnv> = {}): SolEnv => ({
  index: 0, startMs: 0, dateISO: '2024-05-01T00:00:00.000Z', ls: 0, rAU: 1.5, lightTimeS: 600,
  dustTau: 0.5, dustSimulated: true, generationKWh: 60, outsideAvgC: -60, insightSol: 675, heaterKWh: 15,
  storm: 'none', stormExtraMSv: 0, messages: [], arrivals: [], ...over,
});
const plan = (p: Partial<Plan> = {}): Plan => ({ air: 'normal', greenhouse: true, radio: true, crew: 'lab', ...p });

describe('one sol: exact accounting', () => {
  it('energy balance closes: battery_next + wasted = battery + generated - served demand', () => {
    const s0 = initialState();
    const r = stepSol(s0, plan({ crew: 'eva' }), flatEnv());
    const served = (Object.keys(r.demandKWh) as (keyof typeof r.demandKWh)[]).reduce((a, k) => a + (r.served[k] ? r.demandKWh[k] : 0), 0);
    expect(r.after.batteryKWh + r.wastedKWh).toBeCloseTo(s0.batteryKWh + r.generatedKWh - served, 10);
  });
  it('oxygen and food mass balances are exact', () => {
    const s0 = initialState();
    const r = stepSol(s0, plan(), flatEnv());
    expect(r.after.o2Kg).toBeCloseTo(s0.o2Kg + r.o2MadeKg - crewO2(), 12);
    expect(r.after.foodKg).toBeCloseTo(s0.foodKg + r.foodGrownKg - crewFood(), 12);
  });
  it('crew needs come from the cited NASA BVAD values', () => {
    expect(crewO2()).toBeCloseTo(4 * 0.895, 12);
    expect(crewFood()).toBeCloseTo(4 * 0.8, 12);
  });
  it('a quiet sol inside the habitat adds 0.67 x 0.8 mSv', () => {
    const r = stepSol(initialState(), plan(), flatEnv());
    expect(r.after.doseMSv).toBeCloseTo(0.67 * 0.8, 12);
  });
  it('the shelter cuts storm dose to a quarter, a walk raises it by half', () => {
    const storm = flatEnv({ storm: 'strong', stormExtraMSv: v('STORM_STRONG_MSV') });
    const inS = stepSol(initialState(), plan({ crew: 'shelter' }), storm);
    const out = stepSol(initialState(), plan({ crew: 'eva' }), storm);
    expect(inS.doseStormMSv).toBeCloseTo(4 * 0.25, 12);
    expect(out.doseStormMSv).toBeCloseTo(4 * 1.5, 12);
  });
  it('no choice is free: shelter halves greenhouse output and earns no science', () => {
    const r = stepSol(initialState(), plan({ crew: 'shelter' }), flatEnv());
    expect(r.foodGrownKg).toBeCloseTo(v('GREENHOUSE_KG_PER_SOL') / 2, 12);
    expect(r.scienceGained).toBe(0);
  });
  it('power shortage cuts the greenhouse before the air plant, heaters last', () => {
    const s0 = { ...initialState(), batteryKWh: 0 };
    const r = stepSol(s0, plan({ crew: 'eva' }), flatEnv({ generationKWh: 15 + 14.32 + 6 }));
    expect(r.served.heaters && r.served.air && r.served.crew).toBe(true);
    expect(r.cut).toEqual(['radio', 'greenhouse']);
  });
  it('heaters unpowered is a blackout failure', () => {
    const r = stepSol({ ...initialState(), batteryKWh: 0 }, plan(), flatEnv({ generationKWh: 1 }));
    expect(r.after.status).toBe('failed');
    expect(r.after.failure).toBe('blackout');
  });
  it('science only counts once the radio sends it', () => {
    const r1 = stepSol(initialState(), plan({ crew: 'eva', radio: false }), flatEnv());
    expect(r1.after.scienceSent).toBe(0);
    expect(r1.after.scienceBuffered).toBe(3);
    const r2 = stepSol(r1.after, plan({ crew: 'lab', radio: true }), flatEnv());
    expect(r2.after.scienceSent).toBe(4);
  });
  it('forecasts heard with the radio off are queued, not lost', () => {
    const f: MarsForecast = { simulationID: 'X', issued: '2024-05-01T00:00Z', arrival: '2024-05-03T00:00Z', glancing: false, speed_km_s: 1200 };
    const r1 = stepSol(initialState(), plan({ radio: false }), flatEnv({ messages: [f] }));
    expect(r1.after.known).toHaveLength(0);
    const r2 = stepSol(r1.after, plan({ radio: true }), flatEnv());
    expect(r2.after.known.map((x) => x.simulationID)).toEqual(['X']);
  });
});

describe('storms from DONKI forecasts', () => {
  it('classifies glancing, moderate and strong', () => {
    expect(stormLevel({ glancing: true, speed_km_s: 2000 })).toBe('minor');
    expect(stormLevel({ glancing: false, speed_km_s: 700 })).toBe('moderate');
    expect(stormLevel({ glancing: false, speed_km_s: 1500 })).toBe('strong');
  });
  it('every real cached window builds 30 sols with finite power and light-time', () => {
    for (const w of space.windows) {
      const env = buildMission({ startISO: w.start, sols: 30, siteLatDeg: 18.465, forecasts: w.marsForecasts, weather: weather.sols, seed: 1 });
      expect(env).toHaveLength(30);
      for (const e of env) {
        expect(e.generationKWh).toBeGreaterThan(0);
        expect(e.lightTimeS / 60).toBeGreaterThan(3);
        expect(e.lightTimeS / 60).toBeLessThan(23);
      }
    }
  });
  it('a forecast is never delivered after its storm arrives', () => {
    const w = space.windows[0]!;
    const env = buildMission({ startISO: w.start, sols: 30, siteLatDeg: 18.465, forecasts: w.marsForecasts, weather: weather.sols, seed: 1 });
    env.forEach((e, k) => e.messages.forEach((m) => {
      const arr = env.findIndex((x) => x.arrivals.some((a) => a.simulationID === m.simulationID));
      expect(arr).toBeGreaterThanOrEqual(k);
    }));
  });
});

describe('whole missions', () => {
  const missions = space.windows.map((w) => ({ id: w.id, env: buildMission({ startISO: w.start, sols: 30, siteLatDeg: 18.465, forecasts: w.marsForecasts, weather: weather.sols, seed: 7 }) }));

  it('deterministic: same seed, same plan, same result', () => {
    const a = runMission(missions[0]!.env, flightDirectorPlan);
    const b = runMission(missions[0]!.env, flightDirectorPlan);
    expect(JSON.stringify(a.final)).toBe(JSON.stringify(b.final));
  });
  it('the Flight Director plan survives every real window at Jezero', () => {
    for (const m of missions) {
      const r = runMission(m.env, flightDirectorPlan);
      expect({ id: m.id, status: r.final.status, failure: r.final.failure }).toEqual({ id: m.id, status: 'won', failure: null });
      expect(r.final.doseMSv).toBeLessThanOrEqual(MISSION_DOSE_BUDGET_MSV());
    }
  });
  it('ignoring the radio and walking every day fails in May 2024', () => {
    const r = runMission(missions[0]!.env, () => ({ air: 'normal', greenhouse: true, radio: false, crew: 'eva' }));
    expect(r.final.status).toBe('failed');
  });
  it('hiding in the shelter all mission survives but earns no stars for science', () => {
    const r = runMission(missions[0]!.env, (s) => ({ air: s.o2Kg < 8 ? 'normal' : 'off', greenhouse: true, radio: true, crew: 'shelter' }));
    expect(r.final.scienceSent).toBe(0);
    expect(stars(r.final)).toBeLessThanOrEqual(1);
  });
});

describe('adaptive help', () => {
  it('adds the stated supplies and nothing else', () => {
    const a = initialState(0), b = initialState(1);
    expect(b.batteryKWh - a.batteryKWh).toBe(v('HELP_BATTERY_KWH'));
    expect(b.o2Kg - a.o2Kg).toBe(v('HELP_O2_KG'));
    expect(b.foodKg - a.foodKg).toBe(v('HELP_FOOD_KG'));
    expect({ ...b, batteryKWh: 0, o2Kg: 0, foodKg: 0 }).toEqual({ ...a, batteryKWh: 0, o2Kg: 0, foodKg: 0 });
  });
  it('never overfills the battery or tank', () => {
    expect(initialState(1).batteryKWh).toBeLessThanOrEqual(v('BATTERY_KWH_MAX'));
    expect(initialState(1).o2Kg).toBeLessThanOrEqual(v('O2_TANK_MAX_KG'));
  });
});
