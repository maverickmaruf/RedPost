import { MISSION_DOSE_BUDGET_MSV, v } from '../../compute/constants';
import { stormLevel, type MarsForecast, type SolEnv } from '../../compute/mission';
import { crewFood, crewO2, demandFor, PRIORITY, type AirMode, type CrewMode, type Plan, type System } from '../../compute/outpost';
import { shippedBadge } from '../../data/load';
import { sfx } from '../../game/audio';
import type { PlayedSol, Session } from '../../game/session';
import { store } from '../../game/storage';
import { registerScreen, type App } from '../app';
import { h, prefersReducedMotion } from '../dom';
import { fmt, fmtNum, getLang, t } from '../i18n';
import { badge } from '../provenance';

const SYS_NAME: Record<System, string> = { heaters: 'sys.heaters', air: 'sys.air', crew: 'sys.crew', radio: 'sys.radio', greenhouse: 'sys.greenhouse' };

function meter(name: string, value: string, sub: string, frac: number, danger: boolean, icon: string): HTMLElement {
  const pct = Math.max(0, Math.min(1, frac));
  return h('div', { class: 'meter' + (danger ? ' danger' : ''), role: 'group', 'aria-label': t('a11y.meter', { name, value: value + ', ' + sub }) },
    h('div', { class: 'meter-top' }, h('span', { class: 'meter-icon', 'aria-hidden': 'true' }, icon), h('span', { class: 'meter-name' }, name), danger ? h('span', { class: 'meter-warn' }, '!') : null),
    h('div', { class: 'meter-value' }, value),
    h('div', { class: 'bar', 'aria-hidden': 'true' }, h('div', { class: 'bar-fill', style: `width:${(pct * 100).toFixed(1)}%` })),
    h('div', { class: 'meter-sub' }, sub),
  );
}

function seg<T extends string>(label: string, options: { value: T; text: string; sub?: string }[], current: T, onPick: (v: T) => void): HTMLElement {
  const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  for (const o of options) {
    group.append(h('button', {
      type: 'button', role: 'radio', class: 'seg-btn' + (o.sub ? ' tall' : ''), 'aria-checked': String(o.value === current),
      onclick: () => { sfx.click(); onPick(o.value); },
    }, h('strong', {}, o.text), o.sub ? h('span', { class: 'small' }, o.sub) : null));
  }
  return group;
}

const dateFmt = (iso: string): string =>
  new Intl.DateTimeFormat(getLang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(iso));

/** Storms the crew has heard about, with the sol they land on (0-based). */
function knownAhead(s: Session): { sol: number; f: MarsForecast }[] {
  const ids = new Set(s.state.known.map((f) => f.simulationID));
  const out: { sol: number; f: MarsForecast }[] = [];
  s.env.forEach((e, k) => {
    if (k < s.state.sol) return;
    for (const f of e.arrivals) if (ids.has(f.simulationID)) out.push({ sol: k, f });
  });
  return out;
}

function hint(key: string): HTMLElement | null {
  const seen = store.get<string[]>('hints', []);
  if (seen.includes(key)) return null;
  const el = h('div', { class: 'hint', role: 'note' }, h('span', {}, t(key)),
    h('button', { class: 'chip', type: 'button', onclick: () => { store.set('hints', [...store.get<string[]>('hints', []), key]); el.remove(); } }, t('hint.ok')));
  return el;
}

