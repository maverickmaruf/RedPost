import { sfx } from '../../game/audio';
import { dailyMission, decodeMission } from '../../game/codes';
import { helpFor, judgeSession, loadSaved, rankIndex, Session, totalStars, type Setup } from '../../game/session';
import { registerScreen, type App } from '../app';
import { h } from '../dom';
import { fmtNum, t } from '../i18n';
import { heroArt, icon, type IconName } from '../icons';

let logoTaps = 0;
let logoTimer = 0;

function start(app: App, setup: Setup): void {
  app.session = new Session(app.data, { ...setup, help: helpFor(setup) });
  app.go('sol');
}

/** The device's local calendar date. UI-only: the science code never reads the clock. */
const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function quickStart(app: App): void {
  // Gentlest real month at the safest site: June 2025 at Jezero.
  const win = app.data.space.windows.find((w) => w.id === '2025-06') ?? app.data.space.windows[0];
  start(app, { siteId: 'jezero', landing: { r: 48, c: 48 }, windowId: win!.id, seed: 7 });
}

function menuItem(ico: IconName, label: string, onclick: () => void): HTMLElement {
  return h('button', { class: 'menu-item', type: 'button', onclick: () => { sfx.click(); onclick(); } },
    icon(ico), h('span', { class: 'grow' }, label), icon('chevron', 'sm chev'));
}

function codeCard(app: App): HTMLElement {
  const input = h('input', { id: 'code-in', type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: 9, placeholder: 'ABC-1234', class: 'code-input' });
  const msg = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
  return h('form', {
    class: 'card code-card',
    onsubmit: (e: Event) => {
      e.preventDefault();
      const setup = decodeMission(app.data, input.value);
      if (!setup) { msg.textContent = t('code.bad'); msg.className = 'small warn'; sfx.alarm(); return; }
      sfx.click();
      start(app, setup);
    },
  },
    h('label', { for: 'code-in' }, t('code.label')),
    h('div', { class: 'code-row' }, input, h('button', { class: 'btn', type: 'submit' }, t('code.go'))),
    msg,
  );
}

registerScreen('title', (app) => {
  const saved = loadSaved(app.data);
  const stars = totalStars();
  const hero = h('button', {
    class: 'hero', type: 'button', 'aria-label': t('app.title'),
    onclick: () => {
      // Hidden judge mode: five taps on the picture.
      logoTaps++;
      clearTimeout(logoTimer);
      logoTimer = window.setTimeout(() => (logoTaps = 0), 1500);
      if (logoTaps >= 5) {
        logoTaps = 0;
        app.judge = true;
        app.session = judgeSession(app.data);
        sfx.radio();
        app.go('sol');
      }
    },
  }, heroArt());
  app.provenance = () => [
    { source_id: 'donki-enlil', badge: 'cache', detail: app.data.space.windows.map((w) => w.id).join(', '), retrieved: app.data.space.windows[0]?.retrieved },
    { source_id: 'spaceapps-2026-statement', badge: 'cache' },
  ];
  const primary = saved
    ? h('button', { class: 'btn primary lg block', type: 'button', onclick: () => { sfx.click(); app.session = saved; app.go('sol'); } }, icon('play', 'sm'), t('title.continue', { sol: fmtNum(saved.state.sol + 1) }))
    : h('button', { class: 'btn primary lg block', type: 'button', onclick: () => { sfx.click(); quickStart(app); } }, icon('play', 'sm'), t('title.quick'));

  return h('main', { class: 'screen title-screen' },
    hero,
    h('div', { class: 'hero-copy' },
      h('p', { class: 'eyebrow' }, t('app.eyebrow')),
      h('h1', { class: 'wordmark' }, t('app.title')),
      h('p', { class: 'tagline' }, t('app.tagline')),
    ),
    primary,
    h('nav', { class: 'menu', 'aria-label': t('app.title') },
      saved ? menuItem('play', t('title.quick'), () => quickStart(app)) : null,
      menuItem('pin', t('title.choose'), () => app.go('setup')),
      menuItem('calendar', t('title.daily'), () => start(app, dailyMission(app.data, todayISO()))),
      menuItem('info', t('title.about'), () => app.go('about')),
    ),
    codeCard(app),
    h('div', { class: 'rank-line' }, h('span', { class: 'chip' }, icon('rank', 'sm'), t('title.rank', { rank: t(`rank.${rankIndex(stars)}`), stars: fmtNum(stars) }))),
    app.updateReady ? h('div', { class: 'hint' }, icon('refresh'), h('p', {}, t('update.ready')), h('button', { class: 'icon-btn', type: 'button', onclick: app.updateReady }, t('update.reload'))) : null,
  );
});
