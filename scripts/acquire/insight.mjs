// Archived Mars weather from NASA InSight (Elysium Planitia), via api.nasa.gov.
// The feed is frozen at InSight's last reported sols (2020). We present it as archived, never live.
import { fetchWithProvenance, pinFixture, NASA_API_KEY } from './lib.mjs';

export async function acquireInsight() {
  const r = await fetchWithProvenance('insight_weather', `https://api.nasa.gov/insight_weather/?api_key=${NASA_API_KEY}&feedtype=json&ver=1.0`);
  await pinFixture('insight_weather');
  const d = r.body;
  const sols = (d.sol_keys ?? [])
    .filter((k) => d[k]?.AT)
    .map((k) => ({ sol: Number(k), first_utc: d[k].First_UTC, season: d[k].Season, at_min_c: d[k].AT.mn, at_max_c: d[k].AT.mx, at_avg_c: d[k].AT.av, pressure_pa: d[k].PRE?.av ?? null }));
  if (sols.length === 0) throw new Error('InSight feed returned no temperature sols');
  return { sols, meta: r.meta };
}
