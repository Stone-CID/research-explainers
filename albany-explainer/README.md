# Albany explainer, revised October 30, 2026

The public review URL remains `../CID-manduca-exp-taxfrag-albany.html`. This revision implements Robert Manduca's request to use the updated exemption classification, compare Albany/Colonie/Troy tax measures, and show property values with and without exempt property. The page opts out of indexing with `noindex, nofollow`; it is still publicly accessible.

## Editing

- `page.template.html`: story text, static chart slots, methods, and accessible table structure.
- `story.css`: original cream/navy visual language, local fonts, responsive layout, reduced-motion and print styles.
- `story.mjs`: scrolling chapters, synchronized selections, map controls, and exemption toggle.
- `model.mjs`: shared calculations, color bins, geometry projection, and strict identifier join.
- `data/albany_cbsa_loc2.csv`: unmodified researcher-supplied numeric authority.
- `data/observations.json`: generated numeric records and provenance. Do not edit directly.
- `data/jurisdictions.geojson`, `data/metro.geojson`: original geometry with stale numerical attributes removed. Interior rings are preserved.

Regenerate the root HTML and numeric JSON after editing the template or CSV:

```sh
python3 albany-explainer/scripts/build.py
```

The HTML includes generated comparison charts and a complete 100-row table, so the narrative and figures remain available without JavaScript. Maps use the same numeric observations. Original draft v1 is preserved in Git history at `fc45049:CID-manduca-exp-taxfrag-albany.html`.

Preview from the repository root:

```sh
python3 -m http.server 8776 --bind 127.0.0.1
```

Open `http://127.0.0.1:8776/CID-manduca-exp-taxfrag-albany.html`.

## Checks

Development-only dependencies are not needed to host the website. To run the data and interaction checks:

```sh
npm ci --prefix albany-explainer
npm test --prefix albany-explainer
```

The model checks cover exact joins, all per-capita identities, the weighted regional benchmark, comparison direction, fixed color bins, polygon rings, and failed joins. DOM checks exercise actual controls, keyboard selection, synchronized views, unchanged map extent and legend during metric changes, and the static data table. Browser review additionally covers desktop/mobile rendering and native controls.

## Research review still needed

The updated extract has no year columns. The original 2019 property / 2020 population baseline is identified as pending confirmation for the revised measures. `taxrt_tot` reconciles to `tax_tot / value_tot`; the scope of taxing authorities and relationship of `tax_tot` to municipal receipts are not established by the supplied extract. The page uses the label “effective property-tax rate,” identifies the numbers as study tax measures, and includes these limits in its methods.

The exemption difference is excluded property value, not recoverable revenue. No ownership-category breakdown is supplied; the page does not attribute the whole difference to nonprofit ownership. Residential shares and the old fragmentation quotient are removed because revised equivalents were not supplied.

## Verification on October 30, 2026

- 100 of 100 unique identifiers match, with no unmatched geometry or data rows.
- Covered population: 869,409. Revised total taxable value: $83,017,851,727. Weighted taxable value per resident: $95,487.68384845338.
- Albany: $60,375.6438543604 taxable value per resident; $113,839.36404549601 before exclusions; 46.96417679368705% exempt.
- Original map geometry, branding, and local font assets retained. The site's numeric attributes now come exclusively from the revised extract.

## Copy and source notes, November 2, 2026

The narrative uses rounded figures for readability. Charts, map details, and the data table retain their original precision; the source CSV and calculations are unchanged. Public definitions use plain language. Unconfirmed reference years and tax-authority scope appear in a separate researcher-review disclosure.

Technical field mapping:

- `pc_value_tot`: taxable property value per resident, excluding exempt property.
- `pc_value_raw`: property value per resident, including exempt property.
- `exempt_share = 1 - value_tot / value_raw`: exempt share of property value.
- `clpop`: population covered by the study, the denominator for every per-resident figure. `cenpop` contains full Census jurisdiction populations and is not used for these measures.
- `taxrt_tot = tax_tot / value_tot`: aggregate effective property-tax rate.
- `pc_tax_tot = tax_tot / clpop`: property taxes per resident.
- Fiscal-capacity ratio: `pc_value_tot` divided by the region's total taxable value per covered resident, calculated from summed values and population.
- Geometry joins use state, jurisdiction, and CBSA identifiers; all 100 records match. The map does not specify a boundary vintage.
- The older residential shares and fragmentation quotient remain omitted because equivalent updated measures were not supplied.
