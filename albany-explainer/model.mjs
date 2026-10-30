export const FOCUS = '36:01000:10580';
export const COMPARISONS = [FOCUS, '36:001_17343:10580', '36:75484:10580'];
export const FCR_BINS = [
  { max: .5, color: '#9e5033', label: 'Under 0.5×' },
  { max: .75, color: '#c68a6a', label: '0.5–0.75×' },
  { max: .9, color: '#e2c3ab', label: '0.75–0.9×' },
  { max: 1.1, color: '#dcd7cc', label: '0.9–1.1×' },
  { max: 1.5, color: '#b4c4d6', label: '1.1–1.5×' },
  { max: 2, color: '#7391b3', label: '1.5–2×' },
  { max: Infinity, color: '#34527a', label: '2× or more' },
];
export const VALUE_BINS = [
  { max: 50000, color: '#eeede5', label: 'Under $50k' },
  { max: 75000, color: '#dbe2e2', label: '$50k–$75k' },
  { max: 100000, color: '#bdcdd4', label: '$75k–$100k' },
  { max: 125000, color: '#98b1c2', label: '$100k–$125k' },
  { max: 150000, color: '#7391b3', label: '$125k–$150k' },
  { max: 200000, color: '#4d7096', label: '$150k–$200k' },
  { max: Infinity, color: '#274767', label: '$200k or more' },
];
export const usd = value => '$' + Math.round(value).toLocaleString('en-US');
export const percent = value => (value * 100).toFixed(1) + '%';
export const rate = value => (value * 100).toFixed(2) + '%';
export const displayName = name => name.replace(/^(.*) (city|town|village)$/, (_, n, kind) => `${{ city: 'City', town: 'Town', village: 'Village' }[kind]} of ${n}`);
export const binFor = (value, bins) => bins.find(bin => value < bin.max) || bins.at(-1);
export function buildModel(data, geometry) {
  const byId = new Map();
  for (const row of data.rows) {
    if (byId.has(row.id)) throw new Error('Duplicate data key: ' + row.id);
    if (!(row.clpop > 0) || !(row.value_raw >= row.value_tot) || row.value_tot < 0) throw new Error('Invalid property record: ' + row.id);
    byId.set(row.id, { ...row, name: displayName(row.fu_name), exempt_pc: row.pc_value_raw - row.pc_value_tot });
  }
  const ids = geometry.features.map(f => f.properties.id);
  if (new Set(ids).size !== ids.length || ids.length !== byId.size || ids.some(id => !byId.has(id))) throw new Error('The geometry and data do not have the same unique jurisdiction keys.');
  const rows = [...byId.values()];
  const sum = key => rows.reduce((total, row) => total + row[key], 0);
  const population = sum('clpop'), total = sum('value_tot'), raw = sum('value_raw');
  const metro = { population, total, raw, pc_value_tot: total / population, pc_value_raw: raw / population, exempt_share: 1 - total / raw };
  rows.forEach(row => { row.fcr = row.pc_value_tot / metro.pc_value_tot; });
  return { rows, byId, metro, comparisons: COMPARISONS.map(id => byId.get(id)) };
}
export function metricFor(row, chapter, basis = 'tot') {
  if (chapter >= 5) return row[basis === 'raw' ? 'pc_value_raw' : 'pc_value_tot'];
  return row.fcr;
}
export function bounds(coordinates) {
  const b = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  const walk = c => {
    if (typeof c[0] === 'number') { b.minx = Math.min(b.minx, c[0]); b.miny = Math.min(b.miny, c[1]); b.maxx = Math.max(b.maxx, c[0]); b.maxy = Math.max(b.maxy, c[1]); }
    else c.forEach(walk);
  };
  walk(coordinates); return b;
}
export function projectGeometry(metro, geometry) {
  const b = bounds(metro.features[0].geometry.coordinates);
  const lat = (b.miny + b.maxy) / 2, lon = (b.minx + b.maxx) / 2, cos = Math.cos(lat * Math.PI / 180);
  const k = Math.min(940 / ((b.maxx - b.minx) * cos), 940 / (b.maxy - b.miny));
  const x = v => 500 + (v - lon) * cos * k, y = v => 500 - (v - lat) * k;
  const path = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map(poly => poly.map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(2)} ${y(p[1]).toFixed(2)}`).join('') + 'Z').join('')).join('');
  const shapes = geometry.features.map(f => {
    const bb = bounds(f.geometry.coordinates);
    return { id: f.properties.id, kind: f.properties.kind, d: path(f.geometry), cx: x((bb.minx + bb.maxx) / 2), cy: y((bb.miny + bb.maxy) / 2), x1: x(bb.minx), y1: y(bb.maxy), x2: x(bb.maxx), y2: y(bb.miny) };
  });
  const closeIds = [...COMPARISONS, '36:65508:10580', '36:16749:10580', '36:61148:10580'];
  const close = shapes.filter(f => closeIds.includes(f.id));
  const left = Math.min(...close.map(f => f.x1)), top = Math.min(...close.map(f => f.y1));
  const right = Math.max(...close.map(f => f.x2)), bottom = Math.max(...close.map(f => f.y2));
  const size = Math.max(right - left, bottom - top) * 1.18;
  const zoom = `${(left + right - size) / 2} ${(top + bottom - size) / 2} ${size} ${size}`;
  return { metroD: path(metro.features[0].geometry), shapes, zoom };
}
