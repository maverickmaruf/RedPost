// Mars terrain for the landing-site choice.
// Site boxes: NASA Mars Trek landing-site bookmarks (searchItems API).
// Elevations: MGS MOLA MEGDR 128 pixel/degree tiles from the NASA PDS Geosciences Node,
// fetched with HTTP Range so only the needed rows are downloaded.
import { fetchWithProvenance, pinFixture } from './lib.mjs';

const TREK = 'https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?start=0&rows=5&proj=urn:ogc:def:crs:EPSG::104905&key=';
const PDS = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/';
const PPD = 128;
const HALF_DEG = 0.375; // crop half-width in degrees -> 96 x 96 pixels (~44 km at 463 m/px)

export const SITES = [
  { id: 'jezero', trekKey: 'Jezero', bookmarkTitle: 'Perseverance Landing Site' },
  { id: 'gale', trekKey: 'Gale', bookmarkTitle: 'Curiosity Landing Site' },
  { id: 'gusev', trekKey: 'Gusev', bookmarkTitle: 'Spirit Landing Site' },
];

function tileFor(lat, lonEast) {
  const bands = [[88, 'n'], [44, 'n'], [0, 'n'], [44, 's']]; // top edge of each 44-degree band
  const band = bands.find(([top, h]) => {
    const topSigned = h === 'n' ? top : -top;
    return lat <= topSigned && lat > topSigned - 44;
  });
  if (!band) throw new Error('latitude outside 128ppd tiles: ' + lat);
  const lon0 = Math.floor(lonEast / 90) * 90;
  const name = `megt${String(band[0]).padStart(2, '0')}${band[1]}${String(lon0).padStart(3, '0')}hb`;
  return { name, topLat: band[1] === 'n' ? band[0] : -band[0], westLon: lon0 };
}

function parseLabel(text) {
  const num = (k) => Number((text.match(new RegExp(`^\\s*${k}\\s*=\\s*([-\\d.]+)`, 'm')) || [])[1]);
  return {
    lines: num('LINES'), samples: num('LINE_SAMPLES'), recordBytes: num('RECORD_BYTES'),
    maxLat: num('MAXIMUM_LATITUDE'), minLat: num('MINIMUM_LATITUDE'),
    westLon: num('WESTERNMOST_LONGITUDE'), eastLon: num('EASTERNMOST_LONGITUDE'),
    resolution: num('MAP_RESOLUTION'), sampleBits: num('SAMPLE_BITS'),
    msb: /SAMPLE_TYPE\s*=\s*MSB_INTEGER/.test(text),
  };
}

export async function acquireMola() {
  const out = [];
  const metas = [];
  for (const site of SITES) {
    const trek = await fetchWithProvenance(`trek_${site.id}`, TREK + encodeURIComponent(site.trekKey));
    metas.push(trek.meta);
    await pinFixture(`trek_${site.id}`);
    const doc = trek.body.response.docs.find((d) => d.title === site.bookmarkTitle);
    if (!doc) throw new Error(`Trek bookmark "${site.bookmarkTitle}" not found`);
    const [w, s, e, n] = doc.bbox.split(',').map(Number);
    const lat = (s + n) / 2;
    const lonE = (((w + e) / 2) + 360) % 360;
    const tile = tileFor(lat, lonE);
    const lbl = await fetchWithProvenance(`mola_label_${tile.name}`, PDS + tile.name + '.lbl', { text: true });
    await pinFixture(`mola_label_${tile.name}`, 'text');
    const label = parseLabel(lbl.body);
    if (label.resolution !== PPD || label.sampleBits !== 16 || !label.msb) throw new Error('unexpected MOLA label for ' + tile.name);
    const row0 = Math.round((label.maxLat - (lat + HALF_DEG)) * PPD);
    const nRows = Math.round(2 * HALF_DEG * PPD);
    const col0 = Math.round((lonE - HALF_DEG - label.westLon) * PPD);
    const nCols = nRows;
    const start = row0 * label.recordBytes;
    const end = (row0 + nRows) * label.recordBytes - 1;
    const bin = await fetchWithProvenance(`mola_${site.id}_${tile.name}_r${row0}_${nRows}`, PDS + tile.name + '.img', {
      binary: true, headers: { Range: `bytes=${start}-${end}` },
    });
    metas.push(bin.meta);
    // Raw MOLA rows (~2 MB per site) stay in cache/ only; the compact product is pinned instead.
    const buf = bin.body;
    if (buf.length !== nRows * label.recordBytes) throw new Error(`range size mismatch for ${site.id}: ${buf.length}`);
    const elev = [];
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) elev.push(buf.readInt16BE(r * label.recordBytes + (col0 + c) * 2));
    }
    out.push({
      id: site.id,
      trek: { title: doc.title, uuid: doc.item_UUID, bbox: doc.bbox },
      center: { lat: +lat.toFixed(4), lonEast: +lonE.toFixed(4) },
      grid: {
        rows: nRows, cols: nCols, pixelDeg: 1 / PPD, metersPerPixelEquator: 463,
        north: label.maxLat - row0 / PPD, west: label.westLon + col0 / PPD,
        elevation_m: elev,
      },
      tile: tile.name,
      retrieved: bin.meta.retrieved,
      mode: bin.meta.mode,
    });
  }
  return { sites: out, metas };
}
