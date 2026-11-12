// App shell: routing between screens, the shared top bar and the provenance drawer.
import type { GameData } from '../data/load';
import type { Session } from '../game/session';
import { setSound, sfx, soundEnabled } from '../game/audio';
import { store } from '../game/storage';
import { focusHeading, h, mount } from './dom';
import { getLang, onLangChange, setLang, t } from './i18n';
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
    mount(root, topBar(app), body);
    focusHeading(body);
    window.scrollTo(0, 0);
  }
  onLangChange(render);
  render();
  return app;
}

function topBar(app: App): HTMLElement {
  const lang = h('button', {
    class: 'chip', type: 'button', lang: getLang() === 'en' ? 'bn' : 'en',
    onclick: () => { sfx.click(); setLang(getLang() === 'en' ? 'bn' : 'en'); },
  }, t('lang.toggle'));
  const sound = h('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(soundEnabled()),
    onclick: (e: Event) => {
      setSound(!soundEnabled());
      const b = e.currentTarget as HTMLButtonElement;
      b.textContent = soundEnabled() ? t('sound.on') : t('sound.off');
      b.setAttribute('aria-pressed', String(soundEnabled()));
      sfx.click();
    },
  }, soundEnabled() ? t('sound.on') : t('sound.off'));
  const data = h('button', { class: 'chip', type: 'button', 'aria-haspopup': 'dialog', onclick: () => openProvenance(app.provenance()) }, 'ⓘ ' + t('data.button'));
  return h('header', { class: 'topbar' },
    app.judge ? h('span', { class: 'judge', role: 'status' }, t('judge.banner')) : null,
    !store.available() ? h('span', { class: 'warn-chip', role: 'status' }, t('storage.blocked')) : null,
    h('div', { class: 'topbar-actions' }, data, lang, sound),
  );
}
