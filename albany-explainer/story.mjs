import { FOCUS, COMPARISONS, FCR_BINS, VALUE_BINS, usd, percent, rate, binFor, buildModel, metricFor, projectGeometry } from './model.mjs';

const SVG = 'http://www.w3.org/2000/svg';
const titles = { 1: 'The region', 2: 'Local government boundaries', 3: 'Tax base per resident', 4: 'Albany, Colonie, and Troy', 5: 'The effect of exemptions' };
const shortLabels = [
  { id: FOCUS, name: 'Albany', dx: -12, anchor: 'end' },
  { id: '36:001_17343:10580', name: 'Colonie', dx: 0, anchor: 'middle' },
  { id: '36:75484:10580', name: 'Troy', dx: 12, anchor: 'start' },
  { id: '36:65508:10580', name: 'Schenectady', dx: -12, anchor: 'end' },
  { id: '36:65255:10580', name: 'Saratoga Springs', dx: 12, anchor: 'start' },
];
function svgElement(tag, attributes = {}) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export async function initStory() {
  const load = async name => {
    const response = await fetch(new URL(`./data/${name}`, import.meta.url));
    if (!response.ok) throw new Error(`Could not load ${name}. Please refresh or use the data table below.`);
    return response.json();
  };
  const [data, geometry, metroGeometry] = await Promise.all([load('observations.json'), load('jurisdictions.geojson'), load('metro.geojson')]);
  const model = buildModel(data, geometry);
  const projected = projectGeometry(metroGeometry, geometry);
  const shapesById = new Map(projected.shapes.map(shape => [shape.id, shape]));
  const state = { chapter: 1, selectedId: FOCUS, basis: 'tot', fullMetro: false, boundaries: true };
  const maps = [];
  const sorted = [...model.rows].sort((a, b) => a.name.localeCompare(b.name));
  const select = document.querySelector('#place-select');
  select.replaceChildren(...sorted.map(row => new Option(row.name, row.id)));
  select.value = state.selectedId;

  function selectPlace(id) {
    if (!model.byId.has(id)) return;
    state.selectedId = id;
    const shape = shapesById.get(id);
    const [x,y,w,h] = projected.zoom.split(' ').map(Number);
    if (shape && (shape.cx < x || shape.cx > x+w || shape.cy < y || shape.cy > y+h)) state.fullMetro = true;
    select.value = id;
    render();
  }
  function setChapter(chapter) {
    if (!titles[chapter] || state.chapter === chapter) return;
    state.chapter = chapter; renderMaps();
  }
  function setBasis(basis) {
    if (!['tot', 'raw'].includes(basis)) return;
    state.basis = basis;
    document.querySelectorAll('[name="exemption-basis"]').forEach(input => { input.checked = input.value === basis; });
    setChapter(5); renderMaps();
  }
  function makeMap(host) {
    const instance = { host, fixedChapter: host.id === 'desktop-map' ? null : Number(host.dataset.mapChapter), paths: new Map() };
    const heading = el('div', 'map-heading');
    instance.heading = el('span'); heading.append(instance.heading, el('small', null, 'Albany metropolitan area'));
    instance.view = el('p', 'map-view');
    const frame = el('div', 'map-frame');
    const svg = svgElement('svg', { viewBox: '0 0 1000 1000', role: 'group', 'aria-label': 'Albany metropolitan-area map' });
    instance.svg = svg;
    svg.append(svgElement('path', { d: projected.metroD, fill: '#e8e3d9', 'fill-rule': 'evenodd' }));
    for (const shape of projected.shapes) {
      const row = model.byId.get(shape.id);
      const p = svgElement('path', { d: shape.d, 'data-id': shape.id, class: 'place-shape', role: 'button', tabindex: '-1', 'vector-effect': 'non-scaling-stroke' });
      const title = svgElement('title');p.append(title);
      p.addEventListener('click', () => { if ((instance.fixedChapter || state.chapter) >= 2) selectPlace(shape.id); });
      p.addEventListener('keydown', event => {
        const chapter = instance.fixedChapter || state.chapter;
        if (chapter < 2) return;
        if (['Enter', ' '].includes(event.key)) { event.preventDefault(); selectPlace(shape.id); }
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const idx = sorted.findIndex(r => r.id === shape.id);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? sorted.length - 1 : (idx + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + sorted.length) % sorted.length;
          selectPlace(sorted[next].id); instance.paths.get(sorted[next].id).focus();
        }
      });
      instance.paths.set(shape.id, p); svg.append(p);
    }
    svg.append(svgElement('path', { d: projected.metroD, class: 'outline', stroke: '#16243a', 'stroke-width': '1.1' }));
    instance.outlines = svgElement('g', { 'aria-hidden': 'true' });
    instance.labels = svgElement('g', { 'aria-hidden': 'true' });
    svg.append(instance.outlines, instance.labels); frame.append(svg);
    instance.actions = el('div', 'map-actions');
    instance.zoom = el('button', null, 'Show the full metro');instance.zoom.type = 'button';
    instance.zoom.addEventListener('click', () => { state.fullMetro = !state.fullMetro; renderMaps(); });
    instance.boundaries = el('button', null, 'Hide boundaries');instance.boundaries.type = 'button';
    instance.boundaries.addEventListener('click', () => { state.boundaries = !state.boundaries; renderMaps(); });
    instance.actions.append(instance.zoom, instance.boundaries);
    instance.detail = el('div', 'map-detail');instance.detail.setAttribute('aria-live', 'polite');instance.detail.setAttribute('aria-atomic', 'true');
    instance.legend = el('div', 'map-legend');
    host.replaceChildren(heading, instance.view, frame, instance.actions, instance.detail, instance.legend, el('p', 'map-source', 'Manduca, Highsmith & Waggoner. Revised Albany extract, October 30, 2026.'));
    maps.push(instance);
  }
  document.querySelectorAll('[data-map-chapter]').forEach(makeMap);

  function renderMap(map) {
    const chapter = map.fixedChapter || state.chapter;
    const exemption = chapter >= 5;
    const zoomed = chapter >= 4 && !state.fullMetro;
    const viewBox = zoomed ? projected.zoom : '0 0 1000 1000';
    const viewSize = Number(viewBox.split(' ')[2]);
    map.svg.setAttribute('viewBox', viewBox);
    map.heading.textContent = titles[chapter];
    map.view.textContent = exemption ? `${state.basis === 'raw' ? 'Including' : 'Excluding'} exempt property · dollars per resident` : chapter >= 3 ? `Taxable value relative to the regional average of ${usd(model.metro.pc_value_tot)}` : chapter === 2 ? 'Each outlined area is a city, town, or village.' : 'Albany is highlighted within its metropolitan area.';
    map.svg.setAttribute('aria-label', `${titles[chapter]}. ${map.view.textContent} Use arrow keys to move between places, or use the place selector below.`);
    map.zoom.hidden = chapter < 4;
    map.zoom.textContent = state.fullMetro ? 'Return to the closer view' : 'Show the full metro';
    map.zoom.setAttribute('aria-pressed', String(zoomed));
    map.boundaries.hidden = chapter < 2;
    map.boundaries.textContent = state.boundaries ? 'Hide boundaries' : 'Show boundaries';
    map.boundaries.setAttribute('aria-pressed', String(state.boundaries));
    for (const [id, path] of map.paths) {
      const row = model.byId.get(id);
      const value = metricFor(row, chapter, state.basis);
      path.setAttribute('fill', chapter <= 2 ? id === FOCUS ? '#b4c0ce' : '#e8e3d9' : binFor(value, exemption ? VALUE_BINS : FCR_BINS).color);
      path.setAttribute('stroke', chapter >= 2 && state.boundaries ? chapter >= 3 ? '#faf7f1' : '#6b7382' : 'none');
      path.setAttribute('stroke-width', chapter >= 3 ? '.7' : '.8');
      path.setAttribute('aria-pressed', String(id === state.selectedId));
      path.setAttribute('tabindex', chapter >= 2 && id === state.selectedId ? '0' : '-1');
      path.setAttribute('aria-disabled', String(chapter < 2));
      path.setAttribute('aria-hidden', String(chapter < 2));
      const info = chapter >= 3 ? exemption ? `${usd(value)} per resident ${state.basis === 'raw' ? 'including' : 'excluding'} exempt property; ${percent(row.exempt_share)} exempt.` : `${usd(row.pc_value_tot)} taxable value per resident; ${row.fcr.toFixed(2)} times the regional average.` : 'Local-government boundary.';
      path.setAttribute('aria-label', `${row.name}. ${info}`);
      path.firstElementChild.textContent = `${row.name}: ${info}`;
    }
    map.outlines.replaceChildren();
    const outline = (id, color, width, dash) => {
      const shape = shapesById.get(id);
      if (!shape) return;
      const p = svgElement('path', { d: shape.d, class: 'outline', stroke: color, 'stroke-width': width });
      if (dash) p.setAttribute('stroke-dasharray', dash);
      map.outlines.append(p);
    };
    if (chapter >= 4) {
      outline(FOCUS, '#16243a', 2.5);
      COMPARISONS.slice(1).forEach(id => outline(id, '#16243a', 1.5, '5 3'));
    }
    if (chapter >= 2) outline(state.selectedId, '#b07b16', 2.7);
    map.labels.replaceChildren();
    const visibleLabels = chapter <= 2 ? shortLabels.slice(0, 1) : shortLabels;
    const [vx,vy,vw,vh] = viewBox.split(' ').map(Number);
    for (const label of visibleLabels) {
      const shape = shapesById.get(label.id);
      if (!shape || shape.cx < vx || shape.cx > vx+vw || shape.cy < vy || shape.cy > vy+vh) continue;
      const scale = viewSize / 1000;
      const text = svgElement('text', { x: shape.cx + label.dx * scale, y: shape.cy, 'text-anchor': label.anchor, 'dominant-baseline': 'middle', class: 'map-label' });
      text.style.fontSize = `${23 * scale}px`;text.style.strokeWidth = `${5 * scale}px`;text.textContent = label.name;map.labels.append(text);
    }
    const row = model.byId.get(state.selectedId);
    const title = el('strong', null, row.name);
    const desc = chapter < 3 ? chapter === 1 ? 'Outline: the five-county metropolitan area. Shaded: the City of Albany.' : 'Select a boundary, or use the place selector below, to choose a place.' : exemption ? `${usd(metricFor(row, chapter, state.basis))} per resident ${state.basis === 'raw' ? 'before' : 'after'} exemption exclusions. ${percent(row.exempt_share)} of raw property value is exempt.` : `${usd(row.pc_value_tot)} taxable value per resident · ${row.fcr.toFixed(2)}× the regional average.`;
    map.detail.replaceChildren(title, el('p', null, desc));
    map.legend.replaceChildren();
    if (chapter >= 3) {
      map.legend.append(el('div', 'legend-title', exemption ? 'Property value per resident · same scale in both views' : 'Taxable value / regional average'));
      const items = el('div', 'legend-items');
      for (const bin of exemption ? VALUE_BINS : FCR_BINS) {
        const item = el('span');const swatch = el('i');swatch.style.background = bin.color;swatch.setAttribute('aria-hidden','true');item.append(swatch, document.createTextNode(bin.label));items.append(item);
      }
      map.legend.append(items);
    }
  }
  function renderMaps() { maps.forEach(renderMap); }
  function render() {
    renderMaps();
    document.querySelectorAll('[data-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.select === state.selectedId)));
    const row = model.byId.get(state.selectedId);
    const detail = document.querySelector('#place-detail');
    const dl = el('dl', 'detail-grid');
    const lines = [
      ['Value before exclusions / resident', usd(row.pc_value_raw)],
      ['Taxable value / resident', usd(row.pc_value_tot)],
      ['Exempt share of raw value', percent(row.exempt_share)],
      ['Effective property-tax rate', rate(row.taxrt_tot)],
      ['Property taxes / resident', usd(row.pc_tax_tot)],
      ['Relative to regional taxable average', row.fcr.toFixed(2)+'×'],
      ['Study-covered residents', row.clpop.toLocaleString('en-US')],
    ];
    lines.forEach(([label,value]) => dl.append(el('dt', null, label), el('dd', null, value)));
    detail.replaceChildren(el('h3', null, row.name), dl);
  }
  select.addEventListener('change', event => selectPlace(event.target.value));
  document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => selectPlace(button.dataset.select)));
  document.querySelectorAll('[name="exemption-basis"]').forEach(input => input.addEventListener('change', event => { if (event.target.checked) setBasis(event.target.value); }));
  let framePending = false;
  const updateChapter = () => {
    const line = window.innerHeight * .42;
    let chapter = 1;
    document.querySelectorAll('.step').forEach(section => { if (section.getBoundingClientRect().top <= line) chapter = Number(section.dataset.chapter); });
    setChapter(chapter);
  };
  const onScroll = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => { framePending = false; updateChapter(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();updateChapter();
  return { state, model, maps, selectPlace, setBasis, setChapter, destroy() { window.removeEventListener('scroll', onScroll);window.removeEventListener('resize', onScroll); } };
}
if (typeof document !== 'undefined' && !globalThis.__ALBANY_TEST__) {
  initStory().catch(error => {
    const target = document.querySelector('#load-error');
    target.hidden = false;
    target.textContent = `The interactive maps could not load. ${error.message} The story, charts, and complete data table are still available.`;
  });
}
