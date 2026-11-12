// Space weather from NASA DONKI (CCMC Space Weather Database Of Notifications, Knowledge, Information),
// via api.nasa.gov. We keep only WSA-ENLIL forecast arrivals at Mars and SEP events.
import { fetchWithProvenance, pinFixture, NASA_API_KEY } from './lib.mjs';

// Real mission windows. Each is ~31 Earth days = 30 sols.
export const WINDOWS = [
  { id: '2024-05', start: '2024-05-01', end: '2024-06-01', label: 'May 2024 (solar maximum)' },
  { id: '2024-10', start: '2024-10-01', end: '2024-11-01', label: 'October 2024' },
  { id: '2025-06', start: '2025-06-01', end: '2025-07-02', label: 'June 2025' },
  { id: '2023-03', start: '2023-03-01', end: '2023-04-01', label: 'March 2023' },
];

const API = 'https://api.nasa.gov/DONKI';

export async function acquireDonki() {
  const windows = [];
  const metas = [];
  for (const w of WINDOWS) {
    const q = `startDate=${w.start}&endDate=${w.end}&api_key=${NASA_API_KEY}`;
    let enlil, sep;
    try {
      enlil = await fetchWithProvenance(`donki_enlil_${w.id}`, `${API}/WSAEnlilSimulations?${q}`);
      sep = await fetchWithProvenance(`donki_sep_${w.id}`, `${API}/SEP?${q}`);
    } catch (err) {
      console.warn(`[acquire] skipping DONKI window ${w.id}: ${err.message}`);
      continue;
    }
    await pinFixture(`donki_enlil_${w.id}`);
    await pinFixture(`donki_sep_${w.id}`);
    metas.push(enlil.meta, sep.meta);

    // One forecast per CME: keep the most recent simulation that predicts a Mars arrival.
    const byCme = new Map();
    for (const sim of enlil.body ?? []) {
      const mars = (sim.impactList ?? []).find((i) => i.location === 'Mars');
      if (!mars) continue;
      const cmeKey = (sim.cmeInputs ?? []).map((c) => c.cmeStartTime).sort()[0] ?? sim.simulationID;
      const prev = byCme.get(cmeKey);
      if (!prev || sim.modelCompletionTime > prev.issued) {
        byCme.set(cmeKey, {
          simulationID: sim.simulationID,
          issued: sim.modelCompletionTime,
          cmeStartTime: cmeKey,
          arrival: mars.arrivalTime,
          glancing: !!mars.isGlancingBlow,
          minor: !!mars.isMinorImpact,
          speed_km_s: (sim.cmeInputs ?? [])[0]?.speed ?? null,
          link: sim.link,
        });
      }
    }
    const marsForecasts = [...byCme.values()].sort((a, b) => a.arrival.localeCompare(b.arrival));
    const seps = (sep.body ?? []).map((s) => ({ sepID: s.sepID, eventTime: s.eventTime, instruments: (s.instruments ?? []).map((i) => i.displayName), link: s.link }));
    windows.push({ ...w, marsForecasts, seps, retrieved: enlil.meta.retrieved, mode: enlil.meta.mode, url_enlil: enlil.meta.url, url_sep: sep.meta.url });
  }
  if (windows.length === 0) throw new Error('no DONKI windows available');
  return { windows, metas };
}
