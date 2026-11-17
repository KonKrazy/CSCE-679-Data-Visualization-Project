"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import * as d3 from "d3";
import { formatValue, passesFilters, type Filters, type LivWell, type MetricKey } from "./data";
import { zColor } from "./colors";
import { metrics } from "./metrics";

type Props = {
  data: LivWell; country: string; year: number; metric: MetricKey;
  setMetric: (metric: MetricKey) => void;
  hoveredRegionId: string | null; setHoveredRegionId: (id: string | null) => void;
  selectedRegionId: string | null; setSelectedRegionId: (id: string | null) => void;
  filters: Filters; setFilters: Dispatch<SetStateAction<Filters>>;
};
const fields = Object.keys(metrics) as MetricKey[];
function splitLabel(label: string): string[] {
  const spaces = [...label.matchAll(/ /g)].map(match => match.index!);
  if (!spaces.length) return [label];
  const middle = spaces.reduce((best, index) => Math.abs(index - label.length / 2) < Math.abs(best - label.length / 2) ? index : best);
  return [label.slice(0, middle), label.slice(middle + 1)];
}
const top = 32, bottom = 300, height = 380;
const y = d3.scaleLinear().domain([-3, 3]).range([bottom, top]).clamp(true);

// Keep D3's imperative brush isolated from React's region rendering.
function AxisBrush({ field, x, range, setFilters }: {
  field: MetricKey; x: number; range?: [number, number]; setFilters: Props["setFilters"];
}) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const group = d3.select(ref.current!);
    const brush = d3.brushY<unknown>().extent([[-9, top], [9, bottom]])
      .on("end", (event: d3.D3BrushEvent<unknown>) => {
        if (!event.sourceEvent) return;
        const selection = event.selection as [number, number] | null;
        setFilters(previous => {
          const next = { ...previous };
          // A brush touching an axis end also keeps the clamped values drawn there.
          if (selection) next[field] = [
            selection[1] >= bottom - 1 ? -Infinity : y.invert(selection[1]),
            selection[0] <= top + 1 ? Infinity : y.invert(selection[0]),
          ];
          else delete next[field];
          return next;
        });
      });
    group.call(brush).call(brush.move, range ? [y(range[1]), y(range[0])] : null);
    group.on("dblclick", event => {
      event.preventDefault();
      group.call(brush.move, null);
      setFilters(previous => { const next = { ...previous }; delete next[field]; return next; });
    });
    return () => { group.selectAll("*").remove(); group.on(".brush", null).on("dblclick", null); };
  }, [field, range, setFilters]);
  return <g ref={ref} transform={`translate(${x},0)`} aria-label={`Filter ${metrics[field]}`} />;
}

