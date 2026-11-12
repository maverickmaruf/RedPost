import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameData } from '../../src/data/load';
import { dailyMission, decodeMission, encodeMission } from '../../src/game/codes';
import { landingCheck } from '../../src/game/session';

const d = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'data', f), 'utf8'));
const data = { space: d('spaceweather.json'), sites: d('sites.json'), weather: d('weather.json'), osdr: d('osdr.json') } as GameData;

describe('mission codes', () => {
  it('round-trips every site, month and a range of seeds', () => {
    let n = 0;
    for (const site of data.sites.sites) for (const w of data.space.windows) for (const seed of [0, 7, 2024, 4095]) {
      if (!landingCheck(site, 48, 48).ok) continue;
      const s = { siteId: site.id, windowId: w.id, seed, landing: { r: 48, c: 48 } };
      const code = encodeMission(data, s);
      expect(code).toMatch(/^[0-9A-Z]{3}-[0-9A-Z]{4}$/);
      expect(decodeMission(data, code)).toEqual(s);
      n++;
    }
    expect(n).toBeGreaterThan(0);
  });
  it('forgives lower case, spaces and O/0, I/1 mix-ups', () => {
    const s = { siteId: 'jezero' as const, windowId: data.space.windows[0]!.id, landing: { r: 48, c: 48 }, seed: 123 };
    const code = encodeMission(data, s);
    const messy = ' ' + code.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'i') + ' ';
    expect(decodeMission(data, messy)).toEqual(s);
  });
  it('rejects junk and wrong lengths', () => {
    for (const bad of ['', 'ABC', 'ABC-12345', 'UUU-UUUU', '!!!-!!!!']) expect(decodeMission(data, bad)).toBeNull();
  });
  it('daily mission is stable for a date and lands on safe ground', () => {
    const a = dailyMission(data, '2026-11-14');
    expect(dailyMission(data, '2026-11-14')).toEqual(a);
    const site = data.sites.sites.find((x) => x.id === a.siteId)!;
    expect(landingCheck(site, a.landing.r, a.landing.c).ok).toBe(true);
    expect(decodeMission(data, encodeMission(data, a))).toEqual(a);
  });
});
