import { describe, expect, it } from 'vitest';
import { dailyMeanInsolation, deltaJ2000, earthMarsDistanceAU, earthPosition, lightTimeSeconds, marsPosition, marsSeason, solveKepler } from '../../src/compute/astro';
import { v } from '../../src/compute/constants';

describe('Mars24 algorithm (NASA GISS worked example: 2000-01-06 00:00 UTC)', () => {
  // The worked example uses TT-UTC = 64.184 s for that date; we feed its Δt directly.
  const s = marsSeason(4.50074);
  it('mean anomaly M = 21.74558 deg', () => expect(s.meanAnomaly).toBeCloseTo(21.74558, 4));
  it('equation of centre = 4.44193 deg', () => expect(s.equationOfCenter).toBeCloseTo(4.44193, 4));
  it('Ls = 277.18758 deg', () => expect(s.ls).toBeCloseTo(277.18758, 4));
  it('solar declination = -25.22825 deg', () => expect(s.declination).toBeCloseTo(-25.22825, 4));
  it('Mars-Sun distance = 1.39358 au', () => expect(s.rAU).toBeCloseTo(1.39358, 5));
});

describe('time conversion', () => {
  it('J2000 epoch (2000-01-01 12:00 TT) is delta 0 within the leap-second offset', () => {
    // 2000-01-01T11:58:55.816Z UTC == 12:00 TT when TT-UTC = 64.184 s; our constant is the post-2017 value.
    const dt = deltaJ2000(Date.parse('2000-01-01T12:00:00Z'));
    expect(Math.abs(dt)).toBeLessThan(0.001);
  });
});

describe('JPL approximate ephemeris', () => {
  it('Kepler solver satisfies M = E - e sin E', () => {
    for (const [M, e] of [[0.3, 0.0934], [2.9, 0.2], [-1.2, 0.0167]] as const) {
      const E = solveKepler(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M, 12);
    }
  });
  it('Earth stays within its perihelion/aphelion band', () => {
    for (let d = 8000; d < 10000; d += 37) {
      const r = Math.hypot(...earthPosition(d));
      expect(r).toBeGreaterThan(0.982);
      expect(r).toBeLessThan(1.018);
    }
  });
  it('Mars-Sun distance agrees with Mars24 to 0.3%', () => {
    for (let d = 8000; d < 10000; d += 41) {
      const jpl = Math.hypot(...marsPosition(d));
      expect(Math.abs(jpl - marsSeason(d).rAU) / jpl).toBeLessThan(0.003);
    }
  });
  it('radio light-time stays between about 3 and 23 minutes', () => {
    for (let d = 8000; d < 10000; d += 13) {
      const t = lightTimeSeconds(d) / 60;
      expect(t).toBeGreaterThan(3);
      expect(t).toBeLessThan(23);
    }
  });
  it('Earth-Mars distance is symmetric in definition (no NaN)', () => {
    expect(Number.isFinite(earthMarsDistanceAU(9000))).toBe(true);
  });
});

describe('sunlight', () => {
  it('1361 W/m2 scaled to Mars mean distance reproduces the NSSDC 586.2 W/m2', () => {
    const a = v('SOLAR_IRRADIANCE_1AU') / 1.52371034 ** 2;
    expect(a).toBeCloseTo(v('MARS_SOLAR_IRRADIANCE_MEAN'), 0);
  });
  it('equator at equinox gets S/pi on average', () => {
    expect(dailyMeanInsolation(0, 0, 1)).toBeCloseTo(1361 / Math.PI, 6);
  });
  it('polar night gives zero, polar day gives S sin(lat) sin(dec)', () => {
    expect(dailyMeanInsolation(80, -20, 1.5)).toBe(0);
    const S = 1361 / 1.5 ** 2;
    expect(dailyMeanInsolation(80, 20, 1.5)).toBeCloseTo(S * Math.sin((80 * Math.PI) / 180) * Math.sin((20 * Math.PI) / 180), 6);
  });
});
