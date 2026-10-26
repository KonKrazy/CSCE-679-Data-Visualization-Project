"use client";

import { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import ParallelCoordinates from "@/components/ParallelCoordinates";

type Region = {
  region_name: string;
  region_id: string;
  year: number;
  disparity_delta: number;
  household_wealth: number;
  healthcare_access: number;
  climate_stress: number;
  womens_autonomy: number;
};
type RegionFeature = Feature<Geometry, Region>;
const fields: (keyof Region)[] = ["disparity_delta", "household_wealth", "healthcare_access", "climate_stress", "womens_autonomy"];

function deltaColor(value: number): [number, number, number, number] {
  if (value === 0) return [133, 145, 156, 220];
  if (value < 0) {
    const t = Math.min(1, Math.abs(value) / 5);
    return [Math.round(190 - t * 105), Math.round(85 - t * 55), Math.round(87 - t * 48), 235];
  }
  const t = Math.min(1, value / 5);
  return [Math.round(104 - t * 62), Math.round(166 - t * 73), Math.round(217 - t * 8), 235];
}

export default function Dashboard() {
  const [year, setYear] = useState(2019);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; feature: RegionFeature } | null>(null);
  const [allFeatures, setAllFeatures] = useState<RegionFeature[]>([]);
  useEffect(() => {
    fetch("/data/mock-regions.geojson").then((response) => response.json()).then((collection: FeatureCollection<Geometry, Region>) => setAllFeatures(collection.features as RegionFeature[]));
  }, []);
  const regions = useMemo(() => allFeatures.filter((item) => item.properties.year === year), [allFeatures, year]);
  const exampleRegion = useMemo(() => regions.reduce<RegionFeature | null>((lowest, item) => !lowest || item.properties.disparity_delta < lowest.properties.disparity_delta ? item : lowest, null), [regions]);
  const layers = [new GeoJsonLayer<Region>({
    id: "regions-delta", data: { type: "FeatureCollection", features: regions },
    pickable: true, stroked: true, filled: true, lineWidthMinPixels: 1,
    getLineColor: (feature) => feature.properties.region_id === hoveredRegion ? [255,255,255,255] : [21,31,42,255],
    getLineWidth: (feature) => feature.properties.region_id === hoveredRegion ? 3 : 1,
    getFillColor: (feature) => deltaColor(feature.properties.disparity_delta),
    onHover: (info) => {
      const feature = info.object as RegionFeature | undefined;
      setHoveredRegion(feature?.properties.region_id ?? null);
      setTooltip(feature ? { x: info.x, y: info.y, feature } : null);
    },
    updateTriggers: { getLineColor: [hoveredRegion], getLineWidth: [hoveredRegion] },
  })];

  return <main className="shell">
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true">Δ</div>
      <div className="title-block"><div className="eyebrow">DEVELOPMENT INDICATORS · SYNTHETIC DEMO</div><h1>Intra-Country Disparity <span>Divergence Tool</span></h1></div>
      <div className="header-meta"><span className="live-dot"/> PROTOTYPE <span className="meta-divider"/> 18 REGIONS</div>
    </header>
    <section className="intro-row"><div><h2>Look beyond the national average.</h2><p>Explore how development outcomes diverge across sub-national regions over time.</p>{exampleRegion && <p className="example-note"><span>ILLUSTRATIVE SYNTHETIC EXAMPLE</span> In {year}, {exampleRegion.properties.region_name} is {Math.abs(exampleRegion.properties.disparity_delta).toFixed(2)} points below baseline; compare its healthcare access ({exampleRegion.properties.healthcare_access.toFixed(1)}) and climate stress ({exampleRegion.properties.climate_stress.toFixed(1)}) in the profile.</p>}</div><div className="year-pill">SELECTED YEAR <b>{year}</b></div></section>
    <section className="visual-grid">
      <article className="panel map-panel">
        <div className="panel-heading"><div><span className="panel-kicker">01 / GEOGRAPHIC DISTRIBUTION</span><h3>Where are gaps widening?</h3></div><span className="panel-note">DELTA FROM NATIONAL AVERAGE</span></div>
        <div className="map-canvas">
          <DeckGL initialViewState={{ longitude: -0.8, latitude: 3.1, zoom: 5.1, pitch: 0, bearing: 0 }} controller layers={layers} />
          {tooltip && <div className="map-tooltip" style={{ left: Math.min(tooltip.x + 14, 500), top: Math.max(tooltip.y - 48, 8) }}><strong>{tooltip.feature.properties.region_name}</strong><span>Δ {tooltip.feature.properties.disparity_delta > 0 ? "+" : ""}{tooltip.feature.properties.disparity_delta.toFixed(2)}</span></div>}
          <div className="map-caption">SYNTHETIC REGION BOUNDARIES <span>·</span> HOVER TO INSPECT</div>
        </div>
        <div className="legend"><div className="legend-title">DISPARITY DELTA</div><div className="legend-bar"/><div className="legend-labels"><span>−5 LAGGING</span><span>0 BASELINE</span><span>+5 OUTPERFORMING</span></div></div>
      </article>
      <article className="panel chart-panel">
        <div className="panel-heading"><div><span className="panel-kicker">02 / INDICATOR PROFILES</span><h3>How do outcomes compare?</h3></div><span className="chart-count">{regions.length} REGIONS</span></div>
        <p className="chart-subtitle">Each line traces one region across five indicators.</p>
        <ParallelCoordinates data={regions.map((feature) => feature.properties)} fields={fields} hoveredRegion={hoveredRegion} onHover={setHoveredRegion} />
        <div className="chart-foot"><span><i className="line-key"/> REGION PROFILE</span><span>HOVER A LINE TO LINK TO MAP</span></div>
      </article>
    </section>
    <section className="timeline panel"><div className="timeline-label"><div><span className="panel-kicker">TIME</span><strong>Explore change</strong></div><span className="year-readout">{year}</span></div><div className="slider-wrap"><input aria-label="Select year" type="range" min="1990" max="2019" step="1" value={year} onChange={(event) => { setYear(Number(event.target.value)); setHoveredRegion(null); setTooltip(null); }} style={{ "--range-progress": `${((year - 1990) / 29) * 100}%` } as React.CSSProperties} /><div className="range-ticks"><span>1990</span><span>1995</span><span>2000</span><span>2005</span><span>2010</span><span>2015</span><span>2019</span></div></div><button className="reset-button" onClick={() => { setYear(2019); setHoveredRegion(null); }}>RESET <span>↺</span></button></section>
    <footer><span>INTRA-COUNTRY DISPARITY DIVERGENCE TOOL</span><span>MOCK DATA FOR PROTOTYPING · NOT FOR POLICY USE</span></footer>
  </main>;
}
