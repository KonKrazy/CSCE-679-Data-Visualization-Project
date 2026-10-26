# Intra-Country Disparity Divergence Tool

A Next.js prototype for exploring sub-national development gaps. It uses Deck.gl for the map, D3 for parallel coordinates, and Tailwind CSS with custom responsive styles.

## Run the dashboard

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The dashboard does not need a map token or external data service.

## Download the Kaggle dataset

Download the [Well-being of Women in 52 Countries dataset](https://www.kaggle.com/datasets/konradb/wellbeing-of-women-in-52-countries) from Kaggle. Sign in if prompted, choose **Download**, and extract the archive to:

```text
data/source/wellbeing-of-women-in-52-countries/
```

Keep the downloaded source files local. The dashboard does not currently import the Kaggle files automatically; it loads the precomputed GeoJSON at `public/data/mock-regions.geojson`.

## Prototype data and workflow

The GeoJSON contains 18 real, harmonized Cambodian sub-national boundaries adapted from LivWell, repeated for each year from 1990 through 2019. Indicator values are synthetic and are included only to prototype the visualizations. Deck.gl colors regions by `disparity_delta` (red for negative, gray at zero, blue for positive). D3 draws one line per region across disparity, household wealth, healthcare access, climate stress, and women's autonomy. A shared hover state links regions on the map to lines in the chart in both directions, and the year slider updates both views.

Boundary geometry and harmonized region names were adapted from LivWell's `harmonized_boundaries.gpkg` dataset under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The geometries were simplified for this prototype. The synthetic indicators are not measured outcomes and should not be interpreted as findings about Cambodia.

## Implemented core functionality

- Precomputed GeoJSON with 18 regions and annual records for 1990-2019.
- Delta-first map, tooltip, and map-to-chart cross-highlighting.
- Five-axis D3 parallel coordinates plot with chart-to-map hover linking.
- Global year slider that updates the map and chart together.
- Responsive dark dashboard layout.

## Remaining work

- Process and validate appropriate source indicators before replacing synthetic values.
- Add country and indicator selection, data provenance, and accessible non-hover selection.
- Validate visual behavior across browsers and deploy a reviewed build to Vercel.

## GeoJSON properties

Each feature includes `region_name`, `region_id`, `country_name`, `year`, `disparity_delta`, `household_wealth`, `healthcare_access`, `climate_stress`, and `womens_autonomy`. Synthetic indicator values use a 0-100 scale except `disparity_delta`, which ranges from -5 to +5.
