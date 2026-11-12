import { describe, expect, it } from 'vitest';
import en from '../../content/strings.en.json';
import bn from '../../content/strings.bn.json';
import facts from '../../content/facts.json';
import { K } from '../../src/compute/constants';

const E = en as Record<string, string>;
const B = bn as Record<string, string>;
const placeholders = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('strings', () => {
  it('Bangla has every English key and no extras', () => {
    const keysB = Object.keys(B).filter((k) => !k.startsWith('_'));
    expect(Object.keys(E).filter((k) => !(k in B))).toEqual([]);
    expect(keysB.filter((k) => !(k in E))).toEqual([]);
  });
  it('placeholders match in both languages', () => {
    const bad = Object.keys(E).filter((k) => placeholders(E[k]!) !== placeholders(B[k] ?? ''));
    expect(bad).toEqual([]);
  });
  it('every model constant has a player-facing note in both languages', () => {
    for (const key of Object.keys(K)) {
      expect(E[`const.${key}`], key).toBeTruthy();
      expect(B[`const.${key}`], key).toBeTruthy();
    }
  });
  it('every fact has both languages', () => {
    for (const f of (facts as { facts: { id: string; en: string; bn: string }[] }).facts) {
      expect(f.en.length, f.id).toBeGreaterThan(10);
      expect(f.bn.length, f.id).toBeGreaterThan(10);
    }
  });
});
