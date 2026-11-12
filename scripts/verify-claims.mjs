// Fails the build if any player-facing fact or constant lacks a resolvable source,
// if any dataset the game ships is missing from sources.json or docs/DATA_PLAN.md,
// or if a shipped string still contains TODO text.
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => readFile(join(ROOT, p), 'utf8');
const errors = [];

const { sources } = JSON.parse(await read('content/sources.json'));
const { facts } = JSON.parse(await read('content/facts.json'));
const dataPlan = await read('docs/DATA_PLAN.md').catch(() => '');
if (!dataPlan) errors.push('docs/DATA_PLAN.md missing');

for (const [id, s] of Object.entries(sources)) {
  for (const k of ['title', 'publisher', 'url', 'retrieved', 'license', 'status']) if (!s[k]) errors.push(`source ${id}: missing ${k}`);
  if (s.status === 'UNVERIFIED') errors.push(`source ${id} is UNVERIFIED and must not ship`);
}
for (const f of facts) {
  if (!f.source_id || !sources[f.source_id]) errors.push(`fact ${f.id}: source_id "${f.source_id}" does not resolve`);
  if (!f.en || !f.bn) errors.push(`fact ${f.id}: needs en and bn text`);
}

// Constants: every source_id used in src/compute/constants.ts must resolve.
const consts = await read('src/compute/constants.ts');
for (const m of consts.matchAll(/c\(([^,]+),\s*'[^']*',\s*'(cited|simplified)',\s*'([^']+)'/g)) {
  if (!sources[m[3]]) errors.push(`constant ${m[1]}: source_id "${m[3]}" does not resolve`);
}

// Every source id referenced anywhere in the UI code must resolve.
async function walk(dir) {
  const out = [];
  for (const e of await readdir(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}
for (const file of await walk('src')) {
  const text = await read(file);
  for (const m of text.matchAll(/source_id:\s*'([^']+)'/g)) if (!sources[m[1]]) errors.push(`${file}: source_id "${m[1]}" does not resolve`);
}

// Datasets the game ships must be listed in DATA_PLAN.md.
for (const id of ['donki-enlil', 'donki-sep', 'insight-weather', 'mola-megdr', 'trek-bookmarks', 'osdr-osd-2']) {
  if (!dataPlan.includes(id)) errors.push(`docs/DATA_PLAN.md does not mention shipped dataset ${id}`);
}

// No TODO in player-facing text.
for (const lang of ['en', 'bn']) {
  const strings = JSON.parse(await read(`content/strings.${lang}.json`));
  for (const [k, val] of Object.entries(strings)) if (/TODO|FIXME|lorem/i.test(String(val))) errors.push(`strings.${lang}.json ${k}: placeholder text`);
}

if (errors.length) {
  console.error(`verify:claims FAILED (${errors.length})`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(`verify:claims OK: ${facts.length} facts, ${Object.keys(sources).length} sources, all constants and UI references resolve.`);
