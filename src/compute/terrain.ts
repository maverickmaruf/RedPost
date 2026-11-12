// Ground slope from a MOLA elevation grid (Horn 1981 3x3 finite difference).
// Pure functions over plain arrays.

export interface Grid {
  rows: number;
  cols: number;
  /** Row-major elevations, metres. */
  elevation_m: readonly number[];
  /** Pixel size in metres (east-west at the site latitude, and north-south). */
  dxM: number;
  dyM: number;
}

const at = (g: Grid, r: number, c: number): number => {
  const rr = Math.min(g.rows - 1, Math.max(0, r));
  const cc = Math.min(g.cols - 1, Math.max(0, c));
  return g.elevation_m[rr * g.cols + cc] as number;
};

/** Slope in degrees at pixel (r, c). Edges reuse the nearest pixel. */
export function slopeDeg(g: Grid, r: number, c: number): number {
  const z = (dr: number, dc: number): number => at(g, r + dr, c + dc);
  const dzdx = ((z(-1, 1) + 2 * z(0, 1) + z(1, 1)) - (z(-1, -1) + 2 * z(0, -1) + z(1, -1))) / (8 * g.dxM);
  const dzdy = ((z(1, -1) + 2 * z(1, 0) + z(1, 1)) - (z(-1, -1) + 2 * z(-1, 0) + z(-1, 1))) / (8 * g.dyM);
  return Math.atan(Math.hypot(dzdx, dzdy)) * (180 / Math.PI);
}

/** Metres per pixel for a lat/lon grid on Mars, using the MOLA reference radius 3396 km. */
export function pixelSizeM(pixelDeg: number, latDeg: number): { dxM: number; dyM: number } {
  const m = (3396000 * Math.PI) / 180 * pixelDeg;
  return { dxM: m * Math.cos((latDeg * Math.PI) / 180), dyM: m };
}

export interface LandingCheck {
  ok: boolean;
  slopeDeg: number;
  limitDeg: number;
  elevationM: number;
}

export function checkLanding(g: Grid, r: number, c: number, limitDeg: number): LandingCheck {
  const s = slopeDeg(g, r, c);
  return { ok: s <= limitDeg, slopeDeg: s, limitDeg, elevationM: at(g, r, c) };
}

/** Share of pixels at or below the slope limit: a quick "how safe is this site" number. */
export function safeFraction(g: Grid, limitDeg: number): number {
  let ok = 0;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (slopeDeg(g, r, c) <= limitDeg) ok++;
  return ok / (g.rows * g.cols);
}