export default function ParallelCoordinates({ data, country, year, metric, setMetric, hoveredRegionId,
  setHoveredRegionId, selectedRegionId, setSelectedRegionId, filters, setFilters }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [tooltip, setTooltip] = useState<{ id: string; field: MetricKey; x: number; y: number } | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(900, entry.contentRect.width)));
    observer.observe(container.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setTooltip(null); }, [country, year, filters]);
  const axes = useMemo(() => [metric, ...fields.filter(field => field !== metric)], [metric]);
  const x = d3.scalePoint<MetricKey>().domain(axes).range([55, width - 130]);
  const regions = data.regionsFor(country).map(region => ({ region, record: data.recordFor(region.properties.region_id, year) }));
  const focus = hoveredRegionId ?? selectedRegionId;
  const ordered = [...regions].sort((a, b) => Number(a.region.properties.region_id === focus) - Number(b.region.properties.region_id === focus));
  const tooltipRecord = tooltip && data.recordFor(tooltip.id, year);
  const tooltipIndicator = tooltip && data.indicatorFor(tooltip.field);
  return <div ref={container} className="min-w-0">
    <div className="relative overflow-x-auto bg-slate-950/20" onMouseLeave={() => { setHoveredRegionId(null); setTooltip(null); }}>
      <svg width={width} height={height} className="block" role="group" aria-label={`Regional z-score profiles for ${country}, ${year}`}>
        {[-2, -1, 0, 1, 2].map(tick => <g key={tick}>
          <line x1={55} x2={width - 130} y1={y(tick)} y2={y(tick)} stroke="currentColor" className={tick === 0 ? "text-slate-400" : "text-slate-700"} strokeDasharray={tick === 0 ? "5 4" : undefined} />
        </g>)}
        <text x={width - 120} y={y(0) + 4} fill="currentColor" className="text-slate-300" fontSize={10}>National baseline</text>
        {axes.map((field, index) => {
          const available = regions.some(({ record }) => record?.z[field] != null);
          return <g key={field} opacity={available ? 1 : 0.35}>
            <line x1={x(field)} x2={x(field)} y1={top} y2={bottom} stroke="currentColor" className={field === metric ? "text-sky-300" : "text-slate-600"} strokeWidth={field === metric ? 2 : 1} />
            {index === 0 && [-3, -2, -1, 0, 1, 2, 3].map(tick => <text key={tick} x={x(field)! - 14} y={y(tick) + 4} textAnchor="end" fill="currentColor" className="text-slate-400" fontSize={10}>{tick}</text>)}
            <text x={x(field)} y={321} textAnchor="middle" fill="currentColor" className={`${field === metric ? "text-sky-300 font-semibold" : "text-slate-300"} cursor-pointer`} fontSize={9} role="button" tabIndex={0}
              onClick={() => setMetric(field)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setMetric(field); } }} aria-label={`Show ${metrics[field]} first`}>
              {splitLabel(data.indicatorFor(field)?.label ?? metrics[field]).map((label, line) => <tspan key={label} x={x(field)} dy={line ? 13 : 0}>{label}</tspan>)}
            </text>
            {!available && <text x={x(field)} y={353} textAnchor="middle" fill="currentColor" fontSize={10}>no data</text>}
          </g>;
        })}
        {ordered.map(({ region, record }) => {
          const id = region.properties.region_id;
          const passes = passesFilters(record, filters);
          const highlighted = id === hoveredRegionId || id === selectedRegionId;
          const color = id === hoveredRegionId ? "#facc15" : id === selectedRegionId ? "#ffffff" : passes ? `rgb(${zColor(record?.z[metric] ?? 0).join(",")})` : "#94a3b8";
          const points = axes.map(field => ({ field, z: record?.z[field] }));
          const line = d3.line<(typeof points)[number]>().defined(point => point.z != null).x(point => x(point.field)!).y(point => y(point.z!));
          const end = points.filter(point => point.z != null).at(-1);
          const showTooltip = (event: React.MouseEvent<SVGElement>, field: MetricKey) => {
            const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
            setHoveredRegionId(id); setTooltip({ id, field, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
          };
          return <g key={id} opacity={highlighted ? 1 : !passes ? 0.06 : focus ? 0.12 : 0.5} pointerEvents={passes ? "auto" : "none"}
            onMouseLeave={() => { setHoveredRegionId(null); setTooltip(null); }} onClick={() => setSelectedRegionId(id === selectedRegionId ? null : id)}>
            <path d={line(points) ?? undefined} fill="none" stroke={color} strokeWidth={highlighted ? 3 : 1.5}
              onMouseMove={event => { const localX = event.clientX - event.currentTarget.ownerSVGElement!.getBoundingClientRect().left; const nearest = points.filter(point => point.z != null).sort((a, b) => Math.abs(x(a.field)! - localX) - Math.abs(x(b.field)! - localX))[0]; if (nearest) showTooltip(event, nearest.field); }} />
            {points.filter(point => point.z != null).map(point => <g key={point.field} onMouseMove={event => showTooltip(event, point.field)}>
              <circle cx={x(point.field)} cy={y(point.z!)} r={highlighted ? 4.5 : 3.5} fill={color} stroke={highlighted ? color : "#0f172a"} strokeWidth={highlighted ? 3 : 1} />
              {Math.abs(point.z!) > 3 && <path d={point.z! > 3 ? "M-4,3 L0,-4 L4,3 Z" : "M-4,-3 L0,4 L4,-3 Z"} transform={`translate(${x(point.field)},${y(point.z!)})`} fill={color} stroke={highlighted ? color : "#0f172a"} strokeWidth={highlighted ? 3 : 1} />}
            </g>)}
            {highlighted && end && <text x={x(end.field)! + 7} y={y(end.z!) - 8} fontSize={11} fill={color} textAnchor="end" pointerEvents="none">{region.properties.region_name}</text>}
          </g>;
        })}
        {/* Brushes last: lines and dots sit on the axes and would otherwise swallow the drag. */}
        {axes.map(field => <AxisBrush key={field} field={field} x={x(field)!} range={filters[field]} setFilters={setFilters} />)}
      </svg>
      {tooltip && tooltipRecord && passesFilters(tooltipRecord, filters) && <div role="tooltip" className="pointer-events-none absolute rounded border border-slate-600 bg-slate-900 p-2 text-xs text-slate-200" style={{ left: Math.max(8, Math.min(tooltip.x + 12, width - 240)), top: Math.max(0, tooltip.y - 65) }}>
        <p>{tooltipIndicator?.label}</p>
        <p>{formatValue(tooltipRecord.v[tooltip.field], tooltipIndicator?.unit ?? "")} · z: {tooltipRecord.z[tooltip.field]?.toFixed(2)}</p>
      </div>}
    </div>
    <p className="px-4 py-3 text-xs text-slate-400">Each line is one region. Above the dashed line = better off than the national baseline. Drag on an axis to filter.</p>
  </div>;
}
