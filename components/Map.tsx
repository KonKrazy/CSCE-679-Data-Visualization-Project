"use client";

import { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Metric, Region } from "./metrics";

type RegionFeature = Feature<Geometry, Region>;
const initialViewState = { longitude: 0, latitude: 10, zoom: 0.8 };
const emptyFeatures: RegionFeature[] = [];

export function useYearlyRegions(selectedYear: number) {
  const [result, setResult] = useState<{ year: number; features: RegionFeature[]; error?: string }>();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/data/data_${selectedYear}.geojson`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load data_${selectedYear}.geojson.`);
        const collection: FeatureCollection<Geometry, Region> = await response.json();
        if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
          throw new Error(`Invalid GeoJSON for ${selectedYear}.`);
        }
        if (!controller.signal.aborted) setResult({ year: selectedYear, features: collection.features });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ year: selectedYear, features: [], error: error instanceof Error ? error.message : "Unable to load regional data." });
        }
      });
    return () => controller.abort();
  }, [selectedYear]);

  const current = result?.year === selectedYear ? result : undefined;
  return { current, data: current?.features ?? emptyFeatures };
}

export default function Map({ data, selectedYear, activeMetric, hoveredRegionId, setHoveredRegionId }: {
  data: RegionFeature[];
  selectedYear: number;
  activeMetric: Metric;
  hoveredRegionId: string | null;
  setHoveredRegionId: (id: string | null) => void;
}) {
  const deltaKey = `${activeMetric}_delta` as const;
  const geojson = useMemo<FeatureCollection<Geometry, Region>>(() => ({
    type: "FeatureCollection", features: data,
  }), [data]);
  const layers = [new GeoJsonLayer<Region>({
    id: "regions",
    data: geojson,
    pickable: true,
    lineWidthUnits: "pixels",
    getFillColor: ({ properties }) => {
      const delta = properties[deltaKey];
      if (delta == null) return [71, 85, 105, 180];
      if (delta === 0) return [148, 163, 184, 210];
      const alpha = 95 + Math.min(Math.abs(delta) / 3, 1) * 160;
      return delta < 0 ? [244, 91, 111, alpha] : [56, 189, 248, alpha];
    },
    getLineColor: ({ properties }) => properties.region_id === hoveredRegionId ? [250, 204, 21] : [30, 41, 59],
    getLineWidth: ({ properties }) => properties.region_id === hoveredRegionId ? 3 : 1,
    onHover: ({ object }) => setHoveredRegionId(object?.properties.region_id ?? null),
    updateTriggers: { getFillColor: activeMetric, getLineColor: hoveredRegionId, getLineWidth: hoveredRegionId },
  })];
  const region = data.find(({ properties }) => properties.region_id === hoveredRegionId)?.properties;
  const delta = region?.[deltaKey];

  return <>
    <div className="relative h-[360px] bg-slate-950 lg:h-[430px]" role="region" aria-label={`Regional disparity map for ${selectedYear}`} onMouseLeave={() => setHoveredRegionId(null)}>
      <DeckGL initialViewState={initialViewState} controller layers={layers} />
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 p-4 text-xs text-slate-300">
      <span className="text-rose-300">Below mean</span>
      <span className="text-sky-300">Above mean</span>
      <span className="text-slate-400">Gray · zero or missing</span>
      {region && <span className="text-yellow-300">{region.region_name}, {region.country_name} · {delta == null ? "No z-score" : `${delta.toFixed(2)} z`}</span>}
    </div>
  </>;
}
