// Build-time data acquisition. Usage: npm run acquire   (or OFFLINE=1 / --offline to rebuild from cache + fixtures)
import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { writeProduct, FIXTURES, PUBLIC_DATA, OFFLINE } from './lib.mjs';
import { acquireDonki } from './donki.mjs';
import { acquireMola } from './mola.mjs';
import { acquireInsight } from './insight.mjs';
import { acquireOsdr } from './osdr.mjs';

async function step(name, product, fn) {
  try {
    const data = await fn();
    await writeProduct(product, { ...data, built: new Date().toISOString() });
  } catch (err) {
    // Last resort: the pinned product fixture (clean clone, no network, no cache).
    console.warn(`[acquire] ${name} failed (${err.message}); using pinned product fixture`);
    await mkdir(PUBLIC_DATA, { recursive: true });
    const fx = join(FIXTURES, 'product.' + product);
    try {
      await readFile(fx, 'utf8');
      await copyFile(fx, join(PUBLIC_DATA, product));
    } catch {
      console.error(`[acquire] NEEDS_NETWORK: no fixture for ${product}. See docs/TODO_HUMAN.md`);
      process.exitCode = 1;
    }
  }
}

console.log(`[acquire] mode: ${OFFLINE ? 'OFFLINE (cache/fixtures only)' : 'live with cache fallback'}`);
await step('DONKI', 'spaceweather.json', async () => { const { windows } = await acquireDonki(); return { windows }; });
await step('MOLA', 'sites.json', async () => { const { sites } = await acquireMola(); return { sites }; });
await step('InSight', 'weather.json', async () => { const { sols, meta } = await acquireInsight(); return { sols, retrieved: meta.retrieved, mode: meta.mode, url: meta.url }; });
await step('OSDR', 'osdr.json', async () => { const { studies, meta } = await acquireOsdr(); return { studies, retrieved: meta.retrieved, mode: meta.mode }; });
console.log('[acquire] done');
