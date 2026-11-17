"use client";

import { passesFilters, type Filters, type LivWell, type MetricKey } from "./data";
import { Z_LIMIT, zColor } from "./colors";

type Props = {
  data: LivWell; country: string; year: number; metric: MetricKey; filters: Filters;
  hoveredRegionId: string | null; selectedRegionId: string | null;
  setHoveredRegionId: (id: string | null) => void; setSelectedRegionId: (id: string | null) => void;
};
export default function RankedBars({ data, country, year, metric, filters, hoveredRegionId, selectedRegionId, setHoveredRegionId, setSelectedRegionId }: Props) {
  const rows = data.regionsFor(country).map(region => {
    const record = data.recordFor(region.properties.region_id, year);
    return { region, record, z: record?.z[metric] };
  }).sort((a, b) => (a.z ?? Infinity) - (b.z ?? Infinity));
  // Cap at the colour-scale limit so one outlier does not flatten every other bar.
  const limit = Math.min(Z_LIMIT, Math.max(1, ...rows.map(row => Math.abs(row.z ?? 0))));
  return <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 xl:absolute xl:inset-x-0 xl:bottom-0 xl:top-14">
    <p className="mb-3 text-xs text-slate-400">{data.indicatorFor(metric)?.label} · lowest z first</p>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] text-xs text-slate-400"><span>Region</span><span className="text-center">National baseline</span></div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {rows.map(({ region, record, z }) => {
        const id = region.properties.region_id;
        const active = id === selectedRegionId || id === hoveredRegionId;
        const color = passesFilters(record, filters) && z != null ? `rgb(${zColor(z).join(",")})` : "#64748b";
        const end = 140 + Math.max(-1, Math.min(1, (z ?? 0) / limit)) * 92;
        return <button key={id} type="button" aria-pressed={id === selectedRegionId}
          onMouseEnter={() => setHoveredRegionId(id)} onMouseLeave={() => setHoveredRegionId(null)}
          onFocus={() => setHoveredRegionId(id)} onBlur={() => setHoveredRegionId(null)}
          onClick={() => setSelectedRegionId(id === selectedRegionId ? null : id)}
          className={`grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center rounded text-left text-xs focus-visible:outline focus-visible:outline-sky-400 ${active ? "bg-slate-700/60" : "hover:bg-slate-800"}`}>
          <span className="min-w-0 py-2 pr-2 break-words">{region.properties.region_name}</span>
          <svg viewBox="0 0 280 36" className="block w-full" aria-label={z == null ? "no data" : `z: ${z.toFixed(2)}`}>
            <line x1={140} x2={140} y1={0} y2={36} stroke="#64748b" />
            {z != null && <rect x={Math.min(140, end)} y={8} width={Math.abs(end - 140)} height={20} rx={2} fill={color} />}
            <text x={z == null ? 146 : end + (z < 0 ? -5 : 5)} y={22} textAnchor={z != null && z < 0 ? "end" : "start"} fontSize={11} fill="#f8fafc">{z == null ? "no data" : `${z > 0 ? "+" : ""}${z.toFixed(2)}`}</text>
          </svg>
        </button>;
      })}
    </div>
  </div>;
}
