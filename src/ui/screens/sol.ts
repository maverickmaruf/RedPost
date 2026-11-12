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
import { icon, type IconName } from '../icons';
import { badge } from '../provenance';
import { renderRelayDiagram } from '../relay';
import { renderOutpostViewport } from '../viewport';

const SYS_NAME: Record<System, string> = { heaters: 'sys.heaters', air: 'sys.air', crew: 'sys.crew', radio: 'sys.radio', greenhouse: 'sys.greenhouse' };

const pct = (x: number): string => `${(Math.max(0, Math.min(1, x)) * 100).toFixed(1)}%`;

function gauge(kind: 'power' | 'air' | 'food' | 'dose', ico: IconName, name: string, value: string, unit: string, sub: string, frac: number, low: boolean): HTMLElement {
  return h('div', { class: `gauge ${kind}${low ? ' low' : ''}`, role: 'group', 'aria-label': t('a11y.meter', { name, value: `${value} ${unit}, ${sub}${low ? ', ' + t('low') : ''}` }) },
    h('div', { class: 'gauge-top' }, icon(ico), h('span', {}, name), low ? h('span', { class: 'status-pill' }, t('low')) : null),
    h('div', { class: 'gauge-value' }, value, h('span', { class: 'unit' }, unit)),
    h('div', { class: 'gauge-bar', 'aria-hidden': 'true' }, h('span', { style: `width:${pct(frac)}` })),
    h('div', { class: 'gauge-sub' }, sub),
  );
}

interface SegOption<T extends string> { value: T; text: string; sub?: string; ico?: IconName }
function seg<T extends string>(label: string, options: SegOption<T>[], current: T, onPick: (v: T) => void): HTMLElement {
  const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  for (const o of options) {
    group.append(h('button', {
      type: 'button', role: 'radio', class: 'seg-btn', 'aria-checked': String(o.value === current),
      onclick: () => { sfx.click(); onPick(o.value); },
    }, h('strong', {}, o.ico ? icon(o.ico) : null, o.text), o.sub ? h('span', { class: 'sub' }, o.sub) : null));
  }
  return group;
}

function cond(ico: IconName, value: string, label: string, b: HTMLElement): HTMLElement {
  return h('div', { class: `cond ${ico}` }, icon(ico), h('div', { class: 'cond-v' }, value), h('div', { class: 'cond-k' }, label), b);
}

function sysRow(kind: string, ico: IconName, name: string, desc: string, cost: string | null, control: HTMLElement | null, effect?: string): HTMLElement {
  return h('div', { class: 'sys' },
    h('div', { class: 'sys-head' },
      h('span', { class: `sys-icon ${kind}` }, icon(ico)),
      h('div', { class: 'sys-text' }, h('h3', {}, name), desc ? h('p', {}, desc) : null),
      cost ? h('span', { class: 'sys-cost' }, cost) : null),
    control,
    effect ? h('p', { class: 'sys-effect' }, effect) : null,
  );
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
  const el = h('div', { class: 'hint', role: 'note' }, icon('info'), h('p', {}, t(key)),
    h('button', { class: 'icon-btn', type: 'button', onclick: () => { store.set('hints', [...store.get<string[]>('hints', []), key]); el.remove(); } }, t('hint.ok')));
  return el;
}

function stormLevelIcons(level: 'minor' | 'moderate' | 'strong'): HTMLElement {
  const n = level === 'strong' ? 3 : level === 'moderate' ? 2 : 1;
  return h('span', { class: 'fc-level', 'aria-hidden': 'true' }, ...[0, 1, 2].map((i) => icon('radiation', i < n ? '' : 'dim')));
}

