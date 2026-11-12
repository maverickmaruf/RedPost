import facts from '../../../content/facts.json';
import { K } from '../../compute/constants';
import { registerScreen } from '../app';
import { h } from '../dom';
import { getLang, fmtNum, t } from '../i18n';
import { badge, SOURCES } from '../provenance';

interface Fact { id: string; source_id: string; en: string; bn: string }
export const FACTS = (facts as { facts: Fact[] }).facts;
export const factText = (f: Fact): string => (getLang() === 'bn' ? f.bn : f.en);

registerScreen('about', (app) => {
  app.provenance = () => Object.keys(SOURCES).filter((k) => k !== 'model-card').map((k) => ({ source_id: k, badge: 'cache' as const }));
  const rows = Object.entries(K).map(([key, c]) =>
    h('tr', {},
      h('td', {}, t(`const.${key}`)),
      h('td', { class: 'num' }, fmtNum(c.value), ' ', c.unit),
      h('td', {}, c.kind === 'cited' ? badge('cache') : badge('simulated'), ' ', h('span', { class: 'muted small' }, c.kind === 'cited' ? (SOURCES[c.source_id]?.publisher ?? c.source_id) : t('about.simplified'))),
      h('td', { class: 'visually-hidden' }, key),
    ));
  return h('main', { class: 'screen about' },
    h('h1', {}, t('about.title')),
    h('p', {}, t('about.body')),
    h('p', { class: 'note' }, t('about.notmedical')),
    h('h2', {}, t('about.model')),
    h('p', { class: 'muted' }, badge('cache'), ' ', t('about.cited'), '   ', badge('simulated'), ' ', t('about.simplified')),
    h('div', { class: 'table-wrap' }, h('table', { class: 'model' }, h('tbody', {}, ...rows))),
    h('h2', {}, t('about.facts')),
    h('ul', { class: 'facts' }, ...FACTS.map((f) => h('li', {}, factText(f), ' ', h('span', { class: 'muted small' }, '(' + (SOURCES[f.source_id]?.title ?? f.source_id) + ')')))),
    h('h2', {}, t('about.sources')),
    h('ul', { class: 'sources' }, ...Object.entries(SOURCES).map(([, s]) => h('li', {}, h('strong', {}, s.title), ' · ', s.publisher, h('div', { class: 'mono wrap' }, s.url)))),
    h('p', {}, t('about.privacy')),
    h('p', { class: 'muted' }, t('about.ai')),
    h('p', { class: 'muted' }, t('about.version', { v: __APP_VERSION__ }), ' · Apache-2.0'),
    h('button', { class: 'btn', type: 'button', onclick: () => app.go('title') }, t('back')),
  );
});
