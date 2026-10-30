import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildModel, projectGeometry, FOCUS, binFor, FCR_BINS, VALUE_BINS, metricFor } from '../model.mjs';
const read = filename => JSON.parse(readFileSync(new URL('../data/'+filename, import.meta.url)));
const data = read('observations.json'), geometry = read('jurisdictions.geojson'), metro = read('metro.geojson');
const close = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance, `${a} differs from ${b}`);
const model = buildModel(data,geometry);
test('all 100 source rows have unique, exact geometry matches, including string jurisdiction codes', () => {
  assert.equal(model.rows.length,100);assert.equal(model.byId.size,100);
  assert.ok(model.byId.has('36:001_17343:10580'));assert.ok(model.byId.has(FOCUS));
  assert.ok(geometry.features.every(f => Object.keys(f.properties).every(k => ['id','name','kind'].includes(k))));
});
test('all per-capita, rate and exemption fields reconcile to the original totals and covered population', () => {
  for (const r of model.rows) {
    close(r.pc_value_tot,r.value_tot/r.clpop);close(r.pc_value_raw,r.value_raw/r.clpop);close(r.pc_tax_tot,r.tax_tot/r.clpop);
    close(r.taxrt_tot,r.tax_tot/r.value_tot);close(r.exempt_share,1-r.value_tot/r.value_raw);
    close(r.pc_value_tot*r.taxrt_tot,r.pc_tax_tot);
  }
});
test('regional benchmark uses summed values and covered population, and replaces the old benchmark', () => {
  assert.equal(model.metro.population,869409);assert.equal(model.metro.total,83017851727);assert.equal(model.metro.raw,90778463625);
  close(model.metro.pc_value_tot,95487.68384845338);close(model.metro.pc_value_raw,104413.9911422587);
  close(model.byId.get(FOCUS).fcr,.6322872376942497);
  close(model.rows.reduce((s,r)=>s+r.fcr*r.clpop,0)/model.metro.population,1);
});
test('Albany/Colonie/Troy comparison direction and exact values match the revised source', () => {
  const [a,c,t] = model.comparisons;
  close(a.pc_value_tot,60375.6438543604);close(a.pc_value_raw,113839.36404549601);
  assert.ok(a.taxrt_tot>c.taxrt_tot && a.pc_tax_tot<c.pc_tax_tot);
  assert.ok(t.pc_value_tot<a.pc_value_tot && t.taxrt_tot<a.taxrt_tot && t.pc_tax_tot<a.pc_tax_tot);
  close((a.taxrt_tot/c.taxrt_tot-1)*100,39.43510431085775);close((1-a.pc_tax_tot/c.pc_tax_tot)*100,30.874957066677656);
});
test('exemption maps use a shared dollar scale; earlier chapters retain revised FCR values', () => {
  const a=model.byId.get(FOCUS);
  assert.equal(metricFor(a,5,'raw'),a.pc_value_raw);assert.equal(metricFor(a,5,'tot'),a.pc_value_tot);
  assert.equal(metricFor(a,3,'raw'),metricFor(a,3,'tot'));
  assert.equal(binFor(metricFor(a,5,'tot'),VALUE_BINS).label,'$50k–$75k');
  assert.equal(binFor(metricFor(a,5,'raw'),VALUE_BINS).label,'$100k–$125k');
  assert.equal(binFor(.5,FCR_BINS).label,'0.5–0.75×');
  assert.equal(model.rows.filter(r=>r.exempt_share>a.exempt_share).length,1);
});
test('projection preserves every interior and exterior ring, with finite paths and a valid close view', () => {
  const projected=projectGeometry(metro,geometry);
  geometry.features.forEach((f,i)=>{
    const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    assert.equal((projected.shapes[i].d.match(/Z/g)||[]).length,polys.reduce((s,p)=>s+p.length,0));
    assert.ok(!/NaN|Infinity/.test(projected.shapes[i].d));
  });
  assert.ok(projected.zoom.split(' ').map(Number).every(Number.isFinite));
});
test('duplicate or mismatched keys fail rather than silently misjoining data', () => {
  assert.throws(()=>buildModel({...data,rows:[...data.rows,data.rows[0]]},geometry),/Duplicate/);
  assert.throws(()=>buildModel({...data,rows:data.rows.slice(1)},geometry),/same unique/);
});
