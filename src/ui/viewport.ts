// Interactive Living Mars Outpost Viewport
// Renders an animated SVG diorama of the Martian habitat that visually reacts
// to real NASA space weather, solar radiation, temperature, and cadet command decisions.

import { v } from '../compute/constants';
import type { SolEnv } from '../compute/mission';
import type { Plan } from '../compute/outpost';
import { sfx } from '../game/audio';
import { h } from './dom';
import { fmt, t } from './i18n';
import { icon } from './icons';

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

export interface ViewportProps {
  sol: number;
  totalSols: number;
  env: SolEnv;
  plan: Plan;
  siteName: string;
  stormKnownToday: boolean;
  onToggle: (sys: 'air' | 'greenhouse' | 'radio' | 'crew') => void;
}

export function renderOutpostViewport(props: ViewportProps): HTMLElement {
  const { sol, totalSols, env, plan, siteName, stormKnownToday, onToggle } = props;
  const isStorming = env.storm !== 'none' || stormKnownToday;
  const isDusty = env.dustTau > 0.8;

  const svg = s('svg', {
    viewBox: '0 0 720 300',
    class: 'outpost-svg',
    role: 'img',
    'aria-label': t('viewport.title'),
  });

  const defs = s('defs');
  svg.append(defs);

  // Dynamic Martian Sky Gradient
  const skyGrad = s('linearGradient', { id: 'vp-sky', x1: 0, y1: 0, x2: 0, y2: 1 });
  if (isStorming) {
    skyGrad.append(
      s('stop', { offset: '0%', 'stop-color': '#210626' }),
      s('stop', { offset: '40%', 'stop-color': '#581636' }),
      s('stop', { offset: '75%', 'stop-color': '#a82c40' }),
      s('stop', { offset: '100%', 'stop-color': '#df5f38' }),
    );
  } else if (isDusty) {
    skyGrad.append(
      s('stop', { offset: '0%', 'stop-color': '#1f1107' }),
      s('stop', { offset: '45%', 'stop-color': '#5a2e14' }),
      s('stop', { offset: '80%', 'stop-color': '#a65626' }),
      s('stop', { offset: '100%', 'stop-color': '#cf7a3a' }),
    );
  } else {
    skyGrad.append(
      s('stop', { offset: '0%', 'stop-color': '#080c18' }),
      s('stop', { offset: '40%', 'stop-color': '#1f182c' }),
      s('stop', { offset: '75%', 'stop-color': '#662426' }),
      s('stop', { offset: '100%', 'stop-color': '#b64a2e' }),
    );
  }
  defs.append(skyGrad);

  // Habitat Shell Gradient
  const habGrad = s('linearGradient', { id: 'vp-hab', x1: 0, y1: 0, x2: 1, y2: 1 });
  habGrad.append(
    s('stop', { offset: '0%', 'stop-color': '#3f4f6e' }),
    s('stop', { offset: '50%', 'stop-color': '#263145' }),
    s('stop', { offset: '100%', 'stop-color': '#131924' }),
  );
  defs.append(habGrad);

  // Greenhouse Glass Gradient
  const ghGrad = s('linearGradient', { id: 'vp-gh', x1: 0, y1: 0, x2: 0, y2: 1 });
  if (plan.greenhouse) {
    ghGrad.append(
      s('stop', { offset: '0%', 'stop-color': 'rgba(61, 220, 151, 0.45)' }),
      s('stop', { offset: '100%', 'stop-color': 'rgba(20, 100, 60, 0.85)' }),
    );
  } else {
    ghGrad.append(
      s('stop', { offset: '0%', 'stop-color': 'rgba(70, 90, 110, 0.25)' }),
      s('stop', { offset: '100%', 'stop-color': 'rgba(25, 35, 45, 0.75)' }),
    );
  }
  defs.append(ghGrad);

  // Solar Panel Gradient
  const panelGrad = s('linearGradient', { id: 'vp-panel', x1: 0, y1: 0, x2: 0, y2: 1 });
  panelGrad.append(
    s('stop', { offset: '0%', 'stop-color': '#29487d' }),
    s('stop', { offset: '100%', 'stop-color': '#0d192e' }),
  );
  defs.append(panelGrad);

  // Sky Backdrop
  svg.append(s('rect', { width: 720, height: 210, fill: 'url(#vp-sky)' }));

  // Stars & Phobos
  const starsGroup = s('g', { class: 'vp-stars' });
  const starCoords: [number, number, number][] = [
    [40, 25, 1.2], [85, 45, 1.5], [130, 20, 1.0], [170, 60, 1.4], [210, 30, 0.9],
    [260, 50, 1.3], [310, 22, 1.1], [360, 40, 1.6], [410, 18, 1.0], [460, 55, 1.2],
    [510, 25, 1.4], [570, 70, 0.9], [620, 30, 1.5], [670, 45, 1.1], [700, 20, 1.3],
    [65, 80, 0.8], [145, 95, 1.0], [280, 85, 1.2], [480, 90, 0.8], [640, 95, 1.2]
  ];
  for (const [cx, cy, r] of starCoords) {
    starsGroup.append(s('circle', { cx, cy, r, fill: '#fff', opacity: (0.4 + (r * 0.35)).toFixed(2) }));
  }
  svg.append(starsGroup);

  // Phobos Moon
  const phobos = s('g', { class: 'vp-moon', transform: 'translate(130, 48)' });
  phobos.append(
    s('path', { d: 'M0 0 A 10 10 0 1 0 14 14 A 12 12 0 0 1 0 0 Z', fill: '#d4c2b2', opacity: '0.85' }),
    s('circle', { cx: 4, cy: 7, r: 1.5, fill: '#8c7b6d', opacity: '0.6' }),
    s('circle', { cx: 8, cy: 11, r: 1.2, fill: '#8c7b6d', opacity: '0.6' }),
  );
  svg.append(phobos);

  // Mars Sun (Compact, 44% dimmer than Earth)
  const sunGroup = s('g', { class: 'vp-sun', transform: 'translate(570, 50)' });
  sunGroup.append(
    s('circle', { cx: 0, cy: 0, r: 24, fill: '#ffdd99', opacity: '0.18' }),
    s('circle', { cx: 0, cy: 0, r: 14, fill: '#ffeebf', opacity: '0.35' }),
    s('circle', { cx: 0, cy: 0, r: 7.5, fill: '#ffffff' }),
  );
  svg.append(sunGroup);

  // Solar Storm CME Aurora Curtains
  if (isStorming) {
    const aurora = s('g', { class: 'vp-aurora' });
    aurora.append(
      s('path', {
        d: 'M0 80 Q 180 50 360 85 T 720 70 L 720 140 Q 540 110 360 145 T 0 130 Z',
        fill: 'rgba(255, 60, 110, 0.18)',
        filter: 'blur(4px)',
      }),
      s('path', {
        d: 'M0 60 Q 200 90 400 65 T 720 80 L 720 115 Q 520 135 260 100 T 0 105 Z',
        fill: 'rgba(255, 180, 60, 0.22)',
        filter: 'blur(3px)',
      }),
    );
    svg.append(aurora);
  }

  // Distant Mountain Rim (Crater Wall)
  svg.append(s('path', {
    d: 'M0 168 Q 110 145 230 162 T 470 152 T 720 160 L 720 220 L 0 220 Z',
    fill: '#3a1710',
  }));

  // Midground Ridge
  svg.append(s('path', {
    d: 'M0 188 Q 170 172 360 184 T 720 176 L 720 250 L 0 250 Z',
    fill: '#572015',
  }));

  // Foreground Terrain (Martian Regolith)
  svg.append(s('path', {
    d: 'M0 205 Q 180 196 380 206 T 720 198 L 720 300 L 0 300 Z',
    fill: '#7a2b18',
  }));
  svg.append(s('path', {
    d: 'M0 222 Q 220 216 460 224 T 720 216 L 720 300 L 0 300 Z',
    fill: '#5e1e10',
  }));

  // Rover Tracks in Regolith
  svg.append(s('path', {
    d: 'M0 285 Q 160 270 330 262 T 520 248',
    fill: 'none',
    stroke: '#42140a',
    'stroke-width': 3,
    'stroke-dasharray': '4 2',
    opacity: '0.6',
  }));
  svg.append(s('path', {
    d: 'M0 292 Q 160 277 330 269 T 520 255',
    fill: 'none',
    stroke: '#42140a',
    'stroke-width': 3,
    'stroke-dasharray': '4 2',
    opacity: '0.6',
  }));

  // ---------------- OUTPOST MODULES ----------------

  // 1. Dual Solar Array (Flanking Left)
  const solarGroup = s('g', { class: 'vp-solar', transform: 'translate(95, 175)' });
  // Mount / Pylon
  solarGroup.append(
    s('path', { d: 'M40 50 L40 18 M25 50 L55 50', stroke: '#1f2738', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    s('path', { d: 'M40 18 L10 10 M40 18 L70 10', stroke: '#2e3d57', 'stroke-width': 2 }),
  );
  // Left Wing
  solarGroup.append(
    s('polygon', { points: '2,-2 38,4 36,26 0,20', fill: 'url(#vp-panel)', stroke: '#3d527a', 'stroke-width': 1.5 }),
    s('line', { x1: 19, y1: 1, x2: 18, y2: 23, stroke: '#506e9f', 'stroke-width': 1 }),
    s('line', { x1: 2, y1: 9, x2: 38, y2: 15, stroke: '#506e9f', 'stroke-width': 1 }),
  );
  // Right Wing
  solarGroup.append(
    s('polygon', { points: '42,4 78,-2 80,20 44,26', fill: 'url(#vp-panel)', stroke: '#3d527a', 'stroke-width': 1.5 }),
    s('line', { x1: 61, y1: 1, x2: 62, y2: 23, stroke: '#506e9f', 'stroke-width': 1 }),
    s('line', { x1: 42, y1: 15, x2: 78, y2: 9, stroke: '#506e9f', 'stroke-width': 1 }),
  );
  // Solar Power Badge
  solarGroup.append(
    s('rect', { x: 12, y: 32, width: 56, height: 16, rx: 8, fill: 'rgba(10, 14, 23, 0.85)', stroke: '#ffc857', 'stroke-width': 1 }),
    s('text', { x: 40, y: 43, fill: '#ffc857', 'font-size': '8.5px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, `+${fmt(env.generationKWh, 0)} kWh`),
  );
  svg.append(solarGroup);

  // 2. High-Gain Deep Space Antenna (Hotspot: Click to toggle Radio)
  const radioGroup = s('g', {
    class: `vp-hotspot vp-radio ${plan.radio ? 'is-active' : 'is-idle'}`,
    transform: 'translate(440, 140)',
    tabindex: 0,
    role: 'button',
    'aria-label': `${t('viewport.radio')}: ${plan.radio ? t('opt.on') : t('opt.off')}`,
  });
  // Mast
  radioGroup.append(
    s('line', { x1: 20, y1: 85, x2: 20, y2: 25, stroke: '#2e3b52', 'stroke-width': 3 }),
    s('line', { x1: 8, y1: 85, x2: 20, y2: 45, stroke: '#1a2333', 'stroke-width': 1.5 }),
    s('line', { x1: 32, y1: 85, x2: 20, y2: 45, stroke: '#1a2333', 'stroke-width': 1.5 }),
  );
  // Dish
  if (plan.radio) {
    // Parabolic dish tilted skyward
    radioGroup.append(
      s('path', { d: 'M5 12 Q 22 25 36 8', fill: '#1d273a', stroke: '#7aa2ff', 'stroke-width': 2.5 }),
      s('line', { x1: 20, y1: 20, x2: 25, y2: 2, stroke: '#7aa2ff', 'stroke-width': 1.5 }),
      s('circle', { cx: 25, cy: 2, r: 2.5, fill: '#7aa2ff' }),
      // Pulsing radio wave arcs
      s('path', { d: 'M20 -6 A 14 14 0 0 1 36 -2', fill: 'none', stroke: '#7aa2ff', 'stroke-width': 2, class: 'vp-wave vp-wave-1' }),
      s('path', { d: 'M16 -14 A 24 24 0 0 1 44 -8', fill: 'none', stroke: '#7aa2ff', 'stroke-width': 1.6, class: 'vp-wave vp-wave-2', opacity: '0.7' }),
      s('path', { d: 'M12 -22 A 34 34 0 0 1 52 -14', fill: 'none', stroke: '#7aa2ff', 'stroke-width': 1.2, class: 'vp-wave vp-wave-3', opacity: '0.4' }),
    );
  } else {
    // Parked dish down
    radioGroup.append(
      s('path', { d: 'M8 25 Q 22 36 34 26', fill: '#182030', stroke: '#566580', 'stroke-width': 2 }),
      s('line', { x1: 20, y1: 30, x2: 20, y2: 40, stroke: '#566580', 'stroke-width': 1.5 }),
      s('circle', { cx: 20, cy: 25, r: 2, fill: '#ff6464' }), // red mute light
    );
  }
  // Click handler
  radioGroup.addEventListener('click', () => {
    sfx.relay();
    onToggle('radio');
  });
  radioGroup.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.relay(); onToggle('radio'); }
  });
  svg.append(radioGroup);

  // 3. Hydroponic Greenhouse Biodome (Hotspot: Click to toggle Greenhouse)
  const ghGroup = s('g', {
    class: `vp-hotspot vp-greenhouse ${plan.greenhouse ? 'is-active' : 'is-idle'}`,
    transform: 'translate(490, 175)',
    tabindex: 0,
    role: 'button',
    'aria-label': `${t('viewport.gh')}: ${plan.greenhouse ? t('opt.on') : t('opt.off')}`,
  });
  // Connecting Tunnel from Main Hab
  ghGroup.append(
    s('rect', { x: -35, y: 30, width: 40, height: 22, rx: 3, fill: '#1a2233', stroke: '#2e3d57', 'stroke-width': 1.5 }),
    s('line', { x1: -20, y1: 30, x2: -20, y2: 52, stroke: '#3f5376', 'stroke-width': 1 }),
  );
  // Greenhouse Biodome Shell
  ghGroup.append(
    s('path', {
      d: 'M0 52 C 0 16, 80 16, 80 52 Z',
      fill: 'url(#vp-gh)',
      stroke: plan.greenhouse ? '#3ddc97' : '#33445c',
      'stroke-width': plan.greenhouse ? 2 : 1.5,
    }),
    // Structural Ribs
    s('path', { d: 'M22 52 C 22 24, 58 24, 58 52', fill: 'none', stroke: plan.greenhouse ? '#3ddc97' : '#33445c', 'stroke-width': 1, opacity: '0.6' }),
    s('line', { x1: 40, y1: 18, x2: 40, y2: 52, stroke: plan.greenhouse ? '#3ddc97' : '#33445c', 'stroke-width': 1, opacity: '0.6' }),
  );
  // Interior Crops & Lights
  if (plan.greenhouse) {
    // Bioluminescent glow inside
    ghGroup.append(
      s('ellipse', { cx: 40, cy: 44, rx: 28, ry: 8, fill: '#3ddc97', opacity: '0.35', filter: 'blur(3px)' }),
      // Crop silhouettes
      s('path', { d: 'M14 50 Q 18 42 22 50 Q 26 40 30 50 Q 36 38 42 50 Q 48 41 54 50 Q 60 43 66 50', stroke: '#157545', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      // Hydroponic LED strip
      s('line', { x1: 20, y1: 26, x2: 60, y2: 26, stroke: '#b2f7d5', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    );
  } else {
    // Standby dim bulb
    ghGroup.append(
      s('circle', { cx: 40, cy: 30, r: 2, fill: '#ffc857', opacity: '0.5' }),
    );
  }
  // Foundation
  ghGroup.append(
    s('rect', { x: -4, y: 50, width: 88, height: 8, rx: 2, fill: '#141b28', stroke: '#25334a', 'stroke-width': 1 }),
  );
  ghGroup.addEventListener('click', () => {
    sfx.toggle();
    onToggle('greenhouse');
  });
  ghGroup.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.toggle(); onToggle('greenhouse'); }
  });
  svg.append(ghGroup);

  // 4. Central Geodesic Habitat (Hotspot for Air Scrubber & Hab)
  const habGroup = s('g', {
    class: 'vp-hab-module',
    transform: 'translate(225, 145)',
  });
  // Storm Shelter Sub-Bunker (Under Hab)
  const shelterActive = plan.crew === 'shelter';
  habGroup.append(
    s('rect', {
      x: 35, y: 82, width: 100, height: 26, rx: 4,
      fill: shelterActive ? '#2c183a' : '#121722',
      stroke: shelterActive ? '#c792ff' : '#253049',
      'stroke-width': shelterActive ? 2 : 1,
    }),
    s('text', {
      x: 85, y: 99,
      fill: shelterActive ? '#e2c7ff' : '#697a99',
      'font-size': '9px',
      'font-family': 'monospace',
      'text-anchor': 'middle',
      'font-weight': shelterActive ? 'bold' : 'normal',
    }, shelterActive ? '🛡️ SHELTER ACTIVE' : 'BUNKER: STANDBY'),
  );

  // Main Geodesic Dome
  habGroup.append(
    s('path', {
      d: 'M0 82 C 0 20, 170 20, 170 82 Z',
      fill: 'url(#vp-hab)',
      stroke: '#405273',
      'stroke-width': 2,
    }),
    // Facet lines
    s('path', { d: 'M0 82 L 45 46 L 85 32 L 125 46 L 170 82', fill: 'none', stroke: '#2e3c54', 'stroke-width': 1.5 }),
    s('path', { d: 'M45 46 L 85 82 L 125 46', fill: 'none', stroke: '#2e3c54', 'stroke-width': 1.5 }),
    s('line', { x1: 85, y1: 32, x2: 85, y2: 82, stroke: '#2e3c54', 'stroke-width': 1.5 }),
  );

  // Panoramic Observation Bay / Lab Window
  const isLab = plan.crew === 'lab';
  const bayFill = isLab
    ? 'rgba(92, 200, 255, 0.75)'
    : shelterActive
      ? 'rgba(25, 32, 48, 0.6)'
      : 'rgba(255, 200, 100, 0.65)';
  habGroup.append(
    s('path', {
      d: 'M60 68 Q 85 58 110 68 L 106 78 Q 85 70 64 78 Z',
      fill: bayFill,
      stroke: isLab ? '#5cc8ff' : '#3a4966',
      'stroke-width': isLab ? 2 : 1,
    }),
  );
  if (isLab) {
    // Astronaut silhouette in window with science instruments
    habGroup.append(
      s('circle', { cx: 85, cy: 68, r: 3, fill: '#0a101d' }),
      s('path', { d: 'M78 78 Q 85 73 92 78 Z', fill: '#0a101d' }),
      s('circle', { cx: 98, cy: 72, r: 1.5, fill: '#3ddc97' }), // microscope glow
    );
  }

  // Airlock Door & Hatch
  habGroup.append(
    s('rect', { x: 73, y: 72, width: 24, height: 14, rx: 3, fill: '#101622', stroke: '#3a4966', 'stroke-width': 1 }),
    s('circle', { cx: 85, cy: 79, r: 2.5, fill: '#4d6182' }),
  );

  // MOXIE Oxygen Vent (Hotspot: Click to cycle Air mode)
  const airGroup = s('g', {
    class: `vp-hotspot vp-air ${plan.air !== 'off' ? 'is-active' : 'is-idle'}`,
    transform: 'translate(75, 16)',
    tabindex: 0,
    role: 'button',
    'aria-label': `${t('viewport.air')}: ${t(`opt.${plan.air}`)}`,
  });
  airGroup.append(
    s('rect', { x: 2, y: 6, width: 16, height: 10, rx: 2, fill: '#1f293d', stroke: '#5cc8ff', 'stroke-width': 1.2 }),
    s('line', { x1: 5, y1: 10, x2: 15, y2: 10, stroke: '#5cc8ff', 'stroke-width': 1 }),
  );
  if (plan.air === 'boost') {
    // Double pulsing oxygen plumes
    airGroup.append(
      s('path', { d: 'M7 6 Q 5 -4 2 -12', stroke: '#5cc8ff', 'stroke-width': 2.5, 'stroke-linecap': 'round', fill: 'none', class: 'vp-o2-vent' }),
      s('path', { d: 'M13 6 Q 15 -4 18 -12', stroke: '#5cc8ff', 'stroke-width': 2.5, 'stroke-linecap': 'round', fill: 'none', class: 'vp-o2-vent' }),
      s('circle', { cx: 10, cy: 2, r: 2, fill: '#3ddc97' }),
    );
  } else if (plan.air === 'normal') {
    // Single steady oxygen plume
    airGroup.append(
      s('path', { d: 'M10 6 Q 8 -2 10 -9', stroke: '#5cc8ff', 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none', class: 'vp-o2-vent' }),
      s('circle', { cx: 10, cy: 2, r: 1.5, fill: '#3ddc97' }),
    );
  } else {
    // Air off warning flasher
    airGroup.append(
      s('circle', { cx: 10, cy: 2, r: 2, fill: '#ff6464', class: 'vp-blink' }),
    );
  }
  airGroup.addEventListener('click', () => {
    sfx.vent();
    onToggle('air');
  });
  airGroup.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.vent(); onToggle('air'); }
  });
  habGroup.append(airGroup);
  svg.append(habGroup);

  // 5. Astronaut Sprite (Hotspot: Click to cycle Crew mode)
  const isEva = plan.crew === 'eva';
  const crewGroup = s('g', {
    class: `vp-hotspot vp-crew ${isEva ? 'is-eva' : ''}`,
    transform: isEva ? 'translate(200, 218)' : 'translate(310, 224)',
    tabindex: 0,
    role: 'button',
    'aria-label': `${t('viewport.crew')}: ${t(`crew.${plan.crew}`)}`,
  });

  if (isEva) {
    // Astronaut on EVA exploring red regolith outside
    crewGroup.append(
      // Shadow
      s('ellipse', { cx: 14, cy: 38, rx: 12, ry: 4, fill: 'rgba(20, 6, 4, 0.65)' }),
      // Boots
      s('rect', { x: 8, y: 31, width: 5, height: 7, rx: 1.5, fill: '#abb7c9' }),
      s('rect', { x: 15, y: 31, width: 5, height: 7, rx: 1.5, fill: '#abb7c9' }),
      // Legs
      s('line', { x1: 10, y1: 22, x2: 10, y2: 31, stroke: '#dce4ed', 'stroke-width': 4, 'stroke-linecap': 'round' }),
      s('line', { x1: 18, y1: 22, x2: 18, y2: 31, stroke: '#dce4ed', 'stroke-width': 4, 'stroke-linecap': 'round' }),
      // Torso & Life Support Backpack
      s('rect', { x: 5, y: 9, width: 5, height: 13, rx: 1.5, fill: '#4a5b78' }), // PLSS backpack
      s('rect', { x: 8, y: 9, width: 12, height: 14, rx: 3, fill: '#eaf0f7' }), // white EMU suit
      // Chest display
      s('rect', { x: 11, y: 12, width: 6, height: 4, rx: 1, fill: '#1b2536' }),
      s('line', { x1: 12, y1: 14, x2: 16, y2: 14, stroke: '#5cc8ff', 'stroke-width': 1 }),
      // Arms holding geological sampler
      s('line', { x1: 8, y1: 12, x2: 2, y2: 22, stroke: '#dce4ed', 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      s('line', { x1: 19, y1: 12, x2: 25, y2: 20, stroke: '#dce4ed', 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      // Geological Sample Sensor Tool
      s('line', { x1: 25, y1: 16, x2: 28, y2: 36, stroke: '#ffd285', 'stroke-width': 2 }),
      s('circle', { cx: 28, cy: 36, r: 2.5, fill: '#3ddc97' }), // laser sensor
      // Helmet Bubble & Visor
      s('circle', { cx: 14, cy: 6, r: 6.5, fill: '#dce4ed' }),
      s('path', { d: 'M11 4 Q 15 2 18 5 Q 18 9 14 9 Q 10 9 11 4 Z', fill: '#ffb347' }), // gold sun visor
      s('circle', { cx: 13, cy: 4.5, r: 1, fill: '#fff' }), // glint
      // Science Gain Floating Chip
      s('rect', { x: -8, y: -16, width: 44, height: 14, rx: 7, fill: 'rgba(10, 14, 23, 0.85)', stroke: '#3ddc97', 'stroke-width': 1 }),
      s('text', { x: 14, y: -6, fill: '#3ddc97', 'font-size': '8px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, `+${v('EVA_SCIENCE')} SCI`),
    );
  } else {
    // Small astronaut marker at hab entrance
    crewGroup.append(
      s('circle', { cx: 0, cy: 0, r: 6, fill: '#dce4ed', stroke: '#2e3d57', 'stroke-width': 1.5 }),
      s('path', { d: 'M-3 -2 Q 0 -4 3 -1 Q 3 3 0 3 Q -3 3 -3 -2 Z', fill: '#ffb347' }),
      s('rect', { x: -16, y: -18, width: 32, height: 13, rx: 6, fill: 'rgba(10, 14, 23, 0.85)', stroke: '#5cc8ff', 'stroke-width': 1 }),
      s('text', { x: 0, y: -9, fill: '#5cc8ff', 'font-size': '7.5px', 'font-family': 'monospace', 'text-anchor': 'middle', 'font-weight': 'bold' }, isLab ? 'LAB' : 'SHELTER'),
    );
  }
  crewGroup.addEventListener('click', () => {
    sfx.step();
    onToggle('crew');
  });
  crewGroup.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.step(); onToggle('crew'); }
  });
  svg.append(crewGroup);

  // ---------------- HUD OVERLAY ----------------
  const card = h('section', {
    class: 'card outpost-card',
    'aria-labelledby': 'vp-head',
  });

  const header = h('div', { class: 'outpost-hud-head' },
    h('div', { class: 'outpost-hud-title' },
      icon('home', 'sm'),
      h('h2', { id: 'vp-head', class: 'outpost-title-text' }, t('viewport.title')),
      h('span', { class: 'badge badge-live' }, `${t(`site.${siteName}`)}`),
      h('span', { class: 'badge badge-computed' }, `Sol ${sol + 1}/${totalSols}`),
      h('span', { class: 'badge badge-cache' }, `Ls ${fmt(env.ls, 0)}°`),
    ),
    h('div', { class: 'outpost-hud-telemetry' },
      h('span', { class: 'chip sm' }, icon('temp', 'sm'), `${fmt(env.outsideAvgC, 0)}°C`),
      h('span', { class: 'chip sm' }, icon('dust', 'sm'), t(isDusty ? 'dust.storm' : env.dustTau > 0.6 ? 'dust.hazy' : 'dust.clear')),
      isStorming ? h('span', { class: 'status-pill' }, '⚡ CME STORM') : null,
    ),
  );

  const controlsPill = h('div', { class: 'outpost-quick-bar' },
    h('p', { class: 'faint small' }, icon('info', 'sm'), ' ', t('viewport.interactive')),
    h('div', { class: 'outpost-pills' },
      h('button', {
        type: 'button',
        class: `outpost-btn ${plan.greenhouse ? 'on' : ''}`,
        onclick: () => { sfx.toggle(); onToggle('greenhouse'); },
      }, icon('food', 'sm'), t('viewport.gh'), plan.greenhouse ? ' ✓' : ' ✗'),
      h('button', {
        type: 'button',
        class: `outpost-btn ${plan.radio ? 'on' : ''}`,
        onclick: () => { sfx.relay(); onToggle('radio'); },
      }, icon('radio', 'sm'), t('viewport.radio'), plan.radio ? ' ✓' : ' ✗'),
      h('button', {
        type: 'button',
        class: `outpost-btn ${plan.air !== 'off' ? 'on' : ''}`,
        onclick: () => { sfx.vent(); onToggle('air'); },
      }, icon('air', 'sm'), `${t('viewport.air')}: ${t(`opt.${plan.air}`)}`),
      h('button', {
        type: 'button',
        class: 'outpost-btn on',
        onclick: () => { sfx.step(); onToggle('crew'); },
      }, icon('crew', 'sm'), `${t('viewport.crew')}: ${t(`crew.${plan.crew}`)}`),
    ),
  );

  card.append(header, svg, controlsPill);
  return card;
}
