import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/noto-sans-bengali/bengali-400.css';
import '@fontsource/noto-sans-bengali/bengali-700.css';
import './ui/style.css';
import { registerSW } from 'virtual:pwa-register';
import { loadGameData } from './data/load';
import { createApp, type App } from './ui/app';
import { h, mount } from './ui/dom';
import { getLang, t } from './ui/i18n';
import { judgeSession } from './game/session';
import './ui/screens/title';
import './ui/screens/setup';
import './ui/screens/sol';
import './ui/screens/review';
import './ui/screens/about';

const root = document.getElementById('app') as HTMLElement;
document.documentElement.lang = getLang();

async function boot(): Promise<void> {
  let app: App;
  try {
    const data = await loadGameData();
    const judge = new URLSearchParams(location.search).get('judge') === '1';
    app = createApp(root, data, judge);
    if (judge) {
      app.session = judgeSession(data);
      app.go('sol');
    }
  } catch (err) {
    mount(root, h('main', { class: 'screen' }, h('h1', {}, t('app.title')), h('p', { role: 'alert' }, String(err))));
    return;
  }
  // Offline precache. A new version never reloads by itself mid-mission: the title screen offers "Update".
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const update = registerSW({
      onNeedRefresh() {
        app.updateReady = () => void update(true);
      },
    });
  }
}

void boot();
