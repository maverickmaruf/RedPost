// Deep Space Telemetry Relay (Earth-Mars Signal Map)
// Visually depicts the Sun, Earth, Mars orbits, radio light-travel delay,
// and the speed disparity between radio waves (light speed) and solar CME storm clouds.

import type { SolEnv } from '../compute/mission';
import { fmt, t } from './i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';

function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  ...children: (SVGElement | string)[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) {
    if (typeof c === 'string') el.append(document.createTextNode(c));
    else if (c) el.append(c);
  }
  return el;
}

export function renderRelayDiagram(env: SolEnv, hasStormAhead: boolean): HTMLElement {
  const delaySec = env.lightTimeS;
  const min = Math.floor(delaySec / 60);
  const sec = Math.round(delaySec % 60);
  const distAU = fmt(env.rAU, 2);

  const container = document.createElement('div');
  container.className = 'relay-container';

  const svg = s('svg', {
    viewBox: '0 0 540 130',
    class: 'relay-svg',
    role: 'img',
    'aria-label': `${t('relay.title')}: ${t('relay.delay', { min, sec })}`,
  });

  const defs = s('defs');
  svg.append(defs);

  // Gradient for CME plasma cloud
  const cmeGrad = s('linearGradient', { id: 'cme-grad', x1: 0, y1: 0, x2: 1, y2: 0 });
  cmeGrad.append(
    s('stop', { offset: '0%', 'stop-color': 'rgba(255, 200, 50, 0.7)' }),
    s('stop', { offset: '70%', 'stop-color': 'rgba(255, 80, 80, 0.5)' }),
    s('stop', { offset: '100%', 'stop-color': 'rgba(255, 50, 50, 0)' }),
  );
  defs.append(cmeGrad);

  // Background Dark Space
  svg.append(s('rect', { width: 540, height: 130, rx: 12, fill: '#0a0e1a', stroke: '#1d263b', 'stroke-width': 1 }));

  // Sun in Center-Left (x=90, y=65)
  const sunX = 90, sunY = 65;
  svg.append(
    s('circle', { cx: sunX, cy: sunY, r: 28, fill: '#ffc857', opacity: '0.12' }),
    s('circle', { cx: sunX, cy: sunY, r: 18, fill: '#ffb347', opacity: '0.25' }),
    s('circle', { cx: sunX, cy: sunY, r: 11, fill: '#ffffff' }),
    s('text', { x: sunX, y: sunY + 28, fill: '#ffc857', 'font-size': '10px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, 'SUN'),
  );

  // Earth Position (x=210, y=45)
  const earthX = 210, earthY = 45;
  // Earth orbit arc
  svg.append(
    s('path', { d: `M ${sunX} ${sunY - 120} A 120 120 0 0 1 ${sunX} ${sunY + 120}`, fill: 'none', stroke: '#25354f', 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
  );
  // Earth
  svg.append(
    s('circle', { cx: earthX, cy: earthY, r: 12, fill: 'rgba(92, 200, 255, 0.25)' }),
    s('circle', { cx: earthX, cy: earthY, r: 8, fill: '#5cc8ff' }),
    s('circle', { cx: earthX - 2, cy: earthY - 2, r: 3, fill: '#3ddc97', opacity: '0.8' }),
    s('text', { x: earthX, y: earthY - 14, fill: '#5cc8ff', 'font-size': '10px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, 'EARTH'),
  );

  // Mars Position (x=450, y=75)
  const marsX = 450, marsY = 75;
  // Mars orbit arc
  svg.append(
    s('path', { d: `M ${sunX} ${sunY - 360} A 360 360 0 0 1 ${sunX} ${sunY + 360}`, fill: 'none', stroke: '#3f2824', 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
  );
  // Mars
  svg.append(
    s('circle', { cx: marsX, cy: marsY, r: 14, fill: 'rgba(255, 107, 53, 0.25)' }),
    s('circle', { cx: marsX, cy: marsY, r: 7.5, fill: '#ff6b35' }),
    s('circle', { cx: marsX + 1, cy: marsY - 1, r: 2.5, fill: '#ffb27a', opacity: '0.6' }),
    s('text', { x: marsX, y: marsY + 22, fill: '#ff8a5c', 'font-size': '10px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, 'MARS OUTPOST'),
  );

  // Radio Signal Beam (Earth to Mars)
  svg.append(
    // Pulsing line
    s('line', {
      x1: earthX + 9, y1: earthY + 1, x2: marsX - 9, y2: marsY - 1,
      stroke: '#7aa2ff', 'stroke-width': 2, 'stroke-dasharray': '6 4', class: 'relay-beam',
    }),
    s('line', {
      x1: earthX + 9, y1: earthY + 1, x2: marsX - 9, y2: marsY - 1,
      stroke: 'rgba(122, 162, 255, 0.3)', 'stroke-width': 6,
    }),
  );

  // Radio Wave Pulse Animation Marker along beam
  const midX = (earthX + marsX) / 2;
  const midY = (earthY + marsY) / 2;
  svg.append(
    s('rect', {
      x: midX - 68, y: midY - 18, width: 136, height: 20, rx: 10,
      fill: 'rgba(10, 14, 26, 0.92)', stroke: '#344569', 'stroke-width': 1,
    }),
    s('text', {
      x: midX, y: midY - 5,
      fill: '#c7d6ff', 'font-size': '9.5px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold',
    }, `📡 ${min}m ${sec}s (${distAU} AU)`),
  );

  // Solar Storm CME Wavefront from Sun toward Mars
  if (hasStormAhead) {
    const cmeWave = s('g', { class: 'relay-cme' });
    cmeWave.append(
      s('path', {
        d: `M ${sunX + 25} ${sunY - 20} Q ${sunX + 180} ${sunY - 10} ${marsX - 40} ${marsY - 35} L ${marsX - 40} ${marsY + 35} Q ${sunX + 180} ${sunY + 10} ${sunX + 25} ${sunY + 20} Z`,
        fill: 'url(#cme-grad)',
        class: 'relay-cme-arc',
      }),
      s('text', {
        x: (sunX + marsX) / 2, y: 115,
        fill: '#ffc857', 'font-size': '9px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold',
      }, '⚡ NASA DONKI CME (800 km/s) vs RADIO (300,000 km/s)'),
    );
    svg.append(cmeWave);
  }

  container.append(svg);
  return container;
}

