"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Metric } from "./metrics";

export type MetricKey = Metric;
export type RegionProperties = { region_id: string; region_name: string; country_code: string; country_name: string };
export type RegionFeature = Feature<Geometry, RegionProperties>;
export type Indicator = { key: MetricKey; code: string; label: string; description: string; unit: string; higherIsBetter: boolean };
export type Country = { code: string; name: string; surveyYears: number[]; bbox: [number, number, number, number] };
export type Values = Partial<Record<MetricKey, number | null>>;
export type RegionRecord = { id: string; y: number; m: boolean; v: Values; z: Values };
export type Filters = Partial<Record<MetricKey, [number, number]>>;
// Missing observations cannot satisfy an active range.
export function passesFilters(record: RegionRecord | undefined, filters: Filters): boolean {
  return (Object.entries(filters) as [MetricKey, [number, number]][]).every(([key, [low, high]]) => {
    const z = record?.z[key];
    return z != null && Number.isFinite(z) && z >= low && z <= high;
  });
}
export function formatValue(value: number | null | undefined, unit: string): string {
  return value == null ? "No data" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
}
type Payload = { years: number[]; indicators: Indicator[]; countries: Country[]; baselines: Record<string, Record<string, Values>>; records: RegionRecord[] };

function indexData(regions: RegionFeature[], payload: Payload) {
  const records = new Map(payload.records.map(record => [`${record.id}:${record.y}`, record]));
  const countryRegions = new Map(payload.countries.map(country => [country.code, regions.filter(region => region.properties.country_code === country.code)]));
  return {
    ...payload, regions,
    recordFor: (id: string, year: number) => records.get(`${id}:${year}`),
    regionsFor: (country: string) => countryRegions.get(country) ?? [],
    recordsFor: (country: string, year: number) => (countryRegions.get(country) ?? []).flatMap(region => {
      const record = records.get(`${region.properties.region_id}:${year}`);
      return record ? [record] : [];
    }),
    indicatorFor: (key: MetricKey) => payload.indicators.find(indicator => indicator.key === key),
    countryFor: (code: string) => payload.countries.find(country => country.code === code),
  };
}
export type LivWell = ReturnType<typeof indexData>;
let pending: Promise<LivWell> | undefined;
async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(`/data/${file}`);
  if (!response.ok) throw new Error(`Could not load ${file}.`);
  return response.json();
}
function load() {
  pending ??= Promise.all([
    fetchJson<FeatureCollection<Geometry, RegionProperties>>("regions.geojson"),
    fetchJson<Payload>("values.json"),
  ]).then(([geometry, payload]) => indexData(geometry.features, payload)).catch((reason: unknown) => {
    pending = undefined;
    throw reason;
  });
  return pending;
}
export function useLivWell() {
  const [data, setData] = useState<LivWell>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    load().then(value => { if (active) setData(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load LivWell data.");
    });
    return () => { active = false; };
  }, []);
  return { data, loading: !data && !error, error };
}
