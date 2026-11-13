import { sfx } from '../../game/audio';
import { dailyMission, decodeMission } from '../../game/codes';
import { envFor, helpFor, judgeSession, loadSaved, rankIndex, Session, totalStars, type Setup } from '../../game/session';
import { registerScreen, type App } from '../app';
import { h } from '../dom';
import { fmtNum, t } from '../i18n';
import { heroArt, icon, type IconName } from '../icons';
import { renderRelayDiagram } from '../relay';

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
  // Launch into the future expedition window: October 2026 at Jezero Crater.
  const win = app.data.space.windows.find((w) => w.id === '2026-10') ?? app.data.space.windows.find((w) => w.id === '2025-06') ?? app.data.space.windows[0];
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

function openFeatureModal(feature: 'insight' | 'donki' | 'moxie' | 'relay', app: App): void {
  sfx.click();
  const iconName: IconName = feature === 'insight' ? 'sun' : feature === 'donki' ? 'radiation' : feature === 'moxie' ? 'power' : 'radio';

  let visual: HTMLElement | null = null;
  const badges: HTMLElement[] = [];

  if (feature === 'insight') {
    badges.push(
      h('span', { class: 'badge badge-archived' }, 'InSight TWINS Sensor'),
      h('span', { class: 'badge badge-live' }, 'Sol Avg: -63 °C'),
      h('span', { class: 'badge badge-fixture' }, 'Night Min: -95 °C'),
      h('span', { class: 'badge badge-simulated' }, 'Dust τ: 0.6 – 1.8'),
    );
  } else if (feature === 'donki') {
    badges.push(
      h('span', { class: 'badge badge-cache' }, 'WSA-ENLIL MHD Model'),
      h('span', { class: 'badge badge-fixture' }, 'CME Speed: 800-1400 km/s'),
      h('span', { class: 'badge badge-live' }, 'NASA GSFC Space Weather'),
    );
  } else if (feature === 'moxie') {
    badges.push(
      h('span', { class: 'badge badge-live' }, 'Solid Oxide Electrolysis'),
      h('span', { class: 'badge badge-cache' }, '2 CO₂ → 2 CO + O₂'),
      h('span', { class: 'badge badge-computed' }, 'Perseverance ISRU'),
    );
  } else if (feature === 'relay') {
    badges.push(
      h('span', { class: 'badge badge-computed' }, '1.52 AU Interplanetary'),
      h('span', { class: 'badge badge-cache' }, '14m 20s One-Way Light-Time'),
      h('span', { class: 'badge badge-live' }, 'NASA Deep Space Network'),
    );
    const win = app.data.space.windows[0]?.id ?? '2025-06';
    const sampleEnv = envFor(app.data, { siteId: 'jezero', landing: { r: 48, c: 48 }, windowId: win, seed: 7 })[0]!;
    visual = renderRelayDiagram(sampleEnv, false);
  }

  const dlg = h('dialog', { class: 'sheet feature-modal', 'aria-labelledby': 'fm-title' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'dialog-head' },
      h('div', { class: 'card-head' }, icon(iconName, 'lg'), h('h2', { id: 'fm-title' }, t(`modal.${feature}.title`))),
      h('div', { class: 'modal-badges' }, ...badges),
    ),
    visual,
    h('p', { class: 'prose', style: 'margin: 14px 0 20px; line-height: 1.6; color: var(--text-2);' }, t(`modal.${feature}.desc`)),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { sfx.click(); dlg.close(); dlg.remove(); } }, t('close')),
  );
  dlg.addEventListener('click', (e) => { if (e.target === dlg) { dlg.close(); dlg.remove(); } });
  dlg.addEventListener('cancel', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
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

  const featurePills = h('div', { class: 'hero-highlights', role: 'group', 'aria-label': t('highlights.title') },
    h('button', { class: 'hl-pill', type: 'button', onclick: () => openFeatureModal('insight', app) }, icon('sun', 'sm'), h('span', {}, t('highlights.insight'))),
    h('button', { class: 'hl-pill', type: 'button', onclick: () => openFeatureModal('donki', app) }, icon('radiation', 'sm'), h('span', {}, t('highlights.donki'))),
    h('button', { class: 'hl-pill', type: 'button', onclick: () => openFeatureModal('moxie', app) }, icon('power', 'sm'), h('span', {}, t('highlights.moxie'))),
    h('button', { class: 'hl-pill', type: 'button', onclick: () => openFeatureModal('relay', app) }, icon('radio', 'sm'), h('span', {}, t('highlights.relay'))),
  );

  const leftCol = h('div', { class: 'title-col-hero' },
    h('div', { class: 'hero-copy' },
      h('p', { class: 'eyebrow' }, t('app.eyebrow')),
      h('h1', { class: 'wordmark' }, t('app.title')),
      h('p', { class: 'tagline' }, t('app.tagline')),
    ),
    hero,
    featurePills,
  );

  const rightCol = h('div', { class: 'title-col-menu' },
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

  return h('main', { class: 'screen title-screen' },
    h('div', { class: 'title-grid' }, leftCol, rightCol),
  );
});
