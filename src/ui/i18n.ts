import en from '../../content/strings.en.json';
import bn from '../../content/strings.bn.json';
import { store } from '../game/storage';

export type Lang = 'en' | 'bn';
type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = { en: en as Dict, bn: bn as Dict };

let lang: Lang = store.get<Lang>('lang', 'en') === 'bn' ? 'bn' : 'en';
const listeners: (() => void)[] = [];

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void {
  lang = l;
  store.set('lang', l);
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
export const onLangChange = (f: () => void): void => {
  listeners.push(f);
};

/** Translate a key, filling {placeholders}. Missing Bangla falls back to English; missing everywhere shows the key in dev. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  let s = DICTS[lang][key] ?? DICTS.en[key];
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn('[i18n] missing key', key);
    s = key;
  } else if (DICTS[lang][key] === undefined && import.meta.env.DEV) {
    console.warn(`[i18n] ${lang} missing ${key}, using English`);
  }
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? fmtNum(vars[k] as string | number) : `{${k}}`));
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Numbers in the player's language. */
export function fmtNum(x: string | number): string {
  const s = String(x);
  return lang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] as string) : s;
}

export const fmt = (x: number, digits = 1): string => fmtNum(x.toFixed(digits));
