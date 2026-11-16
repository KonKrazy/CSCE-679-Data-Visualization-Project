"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Map, { useYearlyRegions } from "./Map";
import ParallelCoordinates from "./ParallelCoordinates";
import { metrics, type Metric } from "./metrics";

const firstYear = 1990;
const lastYear = 2019;
const MemoizedMap = memo(Map);

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(lastYear);
  const [sliderYear, setSliderYear] = useState(lastYear);
  const [selectedCountry, setSelectedCountry] = useState<string | "All">("All");
  const [activeMetric, setActiveMetric] = useState<Metric>("household_wealth");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const { current, data } = useYearlyRegions(selectedYear);
  useEffect(() => {
    if (sliderYear === selectedYear) return;
    const timeout = window.setTimeout(() => {
      setSelectedYear(sliderYear);
      setHoveredRegionId(null);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [sliderYear, selectedYear]);

  const countryCodes = useMemo(() => [...new Set(data.map(({ properties }) => properties.country_code))]
    .filter(Boolean).sort(), [data]);
  const linkedProps = { data, selectedYear, activeMetric, hoveredRegionId, setHoveredRegionId };

  return <div className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-5 px-4 pt-6 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Intra-Country Disparity Divergence Tool</h1>
        <p className="mt-2 text-sm text-slate-400">LivWell · Regional differences from each country’s annual mean</p>
      </div>
      <label className="grid gap-1 text-sm text-slate-300">
        Metric
        <select value={activeMetric} onChange={(event) => { setActiveMetric(event.target.value as Metric); setHoveredRegionId(null); }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
          {Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm text-slate-300">
        Chart country
        <select value={selectedCountry}
          onChange={(event) => { setSelectedCountry(event.target.value); setHoveredRegionId(null); }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
          <option value="All">All countries</option>
          {selectedCountry !== "All" && !countryCodes.includes(selectedCountry) &&
            <option value={selectedCountry}>{selectedCountry} (no data for this year)</option>}
          {countryCodes.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>
    </header>

    {!current && <p role="status" className="text-sm text-slate-400">Loading {selectedYear}…</p>}
    {current?.error && <p role="alert" className="text-sm text-rose-300">{current.error}</p>}
    <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <article className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">{metrics[activeMetric]} · z-score</h2>
        <MemoizedMap {...linkedProps} />
      </article>
      <article className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="p-4 font-semibold">Regional indicator profiles</h2>
        <ParallelCoordinates {...linkedProps} selectedCountry={selectedCountry} />
      </article>
    </section>

    <div className="sticky bottom-0 z-10 mt-auto rounded-t-lg border border-slate-800 bg-slate-900 p-4">
      <label htmlFor="survey-year" className="text-sm font-medium">Year · {sliderYear}</label>
      <input id="survey-year" type="range" min={firstYear} max={lastYear} step={1}
        value={sliderYear} aria-valuetext={String(sliderYear)}
        style={{ "--range-progress": `${((sliderYear - firstYear) / (lastYear - firstYear)) * 100}%` } as React.CSSProperties}
        className="mt-3 focus-visible:ring-2 focus-visible:ring-sky-400"
        onChange={(event) => setSliderYear(event.currentTarget.valueAsNumber)} />
      <div className="mt-2 flex justify-between text-xs text-slate-400"><span>{firstYear}</span><span>{lastYear}</span></div>
    </div>
  </div>;
}
