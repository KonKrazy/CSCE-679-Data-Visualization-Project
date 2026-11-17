"use client";

import { useEffect, useState } from "react";
import Map from "./Map";
import ParallelCoordinates from "./ParallelCoordinates";
import { useLivWell, type Filters, type MetricKey } from "./data";

export default function Dashboard() {
  const [year, setYear] = useState(2010);
  const [country, setCountry] = useState("KHM");
  const [metric, setMetric] = useState<MetricKey>("household_wealth");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const { data, loading, error } = useLivWell();
  useEffect(() => {
    const clear = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedRegionId(null); };
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, []);
  const changeCountry = (code: string) => { setCountry(code); setFilters({}); setHoveredRegionId(null); setSelectedRegionId(null); };
  const firstYear = data?.years[0] ?? 1990;
  const lastYear = data?.years[data.years.length - 1] ?? 2019;
  return <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-5 px-4 pt-6 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-semibold sm:text-2xl">Intra-Country Disparity Divergence Tool</h1>
        <p className="mt-2 text-sm text-slate-400">Real LivWell values · Belmin et al. 2022 · CC BY 4.0 · Regional differences from national baselines</p></div>
      <label className="grid gap-1 text-sm text-slate-300">Metric
        <select value={metric} onChange={event => setMetric(event.target.value as MetricKey)} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
          {data?.indicators.map(indicator => <option key={indicator.key} value={indicator.key}>{indicator.label}</option>)}
        </select></label>
      <label className="grid gap-1 text-sm text-slate-300">Country
        <select value={country} onChange={event => changeCountry(event.target.value)} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
          {data?.countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select></label>
    </header>
    {loading && <p role="status">Loading LivWell…</p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {data && <section className="grid gap-4 lg:grid-cols-1">
      <article className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">{data.indicatorFor(metric)?.label} · z-score</h2>
        <Map {...{ data, year, country, metric, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters }} onCountryChange={changeCountry} />
      </article>
      <article className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">Regional indicator profiles</h2>
        <ParallelCoordinates {...{ data, year, country, metric, setMetric, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters, setFilters }} />
      </article>
    </section>}
    <div className="sticky bottom-0 z-10 mt-auto rounded-t-lg border border-slate-800 bg-slate-900 p-4">
      <label htmlFor="survey-year" className="text-sm font-medium">Year · {year}</label>
      <input id="survey-year" type="range" min={firstYear} max={lastYear} step={1} value={year} aria-valuetext={String(year)}
        style={{ "--range-progress": `${((year - firstYear) / (lastYear - firstYear)) * 100}%` } as React.CSSProperties}
        className="mt-3 focus-visible:ring-2 focus-visible:ring-sky-400" onChange={event => { setYear(event.currentTarget.valueAsNumber); setHoveredRegionId(null); }} />
      <div className="mt-2 flex justify-between text-xs text-slate-400"><span>{firstYear}</span><span>{lastYear}</span></div>
    </div>
  </div>;
}
