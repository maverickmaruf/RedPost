import { MISSION_DOSE_BUDGET_MSV, v } from '../../compute/constants';
import { stars, type OutpostState } from '../../compute/outpost';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import { Session } from '../../game/session';
import { registerScreen } from '../app';
import { h } from '../dom';
import { fmtNum, getLang, t } from '../i18n';
import { badge } from '../provenance';
import { factText, FACTS } from './about';

const SVG = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, val] of Object.entries(attrs)) el.setAttribute(k, String(val));
  return el;
}

interface Series { label: string; max: number; you: number[]; ghost: number[]; limit?: number }

function smallChart(sr: Series, sols: number): HTMLElement {
  const W = 300, H = 80, P = 4;
  const x = (i: number): number => P + (i / sols) * (W - 2 * P);
  const y = (val: number): number => H - P - (Math.max(0, Math.min(sr.max, val)) / sr.max) * (H - 2 * P);
  const path = (vals: number[]): string => vals.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': sr.label });
  s.append(svg('line', { x1: P, x2: W - P, y1: H - P, y2: H - P, class: 'axis' }));
  if (sr.limit !== undefined) s.append(svg('line', { x1: P, x2: W - P, y1: y(sr.limit), y2: y(sr.limit), class: 'limit' }));
  s.append(svg('path', { d: path(sr.ghost), class: 'ghost' }));
  s.append(svg('path', { d: path(sr.you), class: 'you' }));
  return h('figure', { class: 'mini' }, h('figcaption', {}, sr.label), s as unknown as HTMLElement);
}

const seriesOf = (states: OutpostState[], f: (s: OutpostState) => number): number[] => states.map(f);

registerScreen('review', (app) => {
  const s = app.session;
  if (!s) { queueMicrotask(() => app.go('title')); return h('main', {}); }
  const st = s.state;
  const ghost = s.ghost();
  const won = st.status === 'won';
  const nStars = stars(st);
  const youStates = [s.reports[0]?.before ?? st, ...s.reports.map((r) => r.after)];
  const ghostStates = [ghost.reports[0]?.before ?? ghost.final, ...ghost.reports.map((r) => r.after)];
  const sols = v('MISSION_SOLS');
  const budget = MISSION_DOSE_BUDGET_MSV();

  queueMicrotask(() => (won ? sfx.win() : sfx.fail()));

  const factId = st.failure === 'radiation' ? 'rad-may2024' : st.failure === 'air' ? 'moxie' : st.failure === 'food' ? 'food-need' : st.failure === 'blackout' ? 'insight-cold' : 'donki';
  const fact = FACTS.find((f) => f.id === factId);
  const month = new Intl.DateTimeFormat(getLang() === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(s.window.start));

  app.provenance = () => [
    { source_id: 'donki-enlil', badge: shippedBadge(s.window.mode), detail: s.window.marsForecasts.map((f) => f.simulationID).join(', '), retrieved: s.window.retrieved, url: s.window.url_enlil },
    ...(fact ? [{ source_id: fact.source_id, badge: 'cache' as const }] : []),
    { source_id: 'model-card', badge: 'simulated' as const },
  ];

  const retry = (): void => { sfx.click(); app.session = new Session(app.data, s.setup); app.go('sol'); };

  return h('main', { class: 'screen review' },
    h('h1', {}, won ? '🏁 ' + t('review.won') : t('review.failed')),
    h('p', { class: 'stars', 'aria-label': t('review.stars', { n: nStars }) }, '★'.repeat(nStars) + '☆'.repeat(3 - nStars)),
    h('p', { class: 'lead' }, won ? t('review.survived', { sol: fmtNum(st.sol) }) : t(`fail.${st.failure}`) + ' ' + t('review.ended', { sol: fmtNum(st.sol) })),
    h('p', {}, '🔬 ', t('review.science', { n: fmtNum(st.scienceSent), goal: fmtNum(v('SCIENCE_GOAL')) })),
    !won ? h('section', { class: 'card why' }, h('h2', {}, t('review.why')), h('p', {}, t(`why.${st.failure}`))) : null,
    h('section', { class: 'card' },
      h('p', { class: 'small muted' }, t('review.chart')),
      h('div', { class: 'charts' },
        smallChart({ label: '⚡ ' + t('hud.power'), max: v('BATTERY_KWH_MAX'), you: seriesOf(youStates, (x) => x.batteryKWh), ghost: seriesOf(ghostStates, (x) => x.batteryKWh) }, sols),
        smallChart({ label: '🫁 ' + t('hud.air'), max: v('O2_TANK_MAX_KG'), you: seriesOf(youStates, (x) => x.o2Kg), ghost: seriesOf(ghostStates, (x) => x.o2Kg), limit: 0 }, sols),
        smallChart({ label: '🥔 ' + t('hud.food'), max: v('FOOD_START_KG'), you: seriesOf(youStates, (x) => x.foodKg), ghost: seriesOf(ghostStates, (x) => x.foodKg), limit: 0 }, sols),
        smallChart({ label: '☢ ' + t('hud.dose'), max: budget * 1.1, you: seriesOf(youStates, (x) => x.doseMSv), ghost: seriesOf(ghostStates, (x) => x.doseMSv), limit: budget }, sols),
      ),
      h('p', {}, ghost.final.status === 'won' ? t('review.ghost.won', { sci: fmtNum(ghost.final.scienceSent) }) : t('review.ghost.failed')),
    ),
    fact ? h('section', { class: 'card fact' }, h('h2', {}, t('review.learn')), h('p', {}, factText(fact))) : null,
    h('section', { class: 'card' },
      h('h2', {}, t('review.data')),
      h('p', {}, badge(shippedBadge(s.window.mode)), ' ', t('review.storms', { n: fmtNum(s.window.marsForecasts.length), month })),
      h('ul', { class: 'mono small storm-ids' }, ...s.window.marsForecasts.slice(0, 8).map((f) => h('li', {}, `${f.simulationID} → Mars ${f.arrival.slice(0, 16).replace('T', ' ')} UTC`))),
    ),
    h('div', { class: 'stack' },
      h('button', { class: 'btn primary big', type: 'button', onclick: retry }, '↻ ', t('review.retry')),
      h('button', { class: 'btn', type: 'button', onclick: () => app.go('setup') }, t('review.new')),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { app.session = null; app.go('title'); } }, t('review.home')),
    ),
  );
});
