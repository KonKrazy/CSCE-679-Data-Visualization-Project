# Intra-Country Disparity Divergence Tool

CSCE 679 Data Visualization final project · Kevin Nguyen, Brady Nguyen

National averages hide the regions that fall furthest behind. This tool shows how far each
sub-national region diverges from its own country's baseline, across ten indicators of women's
living conditions from the LivWell database (52 countries, 477 harmonized regions, 1990–2019).

## Run it

Requires Node.js 18+.

```bash
npm install
npm run build
npm run start        # http://localhost:3000
```

`npm run dev` also works for development. The processed data is committed in `public/data/`,
so the dashboard runs without downloading the raw dataset, a map token or any server.

## What it does

| Question | View | Interaction |
|---|---|---|
| Where are the gaps? | Delta-first map: regions coloured by z-score against the national baseline | Hover for value, baseline and survey/interpolated status; click to pin; click another country to switch |
| Who is furthest behind? | Diverging ranked bar chart, most-behind first | Hover/click linked to every view |
| What else differs? | Parallel coordinates: one line per region, all ten indicators on a shared z-score axis | Click an axis label to make it the active metric; drag on any axis to filter all views |
| Is the gap closing? | Region detail: z-score trajectory over time plus all ten indicators | Year slider, Play, survey-year ticks |

Filters appear as removable chips; "Behind on {metric}" keeps only regions below the baseline.

**Z-score.** For each country, year and indicator: z = (region value − mean of the country's
regions) / population SD of those regions. The baseline is the unweighted regional mean.
Drought is negated so that positive always means better off. Regions are null when a value is
missing, or when a country has fewer than two regions or no variation that year.

**Survey vs. interpolated years.** LivWell provides linearly interpolated values between each
country's DHS survey years; the tool labels which years are measured.

## Rebuild the data (optional)

Download `livwell_lin_interpolated.csv`, `livwell.csv`, `indicators.csv` and
`harmonized_boundaries.gpkg` from [Zenodo record 7277104](https://zenodo.org/records/7277104)
into `LivWell/` (gitignored), then run with [uv](https://docs.astral.sh/uv/):

```bash
uv run python scripts/prepare_livwell.py     # writes public/data/regions.geojson + values.json
uv run python scripts/validate_payload.py    # recomputes 200 random z-scores independently
uv run pytest -q                             # unit tests for the z-score math
```

Burundi's four regions have no boundaries in the source GeoPackage and are omitted.

## Evaluation

See [`evaluation/README.md`](evaluation/README.md): a task-based user study kit (protocol, tasks,
SUS, answer key generated from the data, empty result templates and an analysis script) and a
reproducible interaction-latency benchmark (`npm run measure`).

## Project structure

```text
app/                      Next.js 15 entry (layout, page, global styles)
components/
  Dashboard.tsx           Shared state: country, year, metric, hover, selection, filters
  Map.tsx                 deck.gl GeoJsonLayer choropleth + tooltip + legend
  RankedBars.tsx          Diverging ranked bars
  ParallelCoordinates.tsx D3 parallel coordinates with axis brushing
  RegionDetail.tsx        Trajectory chart and indicator table
  data.ts                 Payload loading, lookups, passesFilters()
  colors.ts               Shared diverging colour scale (map, bars, chart, legend)
  metrics.ts              Indicator keys and labels
scripts/                  Python data pipeline and validation
tests/                    pytest unit tests
evaluation/               User study kit and latency benchmark
public/data/              Generated payload (committed)
```

## Data and licence

LivWell: Belmin, C., Hoffmann, R., Elkasabi, M., and Pichler, P.-P. (2022). "LivWell: a
sub-national Dataset on the Living Conditions of Women and their Well-being for 52 Countries."
*Scientific Data* 9, 719. https://doi.org/10.1038/s41597-022-01824-2 Data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/);
boundaries were simplified for web display.
