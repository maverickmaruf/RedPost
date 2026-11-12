import { MISSION_DOSE_BUDGET_MSV, v } from '../../compute/constants';
import { stars, type OutpostState } from '../../compute/outpost';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import { encodeMission } from '../../game/codes';
import { helpFor, Session } from '../../game/session';
import { registerScreen } from '../app';
import { h } from '../dom';
import { fmt, fmtNum, getLang, t } from '../i18n';
import { icon, type IconName } from '../icons';
import { badge } from '../provenance';
import { factText, FACTS } from './about';

const SVG = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, val] of Object.entries(attrs)) el.setAttribute(k, String(val));
  return el;
}

interface Series { label: string; ico: IconName; color: string; max: number; you: number[]; ghost: number[]; limit?: number }

function miniChart(sr: Series, sols: number): HTMLElement {
  const W = 160, H = 70, P = 3;
  const x = (i: number): number => P + (i / sols) * (W - 2 * P);
  const y = (val: number): number => H - P - (Math.max(0, Math.min(sr.max, val)) / sr.max) * (H - 2 * P);
  const line = (vals: number[]): string => vals.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('');
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': sr.label });
  for (const f of [0.25, 0.5, 0.75]) s.append(svg('line', { x1: P, x2: W - P, y1: P + f * (H - 2 * P), y2: P + f * (H - 2 * P), class: 'grid' }));
  s.append(svg('line', { x1: P, x2: W - P, y1: H - P, y2: H - P, class: 'grid' }));
  if (sr.limit !== undefined) s.append(svg('line', { x1: P, x2: W - P, y1: y(sr.limit), y2: y(sr.limit), class: 'limit' }));
  if (sr.you.length > 1) s.append(svg('path', { d: `${line(sr.you)}L${x(sr.you.length - 1).toFixed(1)},${H - P}L${x(0)},${H - P}Z`, class: 'area', fill: sr.color }));
  s.append(svg('path', { d: line(sr.ghost), class: 'ghost' }));
  s.append(svg('path', { d: line(sr.you), class: 'you', stroke: sr.color }));
  return h('figure', { class: 'mini' }, h('figcaption', {}, icon(sr.ico), sr.label), s as unknown as HTMLElement);
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

  const retry = (): void => { sfx.click(); app.session = new Session(app.data, { ...s.setup, help: helpFor(s.setup) }); app.go('sol'); };
  const starRow = h('div', { class: 'stars', role: 'img', 'aria-label': t('review.stars', { n: nStars }) }, ...[0, 1, 2].map((i) => icon('star', i < nStars ? 'on' : '')));

  return h('main', { class: 'screen review' },
    h('section', { class: `card result-hero ${won ? 'won' : 'failed'}` },
      h('div', { class: 'result-icon' }, icon(won ? 'check' : 'alert')),
      h('h1', {}, won ? t('review.won') : t('review.failed')),
      starRow,
      h('p', { class: 'lead' }, won ? t('review.survived', { sol: fmtNum(st.sol) }) : t(`fail.${st.failure}`) + ' ' + t('review.ended', { sol: fmtNum(st.sol) })),
    ),
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(st.sol), h('span', { class: 'faint small' }, `/${fmtNum(sols)}`)), h('div', { class: 'k' }, t('stat.sols'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(st.scienceSent), h('span', { class: 'faint small' }, `/${fmtNum(v('SCIENCE_GOAL'))}`)), h('div', { class: 'k' }, t('stat.science'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmt(st.doseMSv), h('span', { class: 'faint small' }, `/${fmtNum(budget)}`)), h('div', { class: 'k' }, t('hud.dose') + ' (mSv)')),
    ),
    !won ? h('section', { class: 'card why' }, h('div', { class: 'card-head' }, icon('alert'), h('h2', {}, t('review.why'))), h('p', {}, t(`why.${st.failure}`))) : null,
    h('section', { class: 'card' },
      h('div', { class: 'chart-legend' }, h('span', {}, h('i', {}), t('legend.you')), h('span', {}, h('i', { class: 'dash' }), t('legend.fd'))),
      h('div', { class: 'charts' },
        miniChart({ label: t('hud.power'), ico: 'power', color: 'var(--c-power)', max: v('BATTERY_KWH_MAX'), you: seriesOf(youStates, (x) => x.batteryKWh), ghost: seriesOf(ghostStates, (x) => x.batteryKWh) }, sols),
        miniChart({ label: t('hud.air'), ico: 'air', color: 'var(--c-air)', max: v('O2_TANK_MAX_KG'), you: seriesOf(youStates, (x) => x.o2Kg), ghost: seriesOf(ghostStates, (x) => x.o2Kg), limit: 0 }, sols),
        miniChart({ label: t('hud.food'), ico: 'food', color: 'var(--c-food)', max: v('FOOD_START_KG') + v('HELP_FOOD_KG'), you: seriesOf(youStates, (x) => x.foodKg), ghost: seriesOf(ghostStates, (x) => x.foodKg), limit: 0 }, sols),
        miniChart({ label: t('hud.dose'), ico: 'radiation', color: 'var(--c-dose)', max: budget * 1.1, you: seriesOf(youStates, (x) => x.doseMSv), ghost: seriesOf(ghostStates, (x) => x.doseMSv), limit: budget }, sols),
      ),
      h('p', { class: 'ghost-note' }, icon('info', 'sm'), h('span', {}, ghost.final.status === 'won' ? t('review.ghost.won', { sci: fmtNum(ghost.final.scienceSent) }) : t('review.ghost.failed'))),
      h('p', { class: 'visually-hidden' }, t('review.chart')),
    ),
    fact ? h('section', { class: 'card fact' }, h('div', { class: 'card-head' }, icon('science'), h('h2', {}, t('review.learn'))), h('p', {}, factText(fact))) : null,
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, icon('hash'), h('h2', {}, t('code.title'))),
      h('p', { class: 'code-big' }, encodeMission(app.data, s.setup)),
      h('p', { class: 'small muted', style: 'margin-top:8px' }, t('code.share')),
    ),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, icon('radio'), h('h2', {}, t('review.data'))),
      h('p', { class: 'muted' }, badge(shippedBadge(s.window.mode)), ' ', t('review.storms', { n: fmtNum(s.window.marsForecasts.length), month })),
      h('ul', { class: 'storm-ids' }, ...s.window.marsForecasts.slice(0, 6).map((f) => h('li', {}, h('span', {}, f.simulationID), h('span', {}, f.arrival.slice(0, 16).replace('T', ' '))))),
    ),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary lg block', type: 'button', onclick: retry }, icon('refresh', 'sm'), t('review.retry')),
      h('button', { class: 'btn block', type: 'button', onclick: () => app.go('setup') }, icon('pin', 'sm'), t('review.new')),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => { app.session = null; app.go('title'); } }, icon('home', 'sm'), t('review.home')),
    ),
  );
});
