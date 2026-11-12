import { MISSION_DOSE_BUDGET_MSV, v } from '../../compute/constants';
import { stars, type OutpostState } from '../../compute/outpost';
import type { SolEnv } from '../../compute/mission';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import { encodeMission } from '../../game/codes';
import { helpFor, Session, type PlayedSol } from '../../game/session';
import { registerScreen } from '../app';
import { h, prefersReducedMotion } from '../dom';
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

// ── Particle celebration system ──
function spawnCelebration(container: HTMLElement, won: boolean): void {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'celebration-canvas';
  canvas.width = 600;
  canvas.height = 400;
  container.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; maxLife: number; rot: number; vr: number }
  const particles: Particle[] = [];
  const colors = won
    ? ['#ffc857', '#3ddc97', '#5cc8ff', '#ff8e62', '#c792ff', '#ffffff']
    : ['#ff6464', '#ff4040', '#cc2020', '#880808'];

  // deterministic seeded random (no Math.random)
  let seed = 42;
  const rand = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const count = won ? 80 : 30;
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = won ? 2 + rand() * 5 : 1 + rand() * 3;
    particles.push({
      x: canvas.width / 2 + (rand() - 0.5) * 100,
      y: won ? canvas.height / 2 : canvas.height * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (won ? 2 : 0),
      r: won ? 2 + rand() * 4 : 3 + rand() * 5,
      color: colors[Math.floor(rand() * colors.length)]!,
      life: 0,
      maxLife: 60 + rand() * 60,
      rot: rand() * Math.PI * 2,
      vr: (rand() - 0.5) * 0.15,
    });
  }

  let frame = 0;
  const maxFrames = 120;
  function animate(): void {
    if (frame >= maxFrames) { canvas.remove(); return; }
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.06; // gravity
      p.y += p.vy;
      p.life++;
      p.rot += p.vr;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha <= 0) continue;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      if (won) {
        // Star-shaped confetti
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
        ctx!.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      } else {
        // Falling embers
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }
    frame++;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ── Mission Timeline ──
function missionTimeline(reports: PlayedSol[], env: SolEnv[]): HTMLElement {
  const events: { sol: number; type: 'storm' | 'warning' | 'science' | 'failure'; label: string }[] = [];
  for (const r of reports) {
    const e = env[r.sol];
    if (e && e.storm !== 'none') events.push({ sol: r.sol, type: 'storm', label: t('storm.hit') });
    if (r.heard.length > 0) events.push({ sol: r.sol, type: 'warning', label: t('report.heard') });
    if (r.scienceGained > 0 && r.sol % 5 === 0) events.push({ sol: r.sol, type: 'science', label: `+${fmtNum(r.scienceGained)} SCI` });
  }
  const last = reports[reports.length - 1];
  if (last) {
    const final = last.after;
    if (final.status === 'won') events.push({ sol: last.sol, type: 'science', label: t('review.won') });
    else if (final.failure) events.push({ sol: last.sol, type: 'failure', label: t(`fail.${final.failure}`) });
  }

  const W = 400, H = 60, P = 20;
  const total = v('MISSION_SOLS');
  const sx = (sol: number): number => P + (sol / total) * (W - 2 * P);

  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'timeline-svg', role: 'img', 'aria-label': t('review.timeline') });
  // Base line
  s.append(svg('line', { x1: P, x2: W - P, y1: H / 2, y2: H / 2, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 2 }));
  // Progress line
  const lastSol = last ? last.sol : 0;
  s.append(svg('line', { x1: P, x2: sx(lastSol), y1: H / 2, y2: H / 2, stroke: 'var(--accent)', 'stroke-width': 3 }));
  // Sol tick marks
  for (let i = 0; i <= total; i += 5) {
    s.append(svg('line', { x1: sx(i), x2: sx(i), y1: H / 2 - 4, y2: H / 2 + 4, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1 }));
  }
  // Event markers
  const colors: Record<string, string> = { storm: '#ff6464', warning: '#ffc857', science: '#3ddc97', failure: '#ff4040' };
  for (const ev of events) {
    const x = sx(ev.sol);
    const c = colors[ev.type] ?? '#5cc8ff';
    s.append(svg('circle', { cx: x, cy: H / 2, r: 5, fill: c, stroke: '#0a0e1c', 'stroke-width': 2 }));
    // Tiny label above/below alternating
    const above = ev.type === 'storm' || ev.type === 'failure';
    const label = svg('text', {
      x, y: above ? H / 2 - 12 : H / 2 + 18,
      fill: c, 'font-size': '7px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold',
    });
    label.textContent = `S${ev.sol + 1}`;
    s.append(label);
  }

  return h('section', { class: 'card timeline-card' },
    h('div', { class: 'card-head' }, icon('calendar'), h('h2', {}, t('review.timeline'))),
    s as unknown as HTMLElement,
    events.length > 0
      ? h('div', { class: 'timeline-events' }, ...events.slice(-6).map((ev) =>
          h('span', { class: `timeline-event ${ev.type}` },
            h('span', { class: 'timeline-dot', style: `background:${colors[ev.type]}` }),
            h('span', { class: 'timeline-label' }, `Sol ${fmtNum(ev.sol + 1)}: ${ev.label}`),
          )))
      : null,
  );
}

