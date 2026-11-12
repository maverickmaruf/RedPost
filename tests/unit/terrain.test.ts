import { describe, expect, it } from 'vitest';
import { checkLanding, pixelSizeM, safeFraction, slopeDeg, type Grid } from '../../src/compute/terrain';

const grid = (f: (r: number, c: number) => number, n = 9, d = 463): Grid => {
  const e: number[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) e.push(f(r, c));
  return { rows: n, cols: n, elevation_m: e, dxM: d, dyM: d };
};

describe('slope (Horn method)', () => {
  it('flat ground has zero slope', () => {
    expect(slopeDeg(grid(() => -2500), 4, 4)).toBe(0);
  });
  it('a planar ramp gives exactly atan(rise/run)', () => {
    const rise = 100; // metres per pixel eastward
    const g = grid((_r, c) => c * rise);
    expect(slopeDeg(g, 4, 4)).toBeCloseTo((Math.atan(rise / 463) * 180) / Math.PI, 10);
  });
  it('a diagonal ramp combines both gradients', () => {
    const g = grid((r, c) => 50 * r + 50 * c);
    expect(slopeDeg(g, 4, 4)).toBeCloseTo((Math.atan(Math.hypot(50, 50) / 463) * 180) / Math.PI, 10);
  });
  it('landing check rejects ground steeper than the limit', () => {
    const steep = grid((_r, c) => c * 200);
    const res = checkLanding(steep, 4, 4, 15);
    expect(res.ok).toBe(false);
    expect(res.slopeDeg).toBeGreaterThan(15);
    expect(checkLanding(grid(() => 0), 4, 4, 15).ok).toBe(true);
  });
  it('safe fraction is 1 for flat ground, 0 for a cliff field', () => {
    expect(safeFraction(grid(() => 0), 15)).toBe(1);
    expect(safeFraction(grid((_r, c) => c * 400), 15)).toBe(0);
  });
  it('pixel size shrinks east-west with latitude', () => {
    const eq = pixelSizeM(1 / 128, 0);
    const mid = pixelSizeM(1 / 128, 60);
    expect(eq.dyM).toBeCloseTo(463.07, 1);
    expect(mid.dxM).toBeCloseTo(eq.dxM / 2, 6);
  });
});
