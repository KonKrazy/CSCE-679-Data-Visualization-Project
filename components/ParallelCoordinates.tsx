"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Feature, Geometry } from "geojson";
import { metrics, type Metric, type Region } from "./metrics";

type Props = {
  data: Feature<Geometry, Region>[];
  activeMetric: Metric;
  selectedCountry: string;
  selectedYear: number;
  hoveredRegionId: string | null;
  setHoveredRegionId: (id: string | null) => void;
};
const fields = Object.keys(metrics) as Metric[];
const baseOpacity = 0.05;
const deltaColor = d3.scaleLinear<string>()
  .domain([-3, 0, 3]).range(["#ef4444", "#94a3b8", "#3b82f6"]).clamp(true);


function ParallelCoordinates({ data, selectedCountry, selectedYear, activeMetric, hoveredRegionId, setHoveredRegionId }: Props) {
  const visibleRegions = useMemo(() => selectedCountry === "All" ? data :
    data.filter(({ properties }) => properties.country_code === selectedCountry), [data, selectedCountry]);
  const ref = useRef<SVGSVGElement>(null);
  const profiles = useRef(new Map<string, SVGPathElement>());
  const highlighted = useRef<SVGPathElement | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1120);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1120, entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const height = 430;
    const x = d3.scalePoint<Metric>().domain(fields).range([58, width - 58]);
    const scales = fields.map((field) => d3.scaleLinear()
      .domain(field === "drought_month_share_12m" ? [0, 1] : [0, 100])
      .range([height - 72, 24]));
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const axes = svg.append("g").attr("pointer-events", "none");
    fields.forEach((field, index) => {
      const axis = axes.append("g").attr("transform", `translate(${x(field)},0)`)
        .call(d3.axisLeft(scales[index]).ticks(5).tickSize(0).tickPadding(6));
      axis.select(".domain").attr("stroke", "#475569");
      axis.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", 10);
      const words = metrics[field].split(" ");
      const middle = Math.ceil(words.length / 2);
      const labelLines = [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
      labelLines.filter(Boolean).forEach((label, line) => axis.append("text")
        .attr("y", height - 48 + line * 14).attr("text-anchor", "middle")
        .attr("fill", field === activeMetric ? "#67e8f9" : "#cbd5e1")
        .attr("font-size", 11).text(label));
    });
    const line = d3.line<number>()
      .defined(Number.isFinite)
      .x((_, index) => x(fields[index])!)
      .y((value, index) => scales[index](value));
    const paths = svg.append("g").selectAll<SVGPathElement, Feature<Geometry, Region>>("path")
      .data(visibleRegions, (feature) => feature.properties.region_id).join("path")
      .attr("class", "profile").attr("fill", "none")
      .attr("d", (feature) => line(fields.map((field) => feature.properties[field] ?? NaN)))
      .attr("stroke", ({ properties }) => deltaColor(properties[`${activeMetric}_delta`] ?? 0))
      .attr("stroke-opacity", baseOpacity).attr("stroke-width", 1.5)
      .attr("tabindex", 0).attr("aria-label", (feature) => feature.properties.region_name)
      .on("mouseover focus", (_, feature) => setHoveredRegionId(feature.properties.region_id))
      .on("mouseout blur", () => setHoveredRegionId(null));
    paths.each(function (feature) {
      profiles.current.set(feature.properties.region_id, this);
    });
    paths.append("title").text((feature) => feature.properties.region_name);
    const profileNodes = profiles.current;
    return () => {
      svg.selectAll("*").remove();
      profileNodes.clear();
      highlighted.current = undefined;
    };
  }, [visibleRegions, width, activeMetric, setHoveredRegionId]);

  useEffect(() => {
    if (highlighted.current) {
      d3.select<SVGPathElement, Feature<Geometry, Region>>(highlighted.current)
        .attr("stroke", ({ properties }) => deltaColor(properties[`${activeMetric}_delta`] ?? 0))
        .attr("stroke-opacity", baseOpacity)
        .attr("stroke-width", 1.5);
    }
    const next = hoveredRegionId === null ? undefined : profiles.current.get(hoveredRegionId);
    if (next) {
      d3.select(next).attr("stroke", "#22d3ee").attr("stroke-opacity", 1)
        .attr("stroke-width", 4).raise();
    }
    highlighted.current = next;
  }, [hoveredRegionId, visibleRegions, width, activeMetric]);

  return <div ref={containerRef} className="overflow-x-auto bg-slate-950/20">
    <svg ref={ref} style={{ width, minWidth: "100%" }} className="parallel-chart" role="group"
      aria-label={`Regional indicator profiles for ${selectedYear}, across ten indicators. Active metric: ${metrics[activeMetric]}`} />
    {visibleRegions.length === 0 && <p className="px-5 pb-3 text-sm text-slate-400">No regions match this year and country.</p>}
  </div>;
}

export default memo(ParallelCoordinates);
