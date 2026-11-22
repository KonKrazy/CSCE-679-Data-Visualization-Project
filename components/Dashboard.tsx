"use client";

import { useEffect, useRef, useState } from "react";
import Map from "./Map";
import ParallelCoordinates from "./ParallelCoordinates";
import RankedBars from "./RankedBars";
import RegionDetail from "./RegionDetail";
import { passesFilters, useLivWell, type Filters, type MetricKey } from "./data";

export default function Dashboard() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState(2010);
  const [country, setCountry] = useState("KHM");
  const [metric, setMetric] = useState<MetricKey>("household_wealth");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [playing, setPlaying] = useState(false);
  const { data, loading, error } = useLivWell();
  useEffect(() => {
    const clear = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedRegionId(null); };
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, []);
  const surveyYears = data?.countryFor(country)?.surveyYears ?? [];
  const rangeStart = surveyYears[0];
  const rangeEnd = surveyYears.at(-1);
  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      let right = -Infinity;
      element.querySelectorAll<HTMLElement>(".survey-tick-label").forEach(label => {
        label.style.visibility = "visible";
        const bounds = label.getBoundingClientRect();
        if (bounds.left < right + 6) label.style.visibility = "hidden";
        else right = bounds.right;
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [data, country]);
  useEffect(() => {
    if (rangeStart == null || rangeEnd == null) { setPlaying(false); return; }
    if (!playing) return;
    const timer = window.setInterval(() => {
      setYear(current => current < rangeStart || current >= rangeEnd ? rangeStart : current + 1);
      setHoveredRegionId(null);
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, rangeStart, rangeEnd]);
  const changeCountry = (code: string) => { setCountry(code); const years = data?.countryFor(code)?.surveyYears ?? []; if (years.length && (year < years[0] || year > years[years.length - 1])) setYear(years[years.length - 1]); setFilters({}); setHoveredRegionId(null); setSelectedRegionId(null); };
  const firstYear = data?.years[0] ?? 1990;
  const lastYear = data?.years[data.years.length - 1] ?? 2019;
  return <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-5 px-4 pt-6 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-xl font-semibold sm:text-2xl">Intra-Country Disparity Divergence Tool</h1>
        <p className="mt-2 text-sm text-slate-400">Real LivWell values · Belmin et al. 2022 · CC BY 4.0 · Regional differences from national baselines</p>
        <details className="mt-2 max-w-2xl text-xs text-slate-400"><summary className="cursor-pointer text-slate-300">About the data</summary>
          <p className="mt-2">Source: LivWell, Belmin et al. (2022), licensed under CC BY 4.0. The national baseline is the unweighted mean of regions with data in each country and year. A z-score is the regional value minus that baseline, divided by the regional standard deviation. Negative z means behind the baseline. Drought’s sign is flipped so higher z always means better off. Annual values between surveys are linearly interpolated; values outside a country’s first and last survey are unavailable.</p>
        </details></div>
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
    {data && <>
    <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Regional filters">
      {(Object.entries(filters) as [MetricKey, [number, number]][]).map(([key, [low, high]]) => <button key={key} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-2" aria-label={`Remove ${data.indicatorFor(key)?.label} filter`} onClick={() => setFilters(previous => { const next = { ...previous }; delete next[key]; return next; })}>{data.indicatorFor(key)?.label} z {low === -Infinity ? "−∞" : low.toFixed(1)} to {high === Infinity ? "∞" : high.toFixed(1)} ×</button>)}
      <button className="rounded border border-slate-600 px-3 py-2 hover:bg-slate-800" onClick={() => setFilters(previous => ({ ...previous, [metric]: [-Infinity, 0] }))}>Behind on {data.indicatorFor(metric)?.label}</button>
      <button className="rounded border border-slate-600 px-3 py-2 disabled:opacity-40" disabled={!Object.keys(filters).length} onClick={() => setFilters({})}>Clear filters</button>
      <span role="status" className="text-slate-400">{data.regionsFor(country).filter(region => passesFilters(data.recordFor(region.properties.region_id, year), filters)).length} of {data.regionsFor(country).length} regions match</span>
    </div>
    <div className="grid items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={rangeStart == null} aria-pressed={playing} onClick={() => setPlaying(value => !value)} className="rounded border border-slate-600 px-3 py-1 text-sm">{playing ? "Pause" : "Play"}</button>
        <label htmlFor="survey-year" className="text-sm font-medium">Year · {year}</label>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{rangeStart == null || year < rangeStart || year > rangeEnd! ? `No data for ${data?.countryFor(country)?.name ?? country}` : surveyYears.includes(year) ? "Survey year" : "Interpolated"}</span>
      </div>
      <div className="relative mx-4 mt-3 min-w-0 sm:mt-4">
        {rangeStart != null && rangeEnd != null && <div aria-hidden="true" className="pointer-events-none absolute top-0 h-5 rounded bg-sky-400/20" style={{ left: `${(rangeStart - firstYear) / (lastYear - firstYear) * 100}%`, width: `${(rangeEnd - rangeStart) / (lastYear - firstYear) * 100}%` }} />}
        <input id="survey-year" type="range" min={firstYear} max={lastYear} step={1} value={year} aria-valuetext={String(year)}
          style={{ "--range-progress": `${((year - firstYear) / (lastYear - firstYear)) * 100}%` } as React.CSSProperties}
          className="relative focus-visible:ring-2 focus-visible:ring-sky-400" onChange={event => { setYear(event.currentTarget.valueAsNumber); setHoveredRegionId(null); }} />
        <div ref={timelineRef} className="relative mt-1 h-6" aria-label="Survey years">{surveyYears.map(surveyYear => <button key={surveyYear} type="button" aria-label={`Survey year ${surveyYear}`} onClick={() => { setYear(surveyYear); setHoveredRegionId(null); }} className="absolute -translate-x-1/2 text-[10px] text-sky-300 focus-visible:outline focus-visible:outline-sky-400" style={{ left: `${(surveyYear - firstYear) / (lastYear - firstYear) * 100}%`, top: 0 }}><span className="mx-auto block h-2 w-px bg-sky-400" /><span className="survey-tick-label">{surveyYear}</span></button>)}</div>
      </div>
    </div>
    <section className="grid gap-4 xl:grid-cols-[3fr_2fr]">
      <article className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">Where are the gaps?</h2>
        <Map {...{ data, year, country, metric, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters }} onCountryChange={changeCountry} />
      </article>
      <article className="relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900 max-xl:h-[560px]">
        <h2 className="shrink-0 p-4 font-semibold">Who is furthest behind?</h2>
        <RankedBars {...{ data, country, year, metric, filters, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId }} />
      </article>
    </section>
    <section className="grid gap-4 xl:grid-cols-[13fr_7fr]">
      <article className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">What else differs?</h2>
        <ParallelCoordinates {...{ data, year, country, metric, setMetric, hoveredRegionId, setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters, setFilters }} />
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">Is the gap closing?</h2>
        <RegionDetail {...{ data, country, year, metric, selectedRegionId, hoveredRegionId, setMetric }} />
      </article>
    </section></>}

  </div>;
}
