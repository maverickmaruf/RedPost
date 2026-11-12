// App shell: routing between screens, the shared app bar and the provenance drawer.
import type { GameData } from '../data/load';
import type { Session } from '../game/session';
import { setSound, sfx, soundEnabled } from '../game/audio';
import { store } from '../game/storage';
import { focusHeading, h, mount } from './dom';
import { getLang, onLangChange, setLang, t } from './i18n';
import { icon } from './icons';
import { openProvenance, type ProvItem } from './provenance';

export type Screen = 'title' | 'setup' | 'sol' | 'review' | 'about';

export interface App {
  data: GameData;
  session: Session | null;
  judge: boolean;
  go(screen: Screen): void;
  /** What the provenance drawer shows for the current screen. */
  provenance: () => ProvItem[];
  updateReady: (() => void) | null;
}

type Render = (app: App) => HTMLElement;
const screens = new Map<Screen, Render>();
export const registerScreen = (name: Screen, r: Render): void => {
  screens.set(name, r);
};

export function createApp(root: HTMLElement, data: GameData, judge: boolean): App {
  let current: Screen = 'title';
  const app: App = {
    data, session: null, judge, provenance: () => [], updateReady: null,
    go(screen) {
      current = screen;
      render();
    },
  };
  function render(): void {
    const r = screens.get(current);
    if (!r) throw new Error('no screen ' + current);
    app.provenance = () => [];
    const body = r(app);
    const banners: HTMLElement[] = [];
    if (app.judge) banners.push(h('div', { class: 'banner judge', role: 'status' }, icon('info', 'sm'), t('judge.banner')));
    if (!store.available()) banners.push(h('div', { class: 'banner storage', role: 'status' }, icon('alert', 'sm'), t('storage.blocked')));
    mount(root, appBar(app, current), ...banners, body);
    focusHeading(body);
    window.scrollTo(0, 0);
  }
  onLangChange(render);
  render();
  return app;
}

function appBar(app: App, current: Screen): HTMLElement {
  const brand = h('button', {
    class: 'brand', type: 'button',
    onclick: () => { if (current !== 'title') { sfx.click(); app.go('title'); } },
  }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }), h('span', {}, t('app.title')));
  const data = h('button', { class: 'icon-btn', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openProvenance(app.provenance()) },
    icon('info', 'sm'), h('span', {}, t('data.button')));
  const lang = h('button', {
    class: 'icon-btn', type: 'button', lang: getLang() === 'en' ? 'bn' : 'en',
    onclick: () => { sfx.click(); setLang(getLang() === 'en' ? 'bn' : 'en'); },
  }, icon('globe', 'sm'), h('span', {}, t('lang.toggle')));
  const sound = h('button', {
    class: 'icon-btn square', type: 'button', 'aria-pressed': String(soundEnabled()), 'aria-label': soundEnabled() ? t('sound.on') : t('sound.off'), title: soundEnabled() ? t('sound.on') : t('sound.off'),
    onclick: (e: Event) => {
      setSound(!soundEnabled());
      const b = e.currentTarget as HTMLButtonElement;
      b.replaceChildren(icon(soundEnabled() ? 'volume' : 'mute', 'sm'));
      b.setAttribute('aria-pressed', String(soundEnabled()));
      b.setAttribute('aria-label', soundEnabled() ? t('sound.on') : t('sound.off'));
      b.title = soundEnabled() ? t('sound.on') : t('sound.off');
      sfx.click();
    },
  }, icon(soundEnabled() ? 'volume' : 'mute', 'sm'));
  return h('header', { class: 'appbar' }, brand, h('div', { class: 'appbar-actions' }, data, lang, sound));
}
