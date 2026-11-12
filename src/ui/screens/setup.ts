import { v } from '../../compute/constants';
import { slopeDeg } from '../../compute/terrain';
import type { SiteData } from '../../data/load';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import { bestFor, defaultLanding, envFor, helpFor, landingCheck, Session, siteGrid, type Setup } from '../../game/session';
import { registerScreen } from '../app';
import { h } from '../dom';
import { fmt, fmtNum, getLang, t } from '../i18n';
import { badge } from '../provenance';

function drawSlopeMap(canvas: HTMLCanvasElement, site: SiteData, mark: { r: number; c: number } | null): void {
  const g = siteGrid(site);
  canvas.width = g.cols;
  canvas.height = g.rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(g.cols, g.rows);
  const lim = v('SLOPE_LIMIT_DEG');
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const s = slopeDeg(g, r, c);
      const i = (r * g.cols + c) * 4;
      if (s > lim) {
        // Too steep: dark red with hatching so colour is not the only signal.
        const hatch = (r + c) % 4 === 0;
        img.data[i] = hatch ? 40 : 120; img.data[i + 1] = hatch ? 10 : 20; img.data[i + 2] = hatch ? 10 : 20;
      } else {
        const k = 1 - s / lim; // flatter = lighter
        img.data[i] = 150 + 95 * k; img.data[i + 1] = 90 + 110 * k; img.data[i + 2] = 60 + 90 * k;
      }
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (mark) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mark.c + 0.5, mark.r + 0.5, 3.5, 0, Math.PI * 2);
    ctx.moveTo(mark.c - 6, mark.r + 0.5); ctx.lineTo(mark.c + 7, mark.r + 0.5);
    ctx.moveTo(mark.c + 0.5, mark.r - 6); ctx.lineTo(mark.c + 0.5, mark.r + 7);
    ctx.stroke();
  }
}

const monthName = (iso: string): string =>
  new Intl.DateTimeFormat(getLang() === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(iso));

registerScreen('setup', (app) => {
  const data = app.data;
  let siteId: SiteData['id'] = 'jezero';
  let windowId = data.space.windows[0]!.id;
  let landing = defaultLanding(data.sites.sites[0]!);

  const status = h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const sunLine = h('p', { class: 'muted' });
  const canvas = h('canvas', { class: 'slope-map', role: 'img', 'aria-label': t('site.tap') });
  const landBtn = h('button', { class: 'btn primary big', type: 'button' }, t('site.land'));
  const siteRow = h('div', { class: 'seg wrap-seg', role: 'radiogroup', 'aria-label': t('site.title') });
  const monthRow = h('div', { class: 'seg wrap-seg', role: 'radiogroup', 'aria-label': t('site.month') });

  const site = (): SiteData => data.sites.sites.find((s) => s.id === siteId) as SiteData;

  function refresh(): void {
    const s = site();
    const check = landingCheck(s, landing.r, landing.c);
    drawSlopeMap(canvas, s, landing);
    status.textContent = check.ok
      ? t('site.ok', { deg: fmt(check.slopeDeg) })
      : t('site.bad', { deg: fmt(check.slopeDeg), lim: fmtNum(v('SLOPE_LIMIT_DEG')) });
    status.className = 'status ' + (check.ok ? 'ok' : 'bad');
    landBtn.disabled = !check.ok;
    const env = envFor(data, { siteId, landing, windowId, seed: 0 });
    const mean = env.reduce((a, e) => a + e.generationKWh, 0) / env.length;
    sunLine.textContent = t('site.sun', { kwh: fmt(mean, 0) });
    siteRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === siteId)));
    monthRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === windowId)));
  }

  for (const s of data.sites.sites) {
    siteRow.append(h('button', {
      type: 'button', role: 'radio', 'data-id': s.id, class: 'seg-btn tall',
      onclick: () => { sfx.click(); siteId = s.id; landing = defaultLanding(s); refresh(); },
    }, h('strong', {}, t(`site.${s.id}`)), h('span', { class: 'small' }, t(`site.${s.id}.desc`))));
  }
  for (const w of data.space.windows) {
    const stars = bestFor(siteId, w.id);
    monthRow.append(h('button', {
      type: 'button', role: 'radio', 'data-id': w.id, class: 'seg-btn tall',
      onclick: () => { sfx.click(); windowId = w.id; refresh(); },
    }, h('strong', {}, monthName(w.start)), h('span', { class: 'small' }, t('site.storms', { n: w.marsForecasts.length }), stars ? ' · ' + '★'.repeat(stars) : '')));
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const g = siteGrid(site());
    landing = {
      r: Math.min(g.rows - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * g.rows))),
      c: Math.min(g.cols - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * g.cols))),
    };
    const ok = landingCheck(site(), landing.r, landing.c).ok;
    if (ok) sfx.click(); else sfx.alarm();
    refresh();
  });
  // Keyboard: arrow keys move the landing marker.
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
    h('h1', {}, t('site.title')),
    siteRow,
    h('figure', { class: 'map-fig' }, canvas, h('figcaption', { class: 'small muted' }, t('site.tap'), ' ', badge('cache'), ' MOLA MEGDR · Mars Trek')),
    status,
    h('h2', {}, t('site.month')),
    monthRow,
    sunLine,
    h('div', { class: 'stack' }, landBtn, h('button', { class: 'btn ghost', type: 'button', onclick: () => app.go('title') }, t('back'))),
  );
});
