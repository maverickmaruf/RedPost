// The Flight Director's plan: a simple, transparent rule set that only uses what the crew
// could know (forecasts actually heard over the radio). Its run is the "ghost" in the review.
import { MISSION_DOSE_BUDGET_MSV, v } from './constants';
import { stormDose, stormLevel, type SolEnv } from './mission';
import { crewFood, crewO2, demandFor, initialState, stepSol, type OutpostState, type Plan, type SolReport } from './outpost';

export function flightDirectorPlan(s: OutpostState, env: readonly SolEnv[]): Plan {
  const today = env[s.sol] as SolEnv;
  const ids = new Set(s.known.map((f) => f.simulationID));
  const knownStorm = today.arrivals.filter((f) => ids.has(f.simulationID)).map(stormLevel);
  const worst = knownStorm.includes('strong') ? 'strong' : knownStorm.includes('moderate') ? 'moderate' : knownStorm.length ? 'minor' : 'none';
  const solsLeft = v('MISSION_SOLS') - s.sol;
  const doseRoom = MISSION_DOSE_BUDGET_MSV() - s.doseMSv;

  const shelter = worst === 'strong' || worst === 'moderate' || (worst === 'minor' && doseRoom < solsLeft * 0.7 + 3);
  const o2Days = s.o2Kg / crewO2();
  const air = o2Days < 2.5 ? 'boost' : o2Days < 5 ? 'normal' : 'off';
  const foodDays = s.foodKg / crewFood();
  const greenhouse = foodDays < solsLeft + 2;
  const radio = s.sol % 2 === 0 || s.scienceBuffered >= 6 || s.sol === v('MISSION_SOLS') - 1;
  let plan: Plan = { air, greenhouse, radio, crew: shelter ? 'shelter' : 'eva' };

  // Stay inside the power budget: drop the walk first, then the greenhouse if food is safe.
  const fits = (p: Plan): boolean => {
    const d = demandFor(p, today);
    const total = d.heaters + d.air + d.crew + d.radio + d.greenhouse;
    return total <= s.batteryKWh + today.generationKWh - 8; // keep 8 kWh for the night
  };
  // Give things up in this order until the plan fits. Food and air are protected while they are short.
  const lastSol = s.sol === v('MISSION_SOLS') - 1;
  const steps: ((p: Plan) => Plan | null)[] = [
    (p) => (p.crew === 'eva' ? { ...p, crew: 'lab' } : null),
    (p) => (p.radio && !lastSol && s.scienceBuffered < 9 ? { ...p, radio: false } : null),
    (p) => (p.air === 'boost' ? { ...p, air: 'normal' } : null),
    (p) => (p.greenhouse && foodDays > Math.min(6, solsLeft) ? { ...p, greenhouse: false } : null),
    (p) => (p.air === 'normal' && o2Days > 2 ? { ...p, air: 'off' } : null),
    (p) => (p.crew === 'lab' ? { ...p, crew: 'shelter' } : null),
  ];
  for (const step of steps) {
    if (fits(plan)) break;
    plan = step(plan) ?? plan;
  }
  return plan;
}

export interface RunResult {
  final: OutpostState;
  reports: SolReport[];
}

/** Play a whole mission with a policy. Used for the ghost and for balance tests. */
export function runMission(env: readonly SolEnv[], policy: (s: OutpostState, env: readonly SolEnv[]) => Plan, help: 0 | 1 = 0): RunResult {
  let s = initialState(help);
  const reports: SolReport[] = [];
  while (s.status === 'running' && s.sol < env.length) {
    const r = stepSol(s, policy(s, env), env[s.sol] as SolEnv);
    reports.push(r);
    s = r.after;
  }
  return { final: s, reports };
}

/** Expected unshielded storm dose of a mission: a quick difficulty number for the window picker. */
export function stormLoadMSv(env: readonly SolEnv[]): number {
  return env.reduce((a, e) => a + stormDose(e.storm), 0);
}
