"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { FlyToInterpolator, WebMercatorViewport, type MapViewState } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Filters, LivWell, MetricKey, RegionFeature, RegionProperties } from "./data";
import { formatValue, passesFilters } from "./data";
import { legendGradient, zColor } from "./colors";

type Props = {
  data: LivWell; year: number; country: string; metric: MetricKey;
  hoveredRegionId: string | null; setHoveredRegionId: (id: string | null) => void;
  selectedRegionId: string | null; setSelectedRegionId: (id: string | null) => void;
  filters: Filters; onCountryChange: (country: string) => void;
};

function Map({ data, year, country, metric, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters, onCountryChange }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);
  const fittedCountry = useRef<string | null>(null);
  const hasSize = size.width > 0 && size.height > 0;
  const geometry = useMemo(() => ({ type: "FeatureCollection" as const, features: data.regions }), [data.regions]);
  const [viewState, setViewState] = useState<MapViewState>({ longitude: 0, latitude: 10, zoom: 0.8 });
  const [hover, setHover] = useState<{ region: RegionFeature; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      sizeRef.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      setSize(sizeRef.current);
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const bbox = data.countryFor(country)?.bbox;
    if (!bbox || !hasSize || fittedCountry.current === country) return;
    const fitted = new WebMercatorViewport(sizeRef.current).fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40 });
    setViewState({ longitude: fitted.longitude, latitude: fitted.latitude, zoom: fitted.zoom, transitionDuration: 900, transitionInterpolator: new FlyToInterpolator() });
    fittedCountry.current = country;
    setHover(null);
  }, [country, data, hasSize]);
  const layers = [new GeoJsonLayer<RegionProperties>({
    id: "regions", data: geometry, pickable: true,
    lineWidthUnits: "pixels",
    getFillColor: ({ properties }) => {
      if (properties.country_code !== country) return [100, 116, 139, 35];
      const record = data.recordFor(properties.region_id, year);
      const z = record?.z[metric];
      const visible = passesFilters(record, filters);
      const rgb = z == null ? [30, 41, 59] : zColor(z);
      return [rgb[0], rgb[1], rgb[2], visible ? (z == null ? 255 : 230) : 35];
    },
    getLineColor: ({ properties }) => properties.region_id === selectedRegionId ? [255, 255, 255, 255] : properties.region_id === hoveredRegionId ? [250, 204, 21, 255] : [148, 163, 184, properties.country_code === country ? (data.recordFor(properties.region_id, year)?.z[metric] == null ? 230 : 130) : 45],
    getLineWidth: ({ properties }) => properties.region_id === selectedRegionId ? 3.5 : properties.region_id === hoveredRegionId ? 2.5 : properties.country_code === country ? 0.8 : 0.4,
    onHover: ({ object, x, y }) => {
      setHoveredRegionId(object?.properties.region_id ?? null);
      setHover(object ? { region: object as RegionFeature, x, y } : null);
    },
    onClick: ({ object }) => {
      if (!object) return;
      if (object.properties.country_code !== country) onCountryChange(object.properties.country_code);
      else setSelectedRegionId(object.properties.region_id === selectedRegionId ? null : object.properties.region_id);
    },
    updateTriggers: { getFillColor: [country, year, metric, filters], getLineColor: [country, year, metric, hoveredRegionId, selectedRegionId], getLineWidth: [country, hoveredRegionId, selectedRegionId] },
  })];
  const properties = hover?.region.properties;
  const record = properties ? data.recordFor(properties.region_id, year) : undefined;
  const indicator = data.indicatorFor(metric);
  const baseline = properties ? data.baselines[properties.country_code]?.[year]?.[metric] : undefined;
  const z = record?.z[metric];
  return <>
    <div ref={container} className="relative h-[360px] bg-slate-950 lg:h-[430px]" role="region" aria-label={`Regional disparity map for ${year}`} onMouseLeave={() => { setHover(null); setHoveredRegionId(null); }}>
      <DeckGL viewState={viewState} onViewStateChange={({ viewState: next }) => setViewState(next as MapViewState)} controller layers={layers} />
      {hover && properties && <div role="tooltip" className="pointer-events-none absolute z-20 w-64 rounded-md border border-slate-600 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-xl"
        style={{ left: Math.max(8, Math.min(hover.x + 14, size.width - 264)), top: Math.max(8, Math.min(hover.y + 14, size.height - 185)) }}>
        <p className="font-semibold text-white">{properties.region_name}</p><p className="mb-2 text-slate-400">{properties.country_name} · {year}</p>
        <p>{indicator?.label}: {formatValue(record?.v[metric], indicator?.unit ?? "")}</p>
        <p>National baseline (regional mean): {formatValue(baseline, indicator?.unit ?? "")}</p>
        <p>z: {z == null ? "No data" : `${z >= 0 ? "+" : ""}${z.toFixed(2)}`}</p>
        {record ? <span className={`mt-2 inline-block rounded px-2 py-1 ${record.m ? "bg-sky-900 text-sky-200" : "bg-slate-700 text-slate-200"}`}>{record.m ? "Survey year" : "Interpolated"}</span> : <p className="mt-2 text-slate-400">No observation for this year</p>}
      </div>}
    </div>
    <div className="border-t border-slate-800 p-4 text-xs text-slate-300" aria-label="Oriented z-score legend">
      <div className="h-3 rounded" style={{ background: legendGradient }} />
      <div className="relative mt-1 h-4">{[-2, -1, 0, 1, 2].map(tick => <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${(tick + 2.5) / 5 * 100}%` }}>{tick < 0 ? `−${Math.abs(tick)}` : tick}</span>)}</div>
      <div className="mt-1 flex justify-between gap-4"><span>Behind national baseline</span><span>Ahead</span></div>
      <div className="mt-2 flex items-center gap-2"><span className="inline-block h-3 w-5 rounded border border-slate-400 bg-slate-800" />No data</div>
      <p className="mt-2 text-slate-400">Neutral slate: |z| &lt; 0.25 · Click a region to pin; Esc to clear</p>
    </div>
  </>;
}

export default React.memo(Map);
