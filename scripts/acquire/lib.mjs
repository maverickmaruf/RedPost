// Shared fetch layer for build-time acquisition: live -> cache -> fixture.
// Nothing here runs in the browser. The game only reads the products in public/data/.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE = join(ROOT, 'cache');
export const FIXTURES = join(ROOT, 'demo_fixtures');
export const PUBLIC_DATA = join(ROOT, 'public', 'data');
export const OFFLINE = process.argv.includes('--offline') || process.env.OFFLINE === '1';
export const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const UA = 'RedOutpost-acquire/0.1 (open-source education project)';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

const EXT = { json: '.json', text: '.txt', binary: '.bin' };

async function writeWithMeta(dir, key, body, meta, kind) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, key + EXT[kind]), body);
  await writeFile(join(dir, key + '.meta.json'), JSON.stringify(meta, null, 2));
}

/**
 * Fetch with provenance. Returns { body, meta } where meta.mode is live | cache | fixture.
 * `redact` hides the API key in recorded URLs.
 */
export async function fetchWithProvenance(key, url, { binary = false, text = false, headers = {} } = {}) {
  const kind = binary ? 'binary' : text ? 'text' : 'json';
  const publicUrl = url.replace(/api_key=[^&]+/, 'api_key=REDACTED');
  if (!OFFLINE) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      if (kind === 'json') JSON.parse(body); // validate
      const meta = { url: publicUrl, retrieved: new Date().toISOString(), http_status: res.status, mode: 'live' };
      await writeWithMeta(CACHE, key, body, meta, kind);
      return { body: kind === 'json' ? JSON.parse(body) : body, meta };
    } catch (err) {
      console.warn(`[acquire] live fetch failed for ${key}: ${err.message}; trying cache`);
    }
  }
  for (const [dir, mode] of [[CACHE, 'cache'], [FIXTURES, 'fixture']]) {
    const file = join(dir, key + EXT[kind]);
    if (await exists(file)) {
      const raw = await readFile(file);
      const metaFile = join(dir, key + '.meta.json');
      const old = (await exists(metaFile)) ? JSON.parse(await readFile(metaFile, 'utf8')) : { url: publicUrl };
      const body = kind === 'binary' ? raw : kind === 'text' ? raw.toString('utf8') : JSON.parse(raw.toString('utf8'));
      return { body, meta: { ...old, mode } };
    }
  }
  throw new Error(`No live, cache or fixture data for ${key}. Run once with network: npm run acquire`);
}

export async function writeProduct(name, data) {
  await mkdir(PUBLIC_DATA, { recursive: true });
  await mkdir(FIXTURES, { recursive: true });
  const text = JSON.stringify(data);
  await writeFile(join(PUBLIC_DATA, name), text);
  await writeFile(join(FIXTURES, 'product.' + name), text);
  console.log(`[acquire] wrote public/data/${name} (${(text.length / 1024).toFixed(1)} KB)`);
}

/** Copy a cached raw source into demo_fixtures so a clean clone can rebuild offline. */
export async function pinFixture(key, kind = 'json') {
  await mkdir(FIXTURES, { recursive: true });
  for (const ext of [EXT[kind], '.meta.json']) {
    const src = join(CACHE, key + ext);
    if (await exists(src)) await writeFile(join(FIXTURES, key + ext), await readFile(src));
  }
}

/** Worst mode across inputs: fixture < cache < live. */
export function combinedMode(metas) {
  const order = { fixture: 0, cache: 1, live: 2 };
  return metas.reduce((m, x) => (order[x.mode] < order[m] ? x.mode : m), 'live');
}