function forecastPanel(s: Session): HTMLElement {
  const ahead = knownAhead(s);
  const lastHeard = [...s.reports].reverse().find((r) => r.heard.length > 0);
  const items = ahead.length
    ? h('ul', { class: 'fc-list' }, ...ahead.slice(0, 4).map(({ sol, f }) => {
        const lvl = stormLevel(f);
        return h('li', { class: `fc fc-${lvl}` },
          h('span', { class: 'fc-icon', 'aria-hidden': 'true' }, lvl === 'strong' ? '☢☢☢' : lvl === 'moderate' ? '☢☢' : '☢'),
          h('span', {}, t('fc.item', { level: t(`storm.${lvl}`), sol: sol === s.state.sol ? t('fc.today') : fmtNum(sol + 1) })));
      }))
    : h('p', { class: 'muted' }, t('fc.none'));
  const delay = lastHeard ? s.env[lastHeard.sol]!.lightTimeS : s.today.lightTimeS;
  return h('section', { class: 'card forecast', 'aria-labelledby': 'fc-h' },
    h('h2', { id: 'fc-h' }, '📡 ', t('fc.title')),
    items,
    s.draft.radio ? null : h('p', { class: 'warn' }, t('fc.radiooff')),
    h('p', { class: 'small muted' }, t('fc.delay', { min: Math.floor(delay / 60), sec: Math.round(delay % 60) })),
    h('p', { class: 'small muted' }, badge(shippedBadge(s.window.mode)), ' ', t('fc.source')),
  );
}

function powerPreview(s: Session, plan: Plan): HTMLElement {
  const d = demandFor(plan, s.today);
  const have = s.state.batteryKWh + s.today.generationKWh;
  let left = have;
  const cut: System[] = [];
  let use = 0;
  for (const sys of PRIORITY) {
    if (d[sys] === 0) continue;
    if (d[sys] <= left + 1e-9) { left -= d[sys]; use += d[sys]; } else cut.push(sys);
  }
  const over = cut.length > 0;
  return h('div', { class: 'power-preview' + (over ? ' danger' : ''), role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'bar big', 'aria-hidden': 'true' }, h('div', { class: 'bar-fill', style: `width:${Math.min(100, ((use + cut.reduce((a, c) => a + d[c], 0)) / have) * 100).toFixed(1)}%` })),
    h('div', {}, t('power.use', { use: fmt(use + cut.reduce((a, c) => a + d[c], 0), 0), have: fmt(have, 0) })),
    over ? h('div', { class: 'warn' }, '⚠ ', t('power.over', { list: cut.map((c) => t(SYS_NAME[c])).join(', ') })) : null,
  );
}

function reportDialog(app: App, r: PlayedSol, onClose: () => void): void {
  const s = app.session!;
  const env: SolEnv = s.env[r.sol]!;
  const lines: (HTMLElement | null)[] = [
    env.storm !== 'none' ? h('p', { class: 'storm-hit' }, '☢ ', t('storm.hit'), ' (', t(`storm.${env.storm}`), ')') : null,
    r.heard.length ? h('p', { class: 'heard' }, '📡 ', t('report.heard')) : null,
    r.scienceGained ? h('p', {}, '🔬 ', t('report.science', { n: r.scienceGained })) : null,
    r.scienceSentNow ? h('p', {}, '📨 ', t('report.sent', { n: r.scienceSentNow })) : null,
    h('p', {}, '☢ ', t('report.dose', { n: fmt(r.doseBaseMSv + r.doseStormMSv, 2) })),
    r.doseStormMSv ? h('p', { class: 'warn' }, t('report.storm', { n: fmt(r.doseStormMSv, 2) })) : null,
    r.cut.length ? h('p', { class: 'warn' }, '⚡ ', t('report.cut', { list: r.cut.map((c) => t(SYS_NAME[c])).join(', ') })) : null,
  ];
  // Close is handled directly (not only via the 'close' event, which some embedded browsers delay or drop).
  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (dlg.open) dlg.close();
    dlg.remove();
    onClose();
  };
  const dlg = h('dialog', { class: 'report', 'aria-labelledby': 'rep-h' },
    h('h2', { id: 'rep-h' }, t('report.title', { sol: fmtNum(r.sol + 1) })),
    ...lines.filter(Boolean) as HTMLElement[],
    h('button', { class: 'btn primary big', type: 'button', onclick: finish }, s.state.status === 'running' ? t('report.next') + ' ▶' : '▶'),
  );
  dlg.addEventListener('close', finish);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(); });
  document.body.append(dlg);
  dlg.showModal();
  if (env.storm !== 'none') sfx.alarm();
  else if (r.heard.length) sfx.radio();
}

