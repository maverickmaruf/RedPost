import { sfx } from '../../game/audio';
import { judgeSession, loadSaved, rankIndex, Session, totalStars } from '../../game/session';
import { registerScreen, type App } from '../app';
import { h } from '../dom';
import { fmtNum, t } from '../i18n';

let logoTaps = 0;
let logoTimer = 0;

export function quickStart(app: App): void {
  // Gentlest real month at the safest site: June 2025 at Jezero.
  const win = app.data.space.windows.find((w) => w.id === '2025-06') ?? app.data.space.windows[0];
  app.session = new Session(app.data, { siteId: 'jezero', landing: { r: 48, c: 48 }, windowId: win!.id, seed: 7 });
  app.go('sol');
}

registerScreen('title', (app) => {
  const saved = loadSaved(app.data);
  const stars = totalStars();
  const logo = h('button', {
    class: 'logo', type: 'button', 'aria-label': t('app.title'),
    onclick: () => {
      // Hidden judge mode: five taps on the planet.
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
  }, h('span', { class: 'planet', 'aria-hidden': 'true' }));
  app.provenance = () => [
    { source_id: 'donki-enlil', badge: 'cache', detail: app.data.space.windows.map((w) => w.id).join(', '), retrieved: app.data.space.windows[0]?.retrieved },
    { source_id: 'spaceapps-2026-statement', badge: 'cache' },
  ];
  return h('main', { class: 'screen title-screen' },
    logo,
    h('h1', {}, t('app.title')),
    h('p', { class: 'tagline' }, t('app.tagline')),
    h('div', { class: 'stack' },
      saved
        ? h('button', { class: 'btn primary big', type: 'button', onclick: () => { sfx.click(); app.session = saved; app.go('sol'); } }, '▶ ' + t('title.continue', { sol: saved.state.sol + 1 }))
        : null,
      h('button', { class: `btn ${saved ? '' : 'primary'} big`, type: 'button', onclick: () => { sfx.click(); quickStart(app); } }, (saved ? '' : '▶ ') + t('title.quick')),
      h('button', { class: 'btn', type: 'button', onclick: () => { sfx.click(); app.go('setup'); } }, t('title.choose')),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => app.go('about') }, t('title.about')),
    ),
    h('p', { class: 'muted center' }, t('title.rank', { rank: t(`rank.${rankIndex(stars)}`), stars: fmtNum(stars) })),
    app.updateReady ? h('p', { class: 'center' }, t('update.ready') + ' ', h('button', { class: 'chip', type: 'button', onclick: app.updateReady }, t('update.reload'))) : null,
  );
});
