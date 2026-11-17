"use client";

import { type LivWell, type MetricKey } from "./data";
import { zColor, zTextColor } from "./colors";

type Props = { data: LivWell; country: string; year: number; metric: MetricKey; selectedRegionId: string | null; hoveredRegionId: string | null; setMetric: (metric: MetricKey) => void };
const format = (value: number | null | undefined, unit: string) => value == null ? "No data" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
export default function RegionDetail({ data, country, year, metric, selectedRegionId, hoveredRegionId, setMetric }: Props) {
  const id = selectedRegionId ?? hoveredRegionId;
  const region = data.regions.find(item => item.properties.region_id === id);
  if (!region || !id) return <p className="p-4 text-sm text-slate-400">Click a region to inspect it</p>;
  const code = region.properties.country_code;
  const points = data.years.flatMap(y => {
    const record = data.recordFor(id, y);
    const z = record?.z[metric];
    return record && z != null ? [{ year: y, z, measured: record.m }] : [];
  });
  const surveys = data.countryFor(code)?.surveyYears ?? [];
  const first = surveys[0] ?? data.years[0];
  const last = surveys.at(-1) ?? first;
  const x = (value: number) => 35 + (value - first) / Math.max(1, last - first) * 330;
  const y = (value: number) => 85 - value / 3 * 55;
  const record = data.recordFor(id, year);
  return <div className="px-4 pb-4">
    <p className="text-sm font-medium">{region.properties.region_name} <span className="text-slate-400">· {data.countryFor(code)?.name ?? country}</span></p>
    <p className="mt-1 text-xs text-slate-400">{data.indicatorFor(metric)?.label} · z over time</p>
    {points.length ? <svg viewBox="0 0 400 170" className="mt-2 w-full" role="img" aria-label={`${region.properties.region_name} trajectory; solid dots mark surveys, dashed segments mark interpolation`}>
      <line x1={35} x2={35} y1={30} y2={140} stroke="#64748b" />
      {[-2, -1, 0, 1, 2].map(tick => <g key={tick}><line x1={31} x2={35} y1={y(tick)} y2={y(tick)} stroke="#94a3b8" /><text x={27} y={y(tick) + 3} textAnchor="end" fill="#94a3b8" fontSize={10}>{tick < 0 ? `−${Math.abs(tick)}` : tick}</text></g>)}
      <line x1={35} x2={365} y1={y(0)} y2={y(0)} stroke="#64748b" />
      <text x={35} y={y(0) - 5} fill="#94a3b8" fontSize={9}>National baseline · 0</text>
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        return point.year === previous.year + 1 ? <line key={point.year} x1={x(previous.year)} x2={x(point.year)} y1={y(previous.z)} y2={y(point.z)} stroke="#38bdf8" strokeWidth={2} strokeDasharray={!previous.measured || !point.measured ? "4 3" : undefined} /> : null;
      })}
      {points.filter(point => point.measured).map(point => <circle key={point.year} cx={x(point.year)} cy={y(point.z)} r={3.5} fill={`rgb(${zColor(point.z).join(",")})`}><title>{point.year}: {point.z.toFixed(2)} · Survey year</title></circle>)}
      {year >= first && year <= last && <line x1={x(year)} x2={x(year)} y1={20} y2={145} stroke="#facc15" strokeDasharray="3 3" />}
      <line x1={35} x2={365} y1={140} y2={140} stroke="#64748b" />
      {surveys.map(survey => <g key={survey}><line x1={x(survey)} x2={x(survey)} y1={140} y2={145} stroke="#94a3b8" /><text x={x(survey)} y={160} textAnchor="middle" fill="#94a3b8" fontSize={10}>{survey}</text></g>)}
    </svg> : <p className="py-5 text-sm text-slate-400">No trajectory data for this indicator</p>}
    <p className="mb-2 text-xs text-slate-400">Dots: surveys · Dashes: interpolation · Yellow: current year {year}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Regional indicators and national baselines for {year}</caption>
      <thead className="text-slate-400"><tr><th className="py-2">Indicator</th><th>Value</th><th>Baseline</th><th>z</th></tr></thead>
      <tbody>{data.indicators.map(indicator => {
        const z = record?.z[indicator.key];
        return <tr key={indicator.key} onClick={() => setMetric(indicator.key)} className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800 ${metric === indicator.key ? "bg-slate-800" : ""}`}>
          <th className="py-2 pr-2 font-normal"><button className="text-left hover:text-sky-300 focus-visible:outline focus-visible:outline-sky-400" onClick={() => setMetric(indicator.key)}>{indicator.label}</button></th>
          <td className="pr-2">{format(record?.v[indicator.key], indicator.unit)}</td><td className="pr-2">{format(data.baselines[code]?.[year]?.[indicator.key], indicator.unit)}</td>
          <td><span className="inline-block rounded px-1.5 py-1" style={{ color: z == null ? "#f8fafc" : zTextColor(z), background: z == null ? "#1e293b" : `rgb(${zColor(z).join(",")})` }}>{z == null ? "—" : z.toFixed(2)}</span></td>
        </tr>;
      })}</tbody>
    </table></div>
  </div>;
}
