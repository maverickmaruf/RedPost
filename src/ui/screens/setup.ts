import { v } from '../../compute/constants';
import { slopeDeg } from '../../compute/terrain';
import type { SiteData } from '../../data/load';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import { bestFor, defaultLanding, envFor, helpFor, landingCheck, Session, siteGrid, type Setup } from '../../game/session';
import { registerScreen } from '../app';
import { h } from '../dom';
import { fmt, fmtNum, getLang, t } from '../i18n';
import { icon } from '../icons';
import { badge } from '../provenance';

const SCALE = 4;

/** Shaded relief of the MOLA grid, coloured by height, with too-steep ground hatched. Visual only. */
function drawMap(canvas: HTMLCanvasElement, site: SiteData, mark: { r: number; c: number }, ok: boolean): void {
  const g = siteGrid(site);
  const W = g.cols, H = g.rows;
  const small = document.createElement('canvas');
  small.width = W; small.height = H;
  const sctx = small.getContext('2d');
  const ctx = canvas.getContext('2d');
  if (!sctx || !ctx) return;
  const z = (r: number, c: number): number => g.elevation_m[Math.min(H - 1, Math.max(0, r)) * W + Math.min(W - 1, Math.max(0, c))] as number;
  let lo = Infinity, hi = -Infinity;
  for (const e of g.elevation_m) { lo = Math.min(lo, e); hi = Math.max(hi, e); }
  const img = sctx.createImageData(W, H);
  const az = (315 * Math.PI) / 180, alt = (40 * Math.PI) / 180, zf = 4;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const dzdx = ((z(r - 1, c + 1) + 2 * z(r, c + 1) + z(r + 1, c + 1)) - (z(r - 1, c - 1) + 2 * z(r, c - 1) + z(r + 1, c - 1))) / (8 * g.dxM);
      const dzdy = ((z(r + 1, c - 1) + 2 * z(r + 1, c) + z(r + 1, c + 1)) - (z(r - 1, c - 1) + 2 * z(r - 1, c) + z(r - 1, c + 1))) / (8 * g.dyM);
      const slope = Math.atan(zf * Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.cos(Math.PI / 2 - alt) * Math.cos(slope) + Math.sin(Math.PI / 2 - alt) * Math.sin(slope) * Math.cos(az - aspect));
      const k = hi > lo ? (z(r, c) - lo) / (hi - lo) : 0.5;
      const light = 0.35 + 0.85 * shade;
      const i = (r * W + c) * 4;
      img.data[i] = Math.min(255, (120 + 115 * k) * light);
      img.data[i + 1] = Math.min(255, (55 + 85 * k) * light);
      img.data[i + 2] = Math.min(255, (35 + 55 * k) * light);
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W * SCALE, H * SCALE);

  // Hatch every pixel that is too steep to land on (pattern + tint, so colour is not the only signal).
  const lim = v('SLOPE_LIMIT_DEG');
  ctx.save();
  ctx.fillStyle = 'rgba(120, 10, 20, 0.35)';
  ctx.strokeStyle = 'rgba(255, 90, 90, 0.85)';
  ctx.lineWidth = 1;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (slopeDeg(g, r, c) <= lim) continue;
    const x = c * SCALE, y = r * SCALE;
    ctx.fillRect(x, y, SCALE, SCALE);
    ctx.beginPath(); ctx.moveTo(x, y + SCALE); ctx.lineTo(x + SCALE, y); ctx.stroke();
  }
  ctx.restore();

  // Landing marker with tactical radar HUD
  const cx = (mark.c + 0.5) * SCALE, cy = (mark.r + 0.5) * SCALE;
  const curZ = z(mark.r, mark.c);
  const curSlope = slopeDeg(g, mark.r, mark.c);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
  ctx.strokeStyle = ok ? '#3ddc97' : '#ff6464';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
  // Outer tactical range ring
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = ok ? 'rgba(61, 220, 151, 0.7)' : 'rgba(255, 100, 100, 0.7)';
  ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // Crosshairs
  ctx.lineWidth = 2;
  ctx.strokeStyle = ok ? '#3ddc97' : '#ff6464';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 30);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();

  // On-canvas tactical HUD coordinates
  ctx.font = 'bold 11px monospace';
  const tagText = `${Math.round(curZ)} m · ${curSlope.toFixed(1)}°`;
  const textWidth = ctx.measureText(tagText).width;
  const tagX = Math.min(W * SCALE - textWidth - 14, Math.max(6, cx - textWidth / 2));
  const tagY = cy > 40 ? cy - 32 : cy + 42;
  ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
  ctx.fillRect(tagX - 5, tagY - 12, textWidth + 10, 18);
  ctx.strokeStyle = ok ? '#3ddc97' : '#ff6464';
  ctx.lineWidth = 1;
  ctx.strokeRect(tagX - 5, tagY - 12, textWidth + 10, 18);
  ctx.fillStyle = ok ? '#b9f6da' : '#ffd6d6';
  ctx.fillText(tagText, tagX, tagY + 1);
  ctx.restore();
}

