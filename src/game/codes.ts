// Mission codes: a short, typeable code that fully describes a mission (site, month, landing spot, seed),
// so a class can fly the same storms with no server. Crockford base32: no I, L, O, U to avoid misreading.
import type { GameData } from '../data/load';
import { hashSeed } from '../compute/rng';
import { defaultLanding, landingCheck, type Setup } from './session';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SITES = ['jezero', 'gale', 'gusev'] as const;

// Bit layout (31 bits): site 2 | window 3 | row 7 | col 7 | seed 12
export function encodeMission(data: GameData, s: Setup): string {
  const site = SITES.indexOf(s.siteId);
  const win = data.space.windows.findIndex((w) => w.id === s.windowId);
  if (site < 0 || win < 0 || win > 7) throw new Error('mission cannot be encoded');
  let n = site;
  n = n * 8 + win;
  n = n * 128 + (s.landing.r & 127);
  n = n * 128 + (s.landing.c & 127);
  n = n * 4096 + (s.seed & 4095);
  let out = '';
  for (let i = 0; i < 7; i++) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out.slice(0, 3) + '-' + out.slice(3);
}

/** Returns a setup, or null if the code is mistyped or names a mission this build can't fly. */
export function decodeMission(data: GameData, code: string): Setup | null {
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (clean.length !== 7) return null;
  let n = 0;
  for (const ch of clean) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) return null;
    n = n * 32 + d;
  }
  const seed = n % 4096; n = Math.floor(n / 4096);
  const c = n % 128; n = Math.floor(n / 128);
  const r = n % 128; n = Math.floor(n / 128);
  const win = n % 8; n = Math.floor(n / 8);
  const siteId = SITES[n];
  const window = data.space.windows[win];
  const site = data.sites.sites.find((x) => x.id === siteId);
  if (!siteId || !window || !site || r >= site.grid.rows || c >= site.grid.cols) return null;
  if (!landingCheck(site, r, c).ok) return null;
  return { siteId, windowId: window.id, landing: { r, c }, seed };
}

/** Today's mission: the same for everyone on the same calendar day (device date). */
export function dailyMission(data: GameData, dayISO: string): Setup {
  const h = hashSeed('red-outpost-daily-' + dayISO);
  const site = data.sites.sites[h % data.sites.sites.length]!;
  const window = data.space.windows[Math.floor(h / 7) % data.space.windows.length]!;
  return { siteId: site.id, windowId: window.id, landing: defaultLanding(site), seed: (h >>> 8) & 4095 };
}
