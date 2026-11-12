// Typed loaders for the build-time data products in public/data/. Served from the precache offline.
import type { MarsForecast, WeatherSol } from '../compute/mission';

export type Mode = 'live' | 'cache' | 'fixture';

export interface SpaceWindow {
  id: string;
  start: string;
  end: string;
  label: string;
  marsForecasts: MarsForecast[];
  seps: { sepID: string; eventTime: string; link: string }[];
  retrieved: string;
  mode: Mode;
  url_enlil: string;
  url_sep: string;
}

export interface SiteData {
  id: 'jezero' | 'gale' | 'gusev';
  trek: { title: string; uuid: string; bbox: string };
  center: { lat: number; lonEast: number };
  grid: { rows: number; cols: number; pixelDeg: number; north: number; west: number; elevation_m: number[] };
  tile: string;
  retrieved: string;
  mode: Mode;
}

export interface GameData {
  space: { windows: SpaceWindow[]; built: string };
  sites: { sites: SiteData[]; built: string };
  weather: { sols: WeatherSol[]; retrieved: string; mode: Mode; url: string };
  osdr: { studies: { accession: string; title: string; url: string }[]; retrieved: string; mode: Mode };
}

async function getJSON<T>(name: string): Promise<T> {
  const res = await fetch(`./data/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadGameData(): Promise<GameData> {
  const [space, sites, weather, osdr] = await Promise.all([
    getJSON<GameData['space']>('spaceweather.json'),
    getJSON<GameData['sites']>('sites.json'),
    getJSON<GameData['weather']>('weather.json'),
    getJSON<GameData['osdr']>('osdr.json'),
  ]);
  // A retired or empty source must not crash the game: drop unusable entries, fail loudly only if nothing is left.
  space.windows = space.windows.filter((w) => Array.isArray(w.marsForecasts));
  if (space.windows.length === 0) throw new Error('No space-weather windows available');
  if (sites.sites.length === 0) throw new Error('No landing sites available');
  if (weather.sols.length === 0) throw new Error('No weather sols available');
  return { space, sites, weather, osdr };
}

/** Badge shown to players: shipped data is never "live". */
export const shippedBadge = (m: Mode): 'cache' | 'fixture' => (m === 'fixture' ? 'fixture' : 'cache');
