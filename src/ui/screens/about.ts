import facts from '../../../content/facts.json';
import { K } from '../../compute/constants';
import { registerScreen } from '../app';
import { h } from '../dom';
import { getLang, fmtNum, t } from '../i18n';
import { icon } from '../icons';
import { badge, SOURCES } from '../provenance';

interface Fact { id: string; source_id: string; en: string; bn: string }
export const FACTS = (facts as { facts: Fact[] }).facts;
export const factText = (f: Fact): string => (getLang() === 'bn' ? f.bn : f.en);

registerScreen('about', (app) => {
  app.provenance = () => Object.keys(SOURCES).filter((k) => k !== 'model-card').map((k) => ({ source_id: k, badge: 'cache' as const }));
  const rows = Object.entries(K).map(([key, c]) =>
    h('li', { 'data-key': key },
      h('span', { class: 'what' }, t(`const.${key}`)),
      h('span', { class: 'val' }, fmtNum(c.value), c.unit ? h('span', { class: 'unit' }, c.unit) : null),
      h('span', { class: 'src' }, c.kind === 'cited' ? badge('cache') : badge('simulated'), c.kind === 'cited' ? (SOURCES[c.source_id]?.publisher ?? c.source_id) : t('about.simplified')),
    ));
  return h('main', { class: 'screen about' },
    h('div', {}, h('p', { class: 'eyebrow' }, t('app.eyebrow')), h('h1', {}, t('about.title'))),
    h('div', { class: 'about-grid' },
      h('div', { class: 'about-col-left' },
        h('section', { class: 'card prose' },
          h('p', {}, t('about.body')),
          h('p', { class: 'note' }, icon('alert', 'sm'), h('span', {}, t('about.notmedical'))),
        ),
        h('section', { class: 'card' },
          h('div', { class: 'card-head' }, icon('science'), h('h2', {}, t('about.model'))),
          h('div', { class: 'key-legend' }, h('span', {}, badge('cache'), ' ', t('about.cited')), h('span', {}, badge('simulated'), ' ', t('about.simplified'))),
          h('ul', { class: 'model-list' }, ...rows),
        ),
        h('section', { class: 'card prose' },
          h('p', {}, t('about.privacy')),
          h('p', {}, t('about.ai')),
          h('p', { class: 'faint small' }, t('about.version', { v: __APP_VERSION__ }), ' · Apache-2.0'),
        ),
        h('button', { class: 'btn block', type: 'button', onclick: () => app.go('title') }, icon('back', 'sm'), t('back')),
      ),
      h('div', { class: 'about-col-right' },
        h('section', { class: 'card' },
          h('div', { class: 'card-head' }, icon('info'), h('h2', {}, t('about.facts'))),
          h('ul', { class: 'facts' }, ...FACTS.map((f) => h('li', {}, h('span', {}, factText(f)), h('span', { class: 'src' }, SOURCES[f.source_id]?.title ?? f.source_id)))),
        ),
        h('section', { class: 'card' },
          h('div', { class: 'card-head' }, icon('radio'), h('h2', {}, t('about.sources'))),
          h('ul', { class: 'sources' }, ...Object.values(SOURCES).map((s) => h('li', {}, h('strong', {}, s.title), h('span', { class: 'src' }, s.publisher), h('span', { class: 'mono wrap faint' }, s.url)))),
        ),
      ),
    ),
  );
});
