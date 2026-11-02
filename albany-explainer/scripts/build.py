"""Build the review page and its one numeric data source. Python standard library only."""
from pathlib import Path
import csv, json, hashlib, html, math
ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'albany-explainer'
source = DIR / 'data/albany_cbsa_loc2.csv'
rows = []
identifiers = {'cbsa', 'cbsa_name', 'st', 'fu_code', 'fu_name', 'fu_type'}
for record in csv.DictReader(source.open()):
    row = {k: v if k in identifiers else v == 'TRUE' if k.startswith('cleansample') else float(v) for k, v in record.items()}
    row['id'] = ':'.join(row[k] for k in ['st', 'fu_code', 'cbsa'])
    assert row['cbsa'] == '10580' and row['st'] == '36'
    for a, b in [('pc_value_tot','value_tot'),('pc_value_raw','value_raw'),('pc_tax_tot','tax_tot')]:
        assert math.isclose(row[a], row[b]/row['clpop'], abs_tol=1e-7)
    assert math.isclose(row['exempt_share'], 1-row['value_tot']/row['value_raw'], abs_tol=1e-10)
    assert math.isclose(row['taxrt_tot'], row['tax_tot']/row['value_tot'], abs_tol=1e-10)
    rows.append(row)
by_id = {r['id']:r for r in rows}
geo = json.loads((DIR/'data/jurisdictions.geojson').read_text())
assert len(by_id) == len(rows) == len(geo['features']) == 100
assert set(by_id) == {f['properties']['id'] for f in geo['features']}
assert all(r['cleansample_val_tot'] and r['cleansample_tax_tot'] for r in rows)
pop = sum(r['clpop'] for r in rows)
total = sum(r['value_tot'] for r in rows)
raw = sum(r['value_raw'] for r in rows)
metro_pc = total / pop
meta = {'received':'2026-10-30','source_file':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'numeric_authority':'Robert Manduca revised Albany extract, supplied October 30, 2026','property_year_baseline':2019,'population_year_baseline':2020,'reference_years_status':'Revised extract contains no year columns; baseline retained pending author confirmation.','tax_measure_status':'Effective rate equals tax_tot/value_tot. Taxing-authority scope and relation to municipal receipts require author confirmation.','population_denominator':'clpop','geometry_source':'Original Albany explainer, research-explainers commit fc45049. Stable state/jurisdiction/CBSA join.','join':{'matched':100,'data_only':0,'geometry_only':0,'duplicate_keys':0}}
(DIR/'data/observations.json').write_text(json.dumps({'metadata':meta,'rows':rows},separators=(',',':'))+'\n')
A,C,T = [by_id[x] for x in ['36:01000:10580','36:001_17343:10580','36:75484:10580']]
usd=lambda v:'$'+format(round(v),',')
rounded_usd=lambda v:'$'+format(round(v/100)*100,',')
pct=lambda v:format(v*100,'.1f')+'%'
rate=lambda v:format(v*100,'.2f')+'%'
name=lambda r:r['fu_name'].rsplit(' ',1)[1].capitalize()+' of '+r['fu_name'].rsplit(' ',1)[0]
values={'metro_pc':usd(metro_pc),'metro_total':'$'+format(total/1e9,'.1f')+' billion','metro_pop':format(round(pop),','),'metro_exempt':pct(1-total/raw),'albany_fcr_pct':str(round(A['pc_value_tot']/metro_pc*100))+'%','rate_higher':str(round((A['taxrt_tot']/C['taxrt_tot']-1)*100))+'%','tax_lower':str(round((1-A['pc_tax_tot']/C['pc_tax_tot'])*100))+'%','albany_excluded_pc':usd(A['pc_value_raw']-A['pc_value_tot'])}
values['metro_pc_rounded']=rounded_usd(metro_pc)
values['metro_exempt_rounded']=str(round((1-total/raw)*100))+'%'
for slug,row in [('albany',A),('colonie',C),('troy',T)]:
    for key in ['pc_value_tot','pc_value_raw','pc_tax_tot']:
        values[slug+'_'+key]=usd(row[key])
        values[slug+'_'+key+'_rounded']=rounded_usd(row[key])
    values[slug+'_exempt_rounded']=str(round(row['exempt_share']*100))+'%'
    values[slug+'_exempt']=pct(row['exempt_share']);values[slug+'_rate']=rate(row['taxrt_tot'])
# Static charts and table remain readable without JavaScript.
metrics=[('pc_value_tot','Tax base per resident',usd,150000),('taxrt_tot','Effective property-tax rate',rate,.04),('pc_tax_tot','Property taxes per resident',usd,3200)]
charts=[]
for key,label,fmt,maximum in metrics:
    cards=[]
    for row in [A,C,T]:
        short=row['fu_name'].split(' ')[0]
        cards.append(f'<button type="button" class="metric-row" data-select="{row["id"]}" aria-pressed="false"><span class="row-name">{short}</span><strong>{fmt(row[key])}</strong><span class="bar-track" aria-hidden="true"><span class="bar-fill {short.lower()}" style="width:{row[key]/maximum*100:.4f}%"></span></span></button>')
    charts.append(f'<div class="metric-chart"><h3>{label}</h3><p class="chart-scale">Scale: 0 to {fmt(maximum)}</p>'+''.join(cards)+'</div>')
values['comparison_charts']=''.join(charts)
exempt=[]
for row in [A,C,T]:
    share=row['exempt_share'];short=row['fu_name'].split(' ')[0]
    exempt.append(f'<div class="exempt-row"><div class="row-heading"><span>{short}</span><strong>{pct(share)} exempt</strong></div><div class="stacked" role="img" aria-label="{short}: {pct(share)} of property value is exempt"><span class="taxable-part" style="width:{(1-share)*100:.4f}%"></span><span class="exempt-part" style="width:{share*100:.4f}%"></span></div><div class="row-endpoints"><span>{usd(row["pc_value_tot"])} taxable</span><span>{usd(row["pc_value_raw"])} including exempt property</span></div></div>')
values['exemption_bars']=''.join(exempt)
table=[]
for row in sorted(rows,key=lambda r:name(r)):
    cells=[html.escape(name(row)),usd(row['pc_value_raw']),usd(row['pc_value_tot']),pct(row['exempt_share']),rate(row['taxrt_tot']),usd(row['pc_tax_tot']),format(row['pc_value_tot']/metro_pc,'.2f')+'×',format(round(row['clpop']),',')]
    table.append('<tr><th scope="row">'+cells[0]+'</th>'+''.join('<td>'+c+'</td>' for c in cells[1:])+'</tr>')
values['data_rows']=''.join(table)
text=(DIR/'page.template.html').read_text()
for key,value in values.items(): text=text.replace('{{'+key+'}}',value)
assert '{{' not in text, 'Unresolved template field'
(ROOT/'CID-manduca-exp-taxfrag-albany.html').write_text(text)
print('Built Albany review: 100/100 joins; numeric identities reconciled; static charts and table generated.')