const monthName = (iso: string): string =>
  new Intl.DateTimeFormat(getLang() === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(iso));

const step = (n: number, title: string): HTMLElement =>
  h('h2', { class: 'step-title' }, h('span', { class: 'step-num', 'aria-hidden': 'true' }, fmtNum(n)), title);

registerScreen('setup', (app) => {
  const data = app.data;
  let siteId: SiteData['id'] = 'jezero';
  let windowId = data.space.windows[0]!.id;
  let landing = defaultLanding(data.sites.sites[0]!);

  const status = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const sunLine = h('p', { class: 'sun-forecast' });
  const canvas = h('canvas', { class: 'slope-map', role: 'img', 'aria-label': t('site.tap') });
  const landBtn = h('button', { class: 'btn primary lg block', type: 'button' }, icon('pin', 'sm'), t('site.land'));
  const siteRow = h('div', { class: 'option-grid', role: 'radiogroup', 'aria-label': t('site.title') });
  const monthRow = h('div', { class: 'option-grid', role: 'radiogroup', 'aria-label': t('site.month') });

  const site = (): SiteData => data.sites.sites.find((s) => s.id === siteId) as SiteData;

  function refresh(): void {
    const s = site();
    const check = landingCheck(s, landing.r, landing.c);
    drawMap(canvas, s, landing, check.ok);
    status.replaceChildren(icon(check.ok ? 'check' : 'alert'), h('span', {}, check.ok
      ? t('site.ok', { deg: fmt(check.slopeDeg) })
      : t('site.bad', { deg: fmt(check.slopeDeg), lim: fmtNum(v('SLOPE_LIMIT_DEG')) })));
    status.className = 'status ' + (check.ok ? 'ok' : 'bad');
    landBtn.disabled = !check.ok;
    const env = envFor(data, { siteId, landing, windowId, seed: 0 });
    const mean = env.reduce((a, e) => a + e.generationKWh, 0) / env.length;
    sunLine.replaceChildren(icon('sun'), h('span', {}, t('site.sun', { kwh: fmt(mean, 0) })));
    siteRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === siteId)));
    monthRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === windowId)));
  }

  for (const s of data.sites.sites) {
    siteRow.append(h('button', {
      type: 'button', role: 'radio', 'data-id': s.id, class: 'option',
      onclick: () => { sfx.click(); siteId = s.id; landing = defaultLanding(s); refresh(); },
    }, h('strong', {}, t(`site.${s.id}`)), h('span', { class: 'small' }, t(`site.${s.id}.desc`))));
  }
  for (const w of data.space.windows) {
    const stars = bestFor(siteId, w.id);
    const yr = new Date(w.start).getFullYear();
    const isFuture = yr >= 2026;
    monthRow.append(h('button', {
      type: 'button', role: 'radio', 'data-id': w.id, class: 'option',
      onclick: () => { sfx.click(); windowId = w.id; refresh(); },
    },
      h('strong', {},
        monthName(w.start),
        isFuture ? h('span', { class: 'badge badge-live', style: 'font-size: 0.62rem; padding: 2px 6px; margin-left: auto;' }, 'FUTURE') : null,
      ),
      h('span', { class: 'small' }, w.label),
      h('span', { class: 'small muted', style: 'font-size: 0.74rem;' }, t('site.storms', { n: fmtNum(w.marsForecasts.length) })),
      stars ? h('span', { class: 'stars', 'aria-label': t('review.stars', { n: stars }) }, '★'.repeat(stars)) : null,
    ));
  }

  const pick = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const g = siteGrid(site());
    landing = {
      r: Math.min(g.rows - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * g.rows))),
      c: Math.min(g.cols - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * g.cols))),
    };
    if (landingCheck(site(), landing.r, landing.c).ok) sfx.radar(); else sfx.alarm();
    refresh();
  };
  canvas.addEventListener('click', (e) => pick(e.clientX, e.clientY));
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => {
    const g = siteGrid(site());
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    landing = { r: Math.min(g.rows - 1, Math.max(0, landing.r + m[0] * 2)), c: Math.min(g.cols - 1, Math.max(0, landing.c + m[1] * 2)) };
    refresh();
  });

  landBtn.addEventListener('click', () => {
    if (!landingCheck(site(), landing.r, landing.c).ok) return;
    sfx.endSol();
    const setup: Setup = { siteId, landing, windowId, seed: ((landing.r * 131 + landing.c * 7 + windowId.length) >>> 0) & 4095 };
    app.session = new Session(data, { ...setup, help: helpFor(setup) });
    app.go('sol');
  });

  app.provenance = () => {
    const s = site();
    const w = data.space.windows.find((x) => x.id === windowId)!;
    return [
      { source_id: 'mola-megdr', badge: shippedBadge(s.mode), detail: `${s.tile}.img · ${s.grid.rows}×${s.grid.cols} px · 463 m/px`, retrieved: s.retrieved },
      { source_id: 'trek-bookmarks', badge: shippedBadge(s.mode), detail: `${s.trek.title} · ${s.trek.bbox}`, retrieved: s.retrieved },
      { source_id: 'donki-enlil', badge: shippedBadge(w.mode), detail: `${w.start} → ${w.end}`, retrieved: w.retrieved, url: w.url_enlil },
      { source_id: 'giss-mars24', badge: 'computed' },
    ];
  };

  queueMicrotask(refresh);
  return h('main', { class: 'screen setup' },
    h('div', { class: 'setup-head' }, h('p', { class: 'eyebrow' }, t('app.eyebrow')), h('h1', {}, t('site.title'))),
    h('div', { class: 'setup-grid' },
      h('div', { class: 'setup-col-map' },
        step(2, t('site.step.spot')),
        h('section', { class: 'card map-card' },
          canvas,
          h('div', { class: 'map-legend' },
            h('span', {}, t('site.legend.flat')), h('span', { class: 'ramp', 'aria-hidden': 'true' }), h('span', {}, t('site.legend.steep')),
            h('span', { class: 'hatch', 'aria-hidden': 'true' }), h('span', {}, t('site.legend.toosteep'))),
          status,
          h('p', { class: 'small faint' }, t('site.tap'), ' ', badge('cache'), ' MOLA MEGDR · Mars Trek'),
        ),
      ),
      h('div', { class: 'setup-col-controls' },
        step(1, t('site.step.site')),
        siteRow,
        step(3, t('site.month')),
        monthRow,
        sunLine,
        h('div', { class: 'btn-row' }, landBtn, h('button', { class: 'btn ghost block', type: 'button', onclick: () => app.go('title') }, icon('back', 'sm'), t('back'))),
      ),
    ),
  );
});
