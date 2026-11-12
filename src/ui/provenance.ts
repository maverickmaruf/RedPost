// The provenance drawer: for whatever the player is looking at, which dataset, where from, when, and how fresh.
import sourcesJson from '../../content/sources.json';
import { h } from './dom';
import { t } from './i18n';

export type Badge = 'live' | 'cache' | 'fixture' | 'simulated' | 'archived' | 'computed';
export interface ProvItem {
  source_id: string;
  badge: Badge;
  /** Specific record shown, e.g. a DONKI simulation ID or a MOLA tile. */
  detail?: string;
  retrieved?: string;
  url?: string;
}

interface Source { title: string; publisher: string; url: string; dataset_id?: string; report_id?: string; retrieved: string; license: string; status: string }
export const SOURCES = (sourcesJson as { sources: Record<string, Source> }).sources;

export function badge(b: Badge): HTMLElement {
  return h('span', { class: `badge badge-${b}` }, t(`badge.${b}`));
}

let dialog: HTMLDialogElement | null = null;

export function openProvenance(items: ProvItem[]): void {
  dialog?.remove();
  const list = h('ul', { class: 'prov-list' });
  const shown = items.length ? items : [{ source_id: 'spaceapps-2026-statement', badge: 'cache' as Badge }];
  for (const it of shown) {
    const s = SOURCES[it.source_id];
    if (!s) continue;
    list.append(h('li', {},
      h('div', { class: 'prov-head' }, badge(it.badge), h('strong', {}, s.title)),
      h('div', { class: 'small muted' }, s.publisher),
      s.dataset_id || s.report_id ? h('div', { class: 'mono' }, s.dataset_id ?? s.report_id) : null,
      it.detail ? h('div', { class: 'mono' }, it.detail) : null,
      h('div', { class: 'mono wrap faint' }, it.url ?? s.url),
      h('div', { class: 'small faint' }, it.badge === 'computed' ? t('prov.computed') : t('prov.retrieved', { date: (it.retrieved ?? s.retrieved).slice(0, 10) })),
    ));
  }
  dialog = h('dialog', { class: 'drawer sheet', 'aria-labelledby': 'prov-title' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'dialog-head' }, h('p', { class: 'eyebrow' }, t('data.button')), h('h2', { id: 'prov-title' }, t('prov.title'))),
    list,
    h('button', { class: 'btn block', type: 'button', onclick: () => { dialog?.close(); dialog?.remove(); } }, t('close')),
  );
  dialog.addEventListener('close', () => dialog?.remove());
  document.body.append(dialog);
  dialog.showModal();
}