function forecastCard(s: Session): HTMLElement {
  const ahead = knownAhead(s);
  const lastHeard = [...s.reports].reverse().find((r) => r.heard.length > 0);
  const delay = lastHeard ? s.env[lastHeard.sol]!.lightTimeS : s.today.lightTimeS;
  return h('section', { class: 'card forecast', 'aria-labelledby': 'fc-h' },
    h('div', { class: 'card-head' }, icon('radio', 'radio'), h('h2', { id: 'fc-h' }, t('fc.title'))),
    s.draft.radio ? null : h('p', { class: 'radio-off' }, icon('alert', 'sm'), t('fc.radiooff')),
    ahead.length
      ? h('ul', { class: 'fc-list' }, ...ahead.slice(0, 4).map(({ sol, f }) => {
          const lvl = stormLevel(f);
          return h('li', { class: `fc fc-${lvl}` }, stormLevelIcons(lvl),
            h('span', { class: 'fc-text' }, t('fc.item', { level: t(`storm.${lvl}`), sol: sol === s.state.sol ? t('fc.today') : fmtNum(sol + 1) })));
        }))
      : h('p', { class: 'fc-empty' }, t('fc.none')),
    renderRelayDiagram(s.today, ahead.length > 0),
    h('div', { class: 'fc-meta' },
      h('div', { class: 'row' }, icon('send', 'sm'), t('fc.delay', { min: Math.floor(delay / 60), sec: Math.round(delay % 60) })),
      h('div', { class: 'row' }, badge(shippedBadge(s.window.mode)), t('fc.source')),
    ),
  );
}

function budgetCard(s: Session, plan: Plan): { card: HTMLElement; use: number; have: number } {
  const d = demandFor(plan, s.today);
  const have = s.state.batteryKWh + s.today.generationKWh;
  let left = have;
  const cut: System[] = [];
  const served: System[] = [];
  for (const sys of PRIORITY) {
    if (d[sys] === 0) continue;
    if (d[sys] <= left + 1e-9) { left -= d[sys]; served.push(sys); } else cut.push(sys);
  }
  const want = PRIORITY.reduce((a, k) => a + d[k], 0);
  const scale = Math.max(have, want);
  const bar = h('div', { class: 'stack-bar', 'aria-hidden': 'true' },
    ...served.map((k) => h('span', { class: k, style: `width:${pct(d[k] / scale)}` })),
    ...cut.map((k) => h('span', { class: 'cut', style: `width:${pct(d[k] / scale)}` })),
  );
  const over = cut.length > 0;
  const card = h('section', { class: 'card budget' + (over ? ' over' : ''), 'aria-labelledby': 'bud-h', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'card-head' }, icon('power'), h('h2', { id: 'bud-h' }, t('budget.title')),
      h('span', { class: 'budget-total' }, fmt(want, 0), h('span', { class: 'faint' }, ` / ${fmt(have, 0)} kWh`))),
    bar,
    h('div', { class: 'legend' }, ...PRIORITY.filter((k) => d[k] > 0).map((k) =>
      h('span', {}, h('i', { style: `background:var(--c-${k === 'heaters' ? 'heat' : k === 'greenhouse' ? 'food' : k})` }), t(SYS_NAME[k]), ' ', h('span', { class: 'faint num' }, fmt(d[k], 0))))),
    over ? h('p', { class: 'budget-warn' }, icon('alert', 'sm'), t('power.over', { list: cut.map((c) => t(SYS_NAME[c])).join(', ') })) : null,
    h('p', { class: 'visually-hidden' }, t('power.use', { use: fmt(want, 0), have: fmt(have, 0) })),
  );
  return { card, use: want, have };
}

function outcome(kind: string, ico: IconName, label: string, val: string): HTMLElement {
  return h('li', { class: `outcome ${kind}` }, icon(ico), h('span', { class: 'label' }, label), h('span', { class: 'val' }, val));
}

