// Astronomy for the outpost: Mars season and Sun distance (NASA GISS Mars24 algorithm),
// Earth-Mars distance and radio light-time (JPL approximate Keplerian elements),
// and sol-averaged sunlight on flat ground at a given latitude.
// Pure functions. Time is always an input; nothing reads the clock.
import { v } from './constants';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const sinD = (d: number): number => Math.sin(d * D2R);
const cosD = (d: number): number => Math.cos(d * D2R);
const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** Julian Date (UT) from Unix milliseconds. Mars24 step A-2. */
export const jdUT = (unixMs: number): number => 2440587.5 + unixMs / 86400000;

/** Days since J2000 in Terrestrial Time. Mars24 steps A-4..A-6 (valid after 2017-01-01). */
export function deltaJ2000(unixMs: number): number {
  return jdUT(unixMs) + v('TT_MINUS_UTC_S') / 86400 - 2451545.0;
}

export interface MarsSeason {
  /** Areocentric solar longitude Ls, degrees: Mars's season. 0 = northern spring. */
  ls: number;
  /** Mars-Sun distance in au. */
  rAU: number;
  /** Solar declination at Mars, degrees. */
  declination: number;
  meanAnomaly: number;
  equationOfCenter: number;
}

const PBS_TERMS: ReadonlyArray<readonly [number, number, number]> = [
  [0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837],
  [0.0037, 15.7866, 21.736], [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528],
  [0.0018, 32.8493, 49.095],
];

/** Mars24 steps B-1..B-5, D-1, D-2 (Allison & McEwen 2000, as revised on the Mars24 page). */
export function marsSeason(dtJ2000: number): MarsSeason {
  const M = 19.3871 + 0.52402073 * dtJ2000;
  const alphaFMS = 270.3871 + 0.524038496 * dtJ2000;
  let pbs = 0;
  for (const [A, tau, phi] of PBS_TERMS) pbs += A * cosD((0.985626 * dtJ2000) / tau + phi);
  const eoc =
    (10.691 + 3.0e-7 * dtJ2000) * sinD(M) + 0.623 * sinD(2 * M) + 0.05 * sinD(3 * M) +
    0.005 * sinD(4 * M) + 0.0005 * sinD(5 * M) + pbs;
  const ls = norm360(alphaFMS + eoc);
  const declination = Math.asin(0.42565 * sinD(ls)) * R2D + 0.25 * sinD(ls);
  const rAU = 1.52367934 * (1.00436 - 0.09309 * cosD(M) - 0.004336 * cosD(2 * M) - 0.00031 * cosD(3 * M) - 0.00003 * cosD(4 * M));
  return { ls, rAU, declination, meanAnomaly: norm360(M), equationOfCenter: eoc };
}

// JPL "Approximate Positions of the Planets", Table 1 (1800-2050), J2000 ecliptic.
// [a au, e, I deg, L deg, long.peri deg, long.node deg] and rates per Julian century.
type Elements = readonly [number, number, number, number, number, number];
const EM_BARY: readonly [Elements, Elements] = [
  [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
];
const MARS: readonly [Elements, Elements] = [
  [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
];

/** Solve Kepler's equation M = E - e sin E (radians) by Newton iteration. */
export function solveKepler(Mrad: number, e: number): number {
  let E = Mrad + e * Math.sin(Mrad);
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/** Heliocentric ecliptic position (au) following the JPL approx_pos recipe. */
export function heliocentric(el: readonly [Elements, Elements], dtJ2000: number): [number, number, number] {
  const T = dtJ2000 / 36525;
  const [a, e, I, L, wbar, node] = el[0].map((x0, i) => x0 + (el[1][i] as number) * T) as unknown as Elements;
  const w = wbar - node;
  let M = norm360(L - wbar);
  if (M > 180) M -= 360;
  const E = solveKepler(M * D2R, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = cosD(w), sw = sinD(w), cO = cosD(node), sO = sinD(node), cI = cosD(I), sI = sinD(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

export const earthPosition = (dt: number): [number, number, number] => heliocentric(EM_BARY, dt);
export const marsPosition = (dt: number): [number, number, number] => heliocentric(MARS, dt);

/** Earth-Mars distance in au. */
export function earthMarsDistanceAU(dtJ2000: number): number {
  const e = earthPosition(dtJ2000), m = marsPosition(dtJ2000);
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]);
}

/** One-way radio light-time Earth to Mars, in seconds. */
export function lightTimeSeconds(dtJ2000: number): number {
  return (earthMarsDistanceAU(dtJ2000) * v('AU_KM')) / v('SPEED_OF_LIGHT_KM_S');
}

/**
 * Sol-averaged sunlight on flat ground at the top of the atmosphere, W/m^2.
 * Standard daily-insolation formula: Q = (S/pi) (h0 sin(phi) sin(dec) + cos(phi) cos(dec) sin(h0)).
 */
export function dailyMeanInsolation(latDeg: number, declDeg: number, rAU: number): number {
  const S = v('SOLAR_IRRADIANCE_1AU') / (rAU * rAU);
  const phi = latDeg * D2R, dec = declDeg * D2R;
  const x = -Math.tan(phi) * Math.tan(dec);
  const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
  return (S / Math.PI) * (h0 * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(h0));
}

/** Electrical energy from the solar array over one sol, kWh. */
export function arrayEnergyKWh(latDeg: number, season: MarsSeason, dustTau: number): number {
  const q = dailyMeanInsolation(latDeg, season.declination, season.rAU);
  const transmission = Math.exp(-v('DUST_EXTINCTION') * dustTau);
  return (q * transmission * v('ARRAY_AREA_M2') * v('ARRAY_EFFICIENCY') * v('MARS_SOL_HOURS')) / 1000;
}

/** Start time (Unix ms, UTC) of sol index k for a mission starting at startMs. */
export const solStartMs = (startMs: number, k: number): number => startMs + k * v('MARS_SOL_EARTH_DAYS') * 86400000;
