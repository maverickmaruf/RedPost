// Hand-drawn 24x24 stroke icons, built as DOM nodes (no innerHTML). Decorative by default (aria-hidden).
const NS = 'http://www.w3.org/2000/svg';

type Shape = ['path', string] | ['circle', number, number, number] | ['rect', number, number, number, number, number];

function trefoil(): Shape[] {
  const blade = (a: number): Shape => {
    const p = (r: number, deg: number): string => `${(12 + r * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(12 + r * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
    return ['path', `M${p(3.2, a - 30)}L${p(9, a - 30)}A9 9 0 0 1 ${p(9, a + 30)}L${p(3.2, a + 30)}A3.2 3.2 0 0 0 ${p(3.2, a - 30)}Z`];
  };
  return [blade(-90), blade(30), blade(150), ['circle', 12, 12, 1.4]];
}

const ICONS: Record<string, Shape[]> = {
  power: [['path', 'M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z']],
  air: [['path', 'M3 8.5h10.5a3 3 0 1 0-3-3'], ['path', 'M3 12.5h15.5a3 3 0 1 1-3 3'], ['path', 'M3 16.5h6']],
  food: [['path', 'M12 21v-9'], ['path', 'M12 12c0-4.5 3-7.5 8-7.5 0 5-3 7.5-8 7.5Z'], ['path', 'M12 15c0-3.3-2.2-5.5-6.5-5.5 0 3.5 2.2 5.5 6.5 5.5Z']],
  radiation: trefoil(),
  radio: [['path', 'M12 11v10'], ['path', 'M8 21h8'], ['path', 'M8.6 7.6a4.8 4.8 0 0 1 6.8 0'], ['path', 'M5.8 4.8a8.8 8.8 0 0 1 12.4 0'], ['circle', 12, 11, 1.4]],
  heater: [['path', 'M12 22c3.9 0 6.5-2.8 6.5-6.4 0-3.8-2.8-6-3.8-9.1-1 2.6-2.6 3.6-2.6 3.6S11 7.4 9.2 6.3c0 3.1-3.7 5.2-3.7 9.3 0 3.6 2.6 6.4 6.5 6.4Z'], ['path', 'M12 19c1.4 0 2.4-1 2.4-2.4 0-1.6-1.4-2.4-2.4-3.8-1 1.4-2.4 2.2-2.4 3.8 0 1.4 1 2.4 2.4 2.4Z']],
  crew: [['circle', 12, 8, 4], ['path', 'M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7']],
  shelter: [['path', 'M12 3 4.5 6v5.8c0 4.6 3.2 8 7.5 9.2 4.3-1.2 7.5-4.6 7.5-9.2V6L12 3Z'], ['path', 'm9 12 2.2 2.2L15.5 10']],
  walk: [['circle', 13, 4.5, 2], ['path', 'm9 21 2-6.5 2.5 2V21'], ['path', 'm7 11.5 2.5-3.5h4l2 3.5 2.5 1'], ['path', 'M11 14.5 9.5 8']],
  lab: [['path', 'M9 3h6'], ['path', 'M10 3v6.2L4.7 18.6A1.6 1.6 0 0 0 6.1 21h11.8a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3'], ['path', 'M7.2 15h9.6']],
  sun: [['circle', 12, 12, 4], ['path', 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4']],
  temp: [['path', 'M14 14.6V5a2 2 0 1 0-4 0v9.6a4 4 0 1 0 4 0Z'], ['path', 'M12 9v8']],
  dust: [['path', 'M7 18h9.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18Z'], ['path', 'M4 21h3M10 21h7']],
  info: [['circle', 12, 12, 9], ['path', 'M12 11v5.5'], ['path', 'M12 7.6v.4']],
  globe: [['circle', 12, 12, 9], ['path', 'M3 12h18'], ['path', 'M12 3c2.6 2.6 3.6 5.6 3.6 9s-1 6.4-3.6 9c-2.6-2.6-3.6-5.6-3.6-9s1-6.4 3.6-9Z']],
  volume: [['path', 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z'], ['path', 'M15.5 9a4.2 4.2 0 0 1 0 6'], ['path', 'M18 6.5a8 8 0 0 1 0 11']],
  mute: [['path', 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z'], ['path', 'm16 9.5 5 5M21 9.5l-5 5']],
  star: [['path', 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z']],
  check: [['path', 'm5 12.5 4.5 4.5L19 7.5']],
  alert: [['path', 'M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z'], ['path', 'M12 9.5v4.5'], ['path', 'M12 17.2v.3']],
  play: [['path', 'M7 4.5v15l12.5-7.5Z']],
  refresh: [['path', 'M20 12a8 8 0 1 1-2.4-5.7'], ['path', 'M20 4v4.5h-4.5']],
  home: [['path', 'M3.5 11 12 4l8.5 7'], ['path', 'M6 9.5V20h12V9.5']],
  pin: [['path', 'M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11Z'], ['circle', 12, 10, 2.4]],
  calendar: [['rect', 3.5, 5, 17, 15.5, 2.5], ['path', 'M3.5 10h17M8 3v4M16 3v4']],
  hash: [['path', 'M5 9h14M5 15h14M10.5 4 8.5 20M15.5 4l-2 16']],
  science: [['circle', 12, 12, 1.6], ['path', 'M12 3.5c4.5 0 8.5 3.8 8.5 8.5S16.5 20.5 12 20.5 3.5 16.7 3.5 12'], ['path', 'M7 6.5c3.2-1.8 8 1.2 10.6 5.6S19 19.6 17 20.6']],
  send: [['path', 'M21 3 10.5 13.5'], ['path', 'M21 3 14.5 21l-4-7.5L3 9.5 21 3Z']],
  chevron: [['path', 'm9 6 6 6-6 6']],
  back: [['path', 'm15 6-6 6 6 6']],
  rank: [['path', 'M12 3 4 7v6c0 4 3.4 7 8 8 4.6-1 8-4 8-8V7l-8-4Z'], ['path', 'm12 8 1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4Z']],
};

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = '', label?: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `ico ${cls}`.trim());
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.setAttribute('focusable', 'false');
  for (const s of ICONS[name] ?? []) {
    let el: SVGElement;
    if (s[0] === 'path') {
      el = document.createElementNS(NS, 'path');
      el.setAttribute('d', s[1]);
    } else if (s[0] === 'circle') {
      el = document.createElementNS(NS, 'circle');
      el.setAttribute('cx', String(s[1])); el.setAttribute('cy', String(s[2])); el.setAttribute('r', String(s[3]));
    } else {
      el = document.createElementNS(NS, 'rect');
      el.setAttribute('x', String(s[1])); el.setAttribute('y', String(s[2])); el.setAttribute('width', String(s[3])); el.setAttribute('height', String(s[4])); el.setAttribute('rx', String(s[5]));
    }
    svg.append(el);
  }
  if (name === 'radiation' || name === 'play' || name === 'star') svg.classList.add('ico-fill');
  return svg;
}

/** The title-screen illustration: Mars horizon, habitat dome, stars. Pure SVG, scales to any width. */
export function heroArt(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 220');
  svg.setAttribute('class', 'hero-art');
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag: string, attrs: Record<string, string | number>): SVGElement => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
    return el;
  };
  const defs = document.createElementNS(NS, 'defs');
  svg.append(defs);
  const grad = (id: string, stops: [number, string, number?][], x2 = 0, y2 = 1): void => {
    const g = document.createElementNS(NS, 'linearGradient');
    g.setAttribute('id', id); g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', String(x2)); g.setAttribute('y2', String(y2));
    for (const [o, c, op] of stops) {
      const s = document.createElementNS(NS, 'stop');
      s.setAttribute('offset', String(o)); s.setAttribute('stop-color', c);
      if (op !== undefined) s.setAttribute('stop-opacity', String(op));
      g.append(s);
    }
    defs.append(g);
  };
  grad('sky', [[0, '#0b1020'], [0.7, '#1a1430'], [1, '#3a1d22']]);
  grad('ground', [[0, '#c4532d'], [1, '#5a1f12']]);
  grad('ridge', [[0, '#8e3a22'], [1, '#4a190f']]);
  grad('glow', [[0, '#ffb27a', 0.55], [1, '#ffb27a', 0]]);
  add('rect', { x: 0, y: 0, width: 360, height: 220, fill: 'url(#sky)' });
  // Stars: fixed positions (deterministic, no randomness)
  const stars = [[24, 22, 1.2], [70, 48, 0.8], [112, 18, 1], [158, 40, 0.7], [205, 14, 1.3], [248, 52, 0.8], [296, 24, 1.1], [334, 46, 0.7], [44, 82, 0.6], [318, 88, 0.9], [184, 70, 0.6], [134, 92, 0.5]];
  for (const [x, y, r] of stars) add('circle', { cx: x!, cy: y!, r: r!, fill: '#e8eefc', opacity: 0.85 });
  // Small, distant Sun (Mars gets less than half of Earth's sunlight)
  add('circle', { cx: 286, cy: 92, r: 16, fill: 'url(#glow)' });
  add('circle', { cx: 286, cy: 92, r: 5, fill: '#fff1d6' });
  // Earth: a tiny blue dot
  add('circle', { cx: 92, cy: 64, r: 2.2, fill: '#7cc4ff' });
  add('path', { d: 'M0 150 C60 128 110 140 160 132 S260 118 360 138 V220 H0Z', fill: 'url(#ridge)' });
  add('path', { d: 'M0 172 C70 160 140 170 210 164 S300 158 360 166 V220 H0Z', fill: 'url(#ground)' });
  // Habitat: dome, module, solar panels, antenna
  add('ellipse', { cx: 150, cy: 168, rx: 44, ry: 5, fill: '#2a0f08', opacity: 0.5 });
  add('path', { d: 'M118 166a32 30 0 0 1 64 0Z', fill: '#e9eef7' });
  add('path', { d: 'M126 166a24 22 0 0 1 48 0', fill: 'none', stroke: '#9fb0c8', 'stroke-width': 1.2 });
  add('rect', { x: 178, y: 150, width: 34, height: 16, rx: 4, fill: '#d6dde9' });
  add('rect', { x: 186, y: 154, width: 8, height: 6, rx: 1.5, fill: '#ffcf8a' });
  add('rect', { x: 140, y: 150, width: 10, height: 8, rx: 2, fill: '#ffcf8a' });
  for (const x of [226, 252]) {
    add('path', { d: `M${x + 10} 166v-10`, stroke: '#9fb0c8', 'stroke-width': 1.5 });
    add('path', { d: `M${x} 156l20-4v8l-20 4Z`, fill: '#2b4f8f', stroke: '#7ea2e0', 'stroke-width': 0.8 });
  }
  add('path', { d: 'M108 166v-28', stroke: '#c8d2e2', 'stroke-width': 1.5 });
  add('path', { d: 'M101 140a9 9 0 0 1 14 0', fill: 'none', stroke: '#c8d2e2', 'stroke-width': 1.5 });
  add('circle', { cx: 108, cy: 136, r: 1.8, fill: '#ff6b35' });
  return svg;
}