function reportSheet(app: App, r: PlayedSol, onClose: () => void): void {
  const s = app.session!;
  const env: SolEnv = s.env[r.sol]!;
  const rows: (HTMLElement | null)[] = [
    env.storm !== 'none' ? outcome('bad', 'radiation', t('storm.hit'), t(`storm.${env.storm}`)) : null,
    r.heard.length ? outcome('info', 'radio', t('report.heard'), fmtNum(r.heard.length)) : null,
    r.scienceGained ? outcome('good', 'science', t('out.science'), '+' + fmtNum(r.scienceGained)) : null,
    r.scienceSentNow ? outcome('info', 'send', t('out.sent'), fmtNum(r.scienceSentNow)) : null,
    outcome('dose', 'radiation', t('hud.dose'), `+${fmt(r.doseBaseMSv + r.doseStormMSv, 2)} mSv`),
    r.cut.length ? outcome('bad', 'power', t('report.cut', { list: r.cut.map((c) => t(SYS_NAME[c])).join(', ') }), '') : null,
  ];
  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (dlg.open) dlg.close();
    dlg.remove();
    onClose();
  };
  const dlg = h('dialog', { class: 'sheet report', 'aria-labelledby': 'rep-h' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'dialog-head' },
      h('p', { class: 'eyebrow' }, dateFmt(env.dateISO)),
      h('h2', { id: 'rep-h' }, t('report.title', { sol: fmtNum(r.sol + 1) }))),
    h('ul', { class: 'outcome-list' }, ...rows.filter((x): x is HTMLElement => x !== null)),
    h('button', { class: 'btn primary lg block', type: 'button', onclick: finish },
      s.state.status === 'running' ? t('report.next') : t('review.why'), icon('chevron', 'sm')),
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

  let busy = false;
  function endSol(): void {
    if (busy) return; // ignore double taps
    busy = true;
    sfx.endSol();
    const r = s!.step(s!.draft);
    const done = (): void => {
      busy = false;
      app.go(s!.state.status !== 'running' ? 'review' : 'sol');
    };
    if (prefersReducedMotion()) reportSheet(app, r, done);
    else { root.classList.add('ending'); window.setTimeout(() => reportSheet(app, r, done), 160); }
  }

  function render(): void {
    const st = s!.state;
    const plan = s!.draft;
    const total = v('MISSION_SOLS');
    const o2Days = st.o2Kg / crewO2();
    const foodDays = st.foodKg / crewFood();
    const dust = env.dustTau > 1.4 ? 'dust.storm' : env.dustTau > 0.6 ? 'dust.hazy' : 'dust.clear';
    const stormKnownToday = knownAhead(s!).some((x) => x.sol === st.sol);
    const setPlan = (p: Partial<Plan>): void => { s!.draft = { ...s!.draft, ...p }; render(); };
    const airKWh = (k: number): string => `${fmt(k * crewO2() * v('O2_KWH_PER_KG'), 0)} kWh`;
    const crewEffect = plan.crew === 'eva' ? t('crew.eva.desc', { n: v('EVA_SCIENCE') }) : plan.crew === 'lab' ? t('crew.lab.desc', { n: v('LAB_SCIENCE') }) : t('crew.shelter.desc');
    const b = budgetCard(s!, plan);

    function openShortcuts(): void {
      sfx.click();
      const dlg = h('dialog', { class: 'sheet feature-modal shortcuts-modal', 'aria-labelledby': 'sc-title' },
        h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
        h('div', { class: 'dialog-head' },
          h('div', { class: 'card-head' }, icon('radio', 'lg'), h('h2', { id: 'sc-title' }, t('shortcuts.title'))),
        ),
        h('p', { class: 'prose', style: 'margin: 6px 0 16px; color: var(--text-2);' }, t('shortcuts.desc')),
        h('ul', { class: 'shortcuts-list' },
          h('li', {}, h('kbd', {}, 'Space'), h('span', {}, t('shortcuts.space'))),
          h('li', {}, h('kbd', {}, '1'), h('span', {}, t('shortcuts.sys1'))),
          h('li', {}, h('kbd', {}, '2'), h('span', {}, t('shortcuts.sys2'))),
          h('li', {}, h('kbd', {}, '3'), h('span', {}, t('shortcuts.sys3'))),
          h('li', {}, h('kbd', {}, '4'), h('span', {}, t('shortcuts.sys4'))),
          h('li', {}, h('kbd', {}, '?'), h('span', {}, t('shortcuts.help'))),
        ),
        h('button', { class: 'btn primary block', style: 'margin-top: 20px;', type: 'button', onclick: () => { sfx.click(); dlg.close(); dlg.remove(); } }, t('close')),
      );
      dlg.addEventListener('click', (e) => { if (e.target === dlg) { dlg.close(); dlg.remove(); } });
      dlg.addEventListener('cancel', () => dlg.remove());
      document.body.append(dlg);
      dlg.showModal();
    }

    const missionHead = h('header', { class: 'mission-head' },
      h('h1', { class: 'mission-title' },
        h('span', { class: 'sol-num' }, t('hud.sol', { sol: fmtNum(st.sol + 1), total: fmtNum(total) })),
        h('span', { class: 'sol-sub' }, h('span', { class: 'visually-hidden' }, ' · '), t(`site.${s!.site.id}`), ' · ', dateFmt(env.dateISO))),
      h('div', { class: 'progress', 'aria-hidden': 'true' }, h('span', { style: `width:${pct(st.sol / total)}` })),
    );

    const viewport = renderOutpostViewport({
      sol: st.sol,
      totalSols: total,
      env,
      plan,
      siteName: s!.site.id,
      stormKnownToday,
      onToggle: (sys) => {
        if (sys === 'greenhouse') setPlan({ greenhouse: !plan.greenhouse });
        else if (sys === 'radio') setPlan({ radio: !plan.radio });
        else if (sys === 'air') {
          const nextAir: Record<AirMode, AirMode> = { off: 'normal', normal: 'boost', boost: 'off' };
          setPlan({ air: nextAir[plan.air] });
        } else if (sys === 'crew') {
          const nextCrew: Record<CrewMode, CrewMode> = { eva: 'lab', lab: 'shelter', shelter: 'eva' };
          setPlan({ crew: nextCrew[plan.crew] });
        }
      },
    });

    const leftCol = h('div', { class: 'sol-col-left' },
      viewport,
      h('section', { class: 'conds', 'aria-label': t('cond.sun') },
        cond('sun', '+' + fmt(env.generationKWh, 0) + ' kWh', t('cond.sun'), badge('computed')),
        cond('dust', t(dust), t('cond.sky'), badge('simulated')),
        cond('temp', fmt(env.outsideAvgC, 0) + ' °C', t('cond.temp'), badge('archived')),
      ),
      forecastCard(s!),
    );

    const rightCol = h('div', { class: 'sol-col-right' },
      s!.setup.help && st.sol === 0 ? h('div', { class: 'hint help', role: 'status' }, icon('check'), h('p', {}, t('help.banner', { kwh: fmtNum(v('HELP_BATTERY_KWH')), o2: fmtNum(v('HELP_O2_KG')), food: fmtNum(v('HELP_FOOD_KG')) }))) : null,
      stormKnownToday ? h('div', { class: 'alert', role: 'alert' }, icon('radiation'), h('span', {}, t('storm.hit'))) : null,
      h('section', { class: 'gauges', 'aria-label': t('hud.sol', { sol: fmtNum(st.sol + 1), total: fmtNum(total) }) },
        gauge('power', 'power', t('hud.power'), fmt(st.batteryKWh, 0), 'kWh', t('hud.of', { max: fmtNum(v('BATTERY_KWH_MAX')) }), st.batteryKWh / v('BATTERY_KWH_MAX'), st.batteryKWh < 15),
        gauge('air', 'air', t('hud.air'), fmt(st.o2Kg), 'kg', t('hud.days', { n: fmt(o2Days) }), st.o2Kg / v('O2_TANK_MAX_KG'), o2Days < 2),
        gauge('food', 'food', t('hud.food'), fmt(st.foodKg), 'kg', t('hud.days', { n: fmt(foodDays) }), st.foodKg / v('FOOD_START_KG'), foodDays < 3),
        gauge('dose', 'radiation', t('hud.dose'), fmt(st.doseMSv), 'mSv', t('hud.of', { max: fmtNum(budget) }), st.doseMSv / budget, st.doseMSv > 0.8 * budget),
      ),
      st.sol === 0 ? hint('hint.power') : null,
      st.sol >= 1 ? hint('hint.radio') : null,
      h('h2', { class: 'section-title' }, t('plan.title')),
      h('section', { class: 'card systems', 'aria-label': t('plan.title') },
        sysRow('heat', 'heater', t('sys.heaters'), t('sys.heaters.desc'), `${fmt(env.heaterKWh, 0)} kWh`, null),
        sysRow('air', 'air', t('sys.air'), t('sys.air.desc', { kg: fmt(crewO2()) }), null,
          seg<AirMode>(t('sys.air'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'normal', text: t('opt.normal'), sub: airKWh(1) },
            { value: 'boost', text: t('opt.boost'), sub: airKWh(1.5) },
          ], plan.air, (a) => setPlan({ air: a }))),
        sysRow('food', 'food', t('sys.greenhouse'), t('sys.greenhouse.desc', { kg: fmt(v('GREENHOUSE_KG_PER_SOL')) }), null,
          seg(t('sys.greenhouse'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'on', text: t('opt.on'), sub: `${fmtNum(v('GREENHOUSE_KWH'))} kWh` },
          ], plan.greenhouse ? 'on' : 'off', (x) => setPlan({ greenhouse: x === 'on' }))),
        sysRow('radio', 'radio', t('sys.radio'), t('sys.radio.desc'), null,
          seg(t('sys.radio'), [
            { value: 'off', text: t('opt.off'), sub: '0 kWh' },
            { value: 'on', text: t('opt.on'), sub: `${fmtNum(v('RADIO_KWH'))} kWh` },
          ], plan.radio ? 'on' : 'off', (x) => setPlan({ radio: x === 'on' }))),
        sysRow('crew', 'crew', t('sys.crew'), '', null,
          seg<CrewMode>(t('sys.crew'), [
            { value: 'eva', text: t('crew.eva'), sub: `${fmtNum(v('EVA_KWH'))} kWh`, ico: 'walk' },
            { value: 'lab', text: t('crew.lab'), sub: `${fmtNum(v('LAB_KWH'))} kWh`, ico: 'lab' },
            { value: 'shelter', text: t('crew.shelter'), sub: `${fmtNum(v('SHELTER_KWH'))} kWh`, ico: 'shelter' },
          ], plan.crew, (c) => setPlan({ crew: c })), crewEffect),
      ),
      b.card,
      st.sol === 0 ? hint('hint.end') : null,
      h('div', { class: 'actionbar' },
        h('div', { class: 'meta' },
          h('span', { class: 'big' }, fmtNum(st.scienceSent), h('span', { class: 'faint' }, ` / ${fmtNum(v('SCIENCE_GOAL'))}`)),
          h('span', { class: 'faint' }, t('stat.science'))),
        h('button', { class: 'btn primary lg endsol', type: 'button', onclick: endSol }, t('endsol'), icon('chevron', 'sm')),
      ),
      h('button', { class: 'shortcuts-hint', type: 'button', onclick: openShortcuts },
        icon('info', 'sm'),
        h('span', {}, t('shortcuts.hint')),
      ),
    );

    const solGrid = h('div', { class: 'sol-grid' }, leftCol, rightCol);
    root.replaceChildren(missionHead, solGrid);
  }

  // Keyboard shortcut controller
  const onKeyDown = (e: KeyboardEvent): void => {
    // Ignore when typing in input or when dialog is open
    if (e.target instanceof HTMLInputElement || document.querySelector('dialog[open]')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      endSol();
    } else if (e.key === '1') {
      e.preventDefault();
      const plan = s!.draft;
      const nextAir: Record<AirMode, AirMode> = { off: 'normal', normal: 'boost', boost: 'off' };
      s!.draft = { ...plan, air: nextAir[plan.air] };
      sfx.vent();
      render();
    } else if (e.key === '2') {
      e.preventDefault();
      s!.draft = { ...s!.draft, greenhouse: !s!.draft.greenhouse };
      sfx.toggle();
      render();
    } else if (e.key === '3') {
      e.preventDefault();
      s!.draft = { ...s!.draft, radio: !s!.draft.radio };
      sfx.relay();
      render();
    } else if (e.key === '4') {
      e.preventDefault();
      const plan = s!.draft;
      const nextCrew: Record<CrewMode, CrewMode> = { eva: 'lab', lab: 'shelter', shelter: 'eva' };
      s!.draft = { ...plan, crew: nextCrew[plan.crew] };
      sfx.step();
      render();
    } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      const btn = root.querySelector<HTMLButtonElement>('.shortcuts-hint');
      if (btn) btn.click();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  // Clean up listener when screen changes
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('keydown', onKeyDown);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  render();
  return root;
});
