import { sfx } from '../game/audio';
import { h } from './dom';
import { t } from './i18n';
import { icon, type IconName } from './icons';

export function openBriefing(onStart?: () => void): void {
  sfx.click();
  let step = 0;

  const slides: { icon: IconName; titleKey: string; descKey: string; badge: string; badgeClass: string }[] = [
    {
      icon: 'power',
      titleKey: 'briefing.card1.title',
      descKey: 'briefing.card1.desc',
      badge: 'Power & Life Support',
      badgeClass: 'badge-live',
    },
    {
      icon: 'radio',
      titleKey: 'briefing.card2.title',
      descKey: 'briefing.card2.desc',
      badge: '3-22m Light Delay',
      badgeClass: 'badge-cache',
    },
    {
      icon: 'radiation',
      titleKey: 'briefing.card3.title',
      descKey: 'briefing.card3.desc',
      badge: 'NASA DONKI Space Weather',
      badgeClass: 'badge-fixture',
    },
    {
      icon: 'crew',
      titleKey: 'briefing.card4.title',
      descKey: 'briefing.card4.desc',
      badge: "Commander's Seat",
      badgeClass: 'badge-computed',
    },
  ];

  const content = h('div', { class: 'briefing-content' });
  const dots = h('div', { class: 'briefing-dots' });

  function renderSlide(): void {
    const cur = slides[step]!;
    dots.replaceChildren(
      ...slides.map((_, i) =>
        h('span', {
          class: `briefing-dot ${i === step ? 'active' : ''}`,
          onclick: () => { sfx.click(); step = i; renderSlide(); },
        }),
      ),
    );

    content.replaceChildren(
      h('div', { class: 'briefing-badge-row', style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;' },
        h('span', { class: `badge ${cur.badgeClass}` }, cur.badge),
        h('span', { class: 'faint small' }, `${step + 1} / ${slides.length}`),
      ),
      h('div', { class: 'card-head' },
        icon(cur.icon, 'lg'),
        h('h2', { style: 'font-size: 1.15rem;' }, t(cur.titleKey)),
      ),
      h('p', { class: 'prose', style: 'margin: 14px 0 20px; line-height: 1.6; color: var(--text-2); font-size: 0.95rem;' }, t(cur.descKey)),
    );
  }

  const dlg = h('dialog', { class: 'sheet feature-modal briefing-modal', 'aria-labelledby': 'bf-title' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'dialog-head' },
      h('p', { class: 'eyebrow' }, t('briefing.subtitle')),
      h('h1', { id: 'bf-title', style: 'font-size: 1.35rem; margin: 2px 0 10px;' }, t('briefing.title')),
    ),
    content,
    dots,
    h('div', { class: 'btn-row', style: 'margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' },
      h('button', {
        class: 'btn block',
        type: 'button',
        onclick: () => {
          if (step > 0) { sfx.click(); step--; renderSlide(); }
          else { dlg.close(); dlg.remove(); }
        },
      }, step > 0 ? t('back') : t('close')),
      h('button', {
        class: 'btn primary block',
        type: 'button',
        onclick: () => {
          if (step < slides.length - 1) { sfx.click(); step++; renderSlide(); }
          else {
            sfx.click();
            dlg.close();
            dlg.remove();
            if (onStart) onStart();
          }
        },
      }, step < slides.length - 1 ? `${t('report.next')} →` : t('briefing.start')),
    ),
  );

  dlg.addEventListener('click', (e) => { if (e.target === dlg) { dlg.close(); dlg.remove(); } });
  dlg.addEventListener('cancel', () => dlg.remove());
  document.body.append(dlg);
  renderSlide();
  dlg.showModal();
}