registerScreen('sol', (app) => {
  const s = app.session;
  if (!s) { queueMicrotask(() => app.go('title')); return h('main', {}); }
  if (s.state.status !== 'running') { queueMicrotask(() => app.go('review')); return h('main', {}); }

  const root = h('main', { class: 'screen sol' });
  const env = s.today;
  const budget = MISSION_DOSE_BUDGET_MSV();

  app.provenance = () => [
    { source_id: 'donki-enlil', badge: shippedBadge(s.window.mode), detail: s.state.known.map((f) => f.simulationID).slice(-4).join(', ') || `${s.window.start} → ${s.window.end}`, retrieved: s.window.retrieved, url: s.window.url_enlil },
    { source_id: 'insight-weather', badge: 'archived', detail: `InSight sol ${env.insightSol}: ${fmt(env.outsideAvgC)} °C`, retrieved: s.data.weather.retrieved },
    { source_id: 'jpl-approx-pos', badge: 'computed', detail: `${fmt(env.lightTimeS / 60, 1)} min light-time` },
    { source_id: 'giss-mars24', badge: 'computed', detail: `Ls ${fmt(env.ls, 0)}°, Sun ${fmt(env.rAU, 3)} au` },
    { source_id: 'mola-megdr', badge: shippedBadge(s.site.mode), detail: `${s.site.tile} · landing px ${s.setup.landing.r},${s.setup.landing.c}`, retrieved: s.site.retrieved },
    { source_id: 'bvad-2022', badge: 'cache' },
    { source_id: 'nasa-rad-2013', badge: 'cache' },
    { source_id: 'model-card', badge: 'simulated', detail: `dust tau ${fmt(env.dustTau, 2)}` },
  ];

  function render(): void {
    const st = s!.state;
    const plan = s!.draft;
    const o2Days = st.o2Kg / crewO2();
    const foodDays = st.foodKg / crewFood();
    const dust = env.dustTau > 1.4 ? 'dust.storm' : env.dustTau > 0.6 ? 'dust.hazy' : 'dust.clear';
    const stormKnownToday = knownAhead(s!).some((x) => x.sol === st.sol);
    const setPlan = (p: Partial<Plan>): void => { s!.draft = { ...s!.draft, ...p }; render(); };

    const parts: (Node | null)[] = [
      h('h1', { class: 'sol-title' }, t('hud.sol', { sol: fmtNum(st.sol + 1), total: fmtNum(v('MISSION_SOLS')) }),
        h('span', { class: 'sol-sub' }, ' · ', t(`site.${s!.site.id}`), ' · ', dateFmt(env.dateISO))),
      h('div', { class: 'meters' },
        meter(t('hud.power'), `${fmt(st.batteryKWh, 0)} kWh`, t('hud.of', { max: fmtNum(v('BATTERY_KWH_MAX')) }), st.batteryKWh / v('BATTERY_KWH_MAX'), st.batteryKWh < 15, '⚡'),
        meter(t('hud.air'), `${fmt(st.o2Kg)} kg`, t('hud.days', { n: fmt(o2Days) }), st.o2Kg / v('O2_TANK_MAX_KG'), o2Days < 2, '🫁'),
        meter(t('hud.food'), `${fmt(st.foodKg)} kg`, t('hud.days', { n: fmt(foodDays) }), st.foodKg / v('FOOD_START_KG'), foodDays < 3, '🥔'),
        meter(t('hud.dose'), `${fmt(st.doseMSv)} mSv`, t('hud.of', { max: fmtNum(budget) }), st.doseMSv / budget, st.doseMSv > 0.8 * budget, '☢'),
      ),
      h('p', { class: 'sky' },
        '☀ ', t('hud.sun', { kwh: fmt(env.generationKWh, 0) }), ' · ', t(dust), ' ', h('span', { class: 'muted small' }, t('dust.note')),
        ' · 🌡 ', t('hud.temp', { c: fmt(env.outsideAvgC, 0) }), ' ', badge('archived')),
      stormKnownToday ? h('p', { class: 'alert', role: 'alert' }, '☢ ', t('storm.hit')) : null,
      st.sol === 0 ? hint('hint.power') : null,
      forecastPanel(s!),
      st.sol >= 1 ? hint('hint.radio') : null,
      h('section', { class: 'card systems', 'aria-label': t('sys.crew') },
        h('div', { class: 'sys fixed' }, h('h3', {}, '🔥 ', t('sys.heaters')), h('p', { class: 'small muted' }, t('sys.heaters.desc'), ' ', fmt(env.heaterKWh, 0), ' kWh')),
        h('div', { class: 'sys' }, h('h3', {}, '🫁 ', t('sys.air')), h('p', { class: 'small muted' }, t('sys.air.desc', { kg: fmt(crewO2()) })),
          seg<AirMode>(t('sys.air'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'normal', text: t('opt.normal'), sub: `${fmt(crewO2() * v('O2_KWH_PER_KG'), 0)} kWh` },
            { value: 'boost', text: t('opt.boost'), sub: `${fmt(1.5 * crewO2() * v('O2_KWH_PER_KG'), 0)} kWh` },
          ], plan.air, (a) => setPlan({ air: a }))),
        h('div', { class: 'sys' }, h('h3', {}, '🌱 ', t('sys.greenhouse')), h('p', { class: 'small muted' }, t('sys.greenhouse.desc', { kg: fmt(v('GREENHOUSE_KG_PER_SOL')) })),
          seg(t('sys.greenhouse'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'on', text: t('opt.on'), sub: `${fmtNum(v('GREENHOUSE_KWH'))} kWh` },
          ], plan.greenhouse ? 'on' : 'off', (x) => setPlan({ greenhouse: x === 'on' }))),
        h('div', { class: 'sys' }, h('h3', {}, '📡 ', t('sys.radio')), h('p', { class: 'small muted' }, t('sys.radio.desc')),
          seg(t('sys.radio'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'on', text: t('opt.on'), sub: `${fmtNum(v('RADIO_KWH'))} kWh` },
          ], plan.radio ? 'on' : 'off', (x) => setPlan({ radio: x === 'on' }))),
        h('div', { class: 'sys' }, h('h3', {}, '👩‍🚀 ', t('sys.crew')),
          seg<CrewMode>(t('sys.crew'), [
            { value: 'eva', text: t('crew.eva'), sub: t('crew.eva.desc', { n: v('EVA_SCIENCE') }) + ` · ${fmtNum(v('EVA_KWH'))} kWh` },
            { value: 'lab', text: t('crew.lab'), sub: t('crew.lab.desc', { n: v('LAB_SCIENCE') }) + ` · ${fmtNum(v('LAB_KWH'))} kWh` },
            { value: 'shelter', text: t('crew.shelter'), sub: t('crew.shelter.desc') + ` · ${fmtNum(v('SHELTER_KWH'))} kWh` },
          ], plan.crew, (c) => setPlan({ crew: c }))),
      ),
      powerPreview(s!, plan),
      st.sol === 0 ? hint('hint.end') : null,
      h('button', { class: 'btn primary big endsol', type: 'button', onclick: endSol }, t('endsol'), ' ▶'),
      h('p', { class: 'small muted center' }, '🔬 ', t('review.science', { n: fmtNum(st.scienceSent), goal: fmtNum(v('SCIENCE_GOAL')) }), st.scienceBuffered ? ` (+${fmtNum(st.scienceBuffered)})` : ''),
    ];
    root.replaceChildren(...parts.filter((n): n is Node => n !== null));
  }

  let busy = false;
  function endSol(): void {
    if (busy) return; // ignore double taps
    busy = true;
    sfx.endSol();
    const r = s!.step(s!.draft);
    const done = (): void => {
      busy = false;
      if (s!.state.status !== 'running') app.go('review');
      else app.go('sol');
    };
    if (prefersReducedMotion()) reportDialog(app, r, done);
    else { root.classList.add('ending'); window.setTimeout(() => reportDialog(app, r, done), 180); }
  }

  render();
  return root;
});
