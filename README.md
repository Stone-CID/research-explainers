# Stone Center for Inequality Dynamics · Research explainers

A shared home for standalone research explainers. Each explainer has its own permanent URL within one GitHub Pages site.

## URLs

- Collection: https://stone-cid.github.io/research-explainers/
- Albany explainer: https://stone-cid.github.io/research-explainers/CID-manduca-exp-taxfrag-albany.html
- Detroit explainer: https://stone-cid.github.io/research-explainers/CID-manduca-exp-taxfrag-detroit.html

## Publishing

In this repository's **Settings → Pages**, select **Deploy from a branch**, choose **main**, choose **/(root)**, and save. GitHub Pages then publishes updates committed to `main`. The empty `.nojekyll` file tells Pages to serve the static files directly.

## Add an explainer

1. Add the finished HTML file at the repository root with a unique, URL-friendly filename. A self-contained HTML export needs no build step.
2. If it uses separate images, scripts, styles, or data, add those too. Give each explainer its own asset folder, such as `assets/my-explainer/`, and use relative paths so the page works under `/research-explainers/`.
3. Copy an `<article>` in `index.html` and update its title, author, description, and relative link.
4. Commit to `main`. After the Pages deployment succeeds, open `https://stone-cid.github.io/research-explainers/YOUR-FILENAME.html` and verify it renders and its controls work.

Keep existing filenames stable so shared URLs keep working. No separate repository or Pages configuration is needed for each new explainer. Files on this site are public; omitting a link from the index does not make a page private.

## Current files

- `index.html`: accessible, responsive collection index.
- `CID-manduca-exp-taxfrag-albany.html`: revised Albany explainer using the October 30, 2026 exemption data, tax-rate/property-tax comparisons, and an exemptions map toggle. Editable source, provenance, regeneration instructions, and tests are in [`albany-explainer/`](albany-explainer/README.md). Static charts and the full data table remain readable without JavaScript.
- `CID-manduca-exp-taxfrag-detroit.html`: original supplied Detroit explainer, preserved without edits. Its bundled scripts, fonts, and data unpack in the browser; JavaScript is required.
- `.nojekyll`: serve the static files without Jekyll processing.

## Preview locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/ and follow either explainer link. Stop the server with Ctrl-C.

## Content and reuse

No general reuse license is granted by this repository. Follow the source, credit, and data notes inside each explainer, and obtain permission for reuse where needed.
