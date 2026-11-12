// One NASA OSDR study used in the debrief to show real radiation-biology research exists.
import { fetchWithProvenance, pinFixture } from './lib.mjs';

export const OSDR_STUDIES = ['OSD-2'];

export async function acquireOsdr() {
  const r = await fetchWithProvenance('osdr_radiation', 'https://osdr.nasa.gov/osdr/data/search?term=HZE%20iron%20ions%20gamma-rays&size=10&type=cgene');
  await pinFixture('osdr_radiation');
  const studies = (r.body.hits?.hits ?? [])
    .map((h) => h._source)
    .filter((s) => OSDR_STUDIES.includes(s.Accession))
    .map((s) => ({ accession: s.Accession, title: s['Study Title'], url: `https://osdr.nasa.gov/bio/repo/data/studies/${s.Accession}` }));
  return { studies, meta: r.meta };
}