// ── Copy mission summary to clipboard ──
function copyMissionSummary(s: Session, won: boolean, nStars: number): HTMLElement {
  const btn = h('button', { class: 'copy-btn', type: 'button' }, icon('send', 'sm'), t('review.share'));
  btn.addEventListener('click', () => {
    const st = s.state;
    const code = encodeMission(s.data, s.setup);
    const text = [
      `🔴 Red Outpost — ${won ? '✅ Mission Complete!' : '❌ Mission Failed'}`,
      `${'⭐'.repeat(nStars)}${'☆'.repeat(3 - nStars)}`,
      `Sols: ${st.sol}/${v('MISSION_SOLS')} | Science: ${st.scienceSent}/${v('SCIENCE_GOAL')} | Dose: ${fmt(st.doseMSv)}/${MISSION_DOSE_BUDGET_MSV()} mSv`,
      `Site: ${s.site.id} | Code: ${code}`,
      `Built with real NASA DONKI storm data 🚀`,
    ].join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      btn.replaceChildren(icon('check', 'sm'), t('code.copied'));
      setTimeout(() => btn.replaceChildren(icon('send', 'sm'), t('review.share')), 2000);
    });
  });
  return btn;
}

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

  // Compute mission stats
  const stormsWeathered = s.reports.filter((r) => s.env[r.sol]?.storm !== 'none').length;
  const totalEvas = s.reports.filter((r) => r.plan?.crew === 'eva').length;
  const totalSciEarned = s.reports.reduce((a, r) => a + r.scienceGained, 0);

  app.provenance = () => [
    { source_id: 'donki-enlil', badge: shippedBadge(s.window.mode), detail: s.window.marsForecasts.map((f) => f.simulationID).join(', '), retrieved: s.window.retrieved, url: s.window.url_enlil },
    ...(fact ? [{ source_id: fact.source_id, badge: 'cache' as const }] : []),
    { source_id: 'model-card', badge: 'simulated' as const },
  ];

  const retry = (): void => { sfx.click(); app.session = new Session(app.data, { ...s.setup, help: helpFor(s.setup) }); app.go('sol'); };
  const starRow = h('div', { class: 'stars', role: 'img', 'aria-label': t('review.stars', { n: nStars }) }, ...[0, 1, 2].map((i) => icon('star', i < nStars ? 'on' : '')));

  const resultHero = h('section', { class: `card result-hero ${won ? 'won' : 'failed'}` },
    h('div', { class: 'result-icon' }, icon(won ? 'check' : 'alert')),
    h('h1', {}, won ? t('review.won') : t('review.failed')),
    starRow,
    h('p', { class: 'lead' }, won ? t('review.survived', { sol: fmtNum(st.sol) }) : t(`fail.${st.failure}`) + ' ' + t('review.ended', { sol: fmtNum(st.sol) })),
  );

  // Trigger celebration after mount
  queueMicrotask(() => spawnCelebration(resultHero, won));

  const leftCol = h('div', { class: 'review-col-left' },
    resultHero,
    h('div', { class: 'stat-row' },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(st.sol), h('span', { class: 'faint small' }, `/${fmtNum(sols)}`)), h('div', { class: 'k' }, t('stat.sols'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(st.scienceSent), h('span', { class: 'faint small' }, `/${fmtNum(v('SCIENCE_GOAL'))}`)), h('div', { class: 'k' }, t('stat.science'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmt(st.doseMSv), h('span', { class: 'faint small' }, `/${fmtNum(budget)}`)), h('div', { class: 'k' }, t('hud.dose') + ' (mSv)')),
    ),
    h('div', { class: 'stat-row stat-row-secondary' },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(stormsWeathered)), h('div', { class: 'k' }, t('review.storms.weathered'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(totalEvas)), h('div', { class: 'k' }, t('review.evas'))),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, fmtNum(totalSciEarned)), h('div', { class: 'k' }, t('review.sci.earned'))),
    ),
    missionTimeline(s.reports, s.env),
    !won ? h('section', { class: 'card why' }, h('div', { class: 'card-head' }, icon('alert'), h('h2', {}, t('review.why'))), h('p', {}, t(`why.${st.failure}`))) : null,
    fact ? h('section', { class: 'card fact' }, h('div', { class: 'card-head' }, icon('science'), h('h2', {}, t('review.learn'))), h('p', {}, factText(fact))) : null,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary lg block', type: 'button', onclick: retry }, icon('refresh', 'sm'), t('review.retry')),
      h('button', { class: 'btn block', type: 'button', onclick: () => window.print() }, icon('rank', 'sm'), t('review.print')),
      h('button', { class: 'btn block', type: 'button', onclick: () => app.go('setup') }, icon('pin', 'sm'), t('review.new')),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => { app.session = null; app.go('title'); } }, icon('home', 'sm'), t('review.home')),
    ),
  );

  const rightCol = h('div', { class: 'review-col-right' },
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
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, icon('hash'), h('h2', {}, t('code.title')), h('span', { class: 'spacer' }), copyMissionSummary(s, won, nStars)),
      h('p', { class: 'code-big' }, encodeMission(app.data, s.setup)),
      h('p', { class: 'small muted', style: 'margin-top:8px' }, t('code.share')),
    ),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, icon('radio'), h('h2', {}, t('review.data'))),
      h('p', { class: 'muted' }, badge(shippedBadge(s.window.mode)), ' ', t('review.storms', { n: fmtNum(s.window.marsForecasts.length), month })),
      h('ul', { class: 'storm-ids' }, ...s.window.marsForecasts.slice(0, 6).map((f) => h('li', {}, h('span', {}, f.simulationID), h('span', {}, f.arrival.slice(0, 16).replace('T', ' '))))),
    ),
  );

  const certificate = h('article', { class: 'print-certificate print-only' },
    h('div', { class: 'cert-border' },
      h('div', { class: 'cert-header' },
        h('p', { class: 'cert-nasa' }, 'NASA SPACE APPS CHALLENGE 2026'),
        h('h1', { class: 'cert-title' }, t('cert.title')),
        h('p', { class: 'cert-sub' }, t('cert.subtitle')),
      ),
      h('div', { class: 'cert-body' },
        h('p', { class: 'cert-prose' }, t('cert.certified')),
        h('div', { class: 'cert-grid' },
          h('div', { class: 'cert-stat' }, h('span', { class: 'k' }, t('stat.sols')), h('strong', { class: 'v' }, `${fmtNum(st.sol)} / ${fmtNum(sols)}`)),
          h('div', { class: 'cert-stat' }, h('span', { class: 'k' }, t('stat.science')), h('strong', { class: 'v' }, `${fmtNum(st.scienceSent)} / ${fmtNum(v('SCIENCE_GOAL'))}`)),
          h('div', { class: 'cert-stat' }, h('span', { class: 'k' }, t('hud.dose')), h('strong', { class: 'v' }, `${fmt(st.doseMSv)} mSv`)),
          h('div', { class: 'cert-stat' }, h('span', { class: 'k' }, t('site.month')), h('strong', { class: 'v' }, `${t(`site.${s.site.id}`)} · ${month}`)),
        ),
        h('div', { class: 'cert-stars' }, ...[0, 1, 2].map((i) => icon('star', i < nStars ? 'on' : ''))),
        h('div', { class: 'cert-footer' },
          h('div', { class: 'cert-seal' }, '★ RED OUTPOST ★ OFFICIAL FLIGHT RECORD'),
          h('div', { class: 'cert-sig' },
            h('div', { class: 'sig-line' }),
            h('p', {}, 'FLIGHT DIRECTOR · MARS MISSION CONTROL'),
          ),
        ),
      ),
    ),
  );

  return h('main', { class: `screen review ${won ? 'review-won' : 'review-failed'}` },
    certificate,
    h('div', { class: 'review-grid screen-only' }, leftCol, rightCol),
  );
});
