"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

type Row = { region_name: string; region_id: string; disparity_delta: number; household_wealth: number; healthcare_access: number; climate_stress: number; womens_autonomy: number };
type Props = { data: Row[]; fields: string[]; hoveredRegion: string | null; onHover: (id: string | null) => void };
const labels: Record<string,string> = { disparity_delta: "DISPARITY\nDELTA", household_wealth: "HOUSEHOLD\nWEALTH", healthcare_access: "HEALTHCARE\nACCESS", climate_stress: "CLIMATE\nSTRESS", womens_autonomy: "WOMEN’S\nAUTONOMY" };

export default function ParallelCoordinates({ data, fields, hoveredRegion, onHover }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const width = ref.current.clientWidth || 560, height = 430;
    const margin = { top: 34, right: 24, bottom: 48, left: 26 };
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "none");
    const x = d3.scalePoint<string>().domain(fields).range([margin.left, width - margin.right]).padding(0.35);
    const ranges: Record<string, [number,number]> = {};
    fields.forEach((field) => {
      const extent = d3.extent(data, (d) => Number(d[field as keyof Row])) as [number,number];
      ranges[field] = field === "disparity_delta" ? [-5,5] : [Math.max(0, Math.floor(extent[0] / 10) * 10), Math.min(100, Math.ceil(extent[1] / 10) * 10)];
    });
    const y = Object.fromEntries(fields.map((field) => [field, d3.scaleLinear().domain(ranges[field]).range([height - margin.bottom, margin.top])]));
    const line = d3.line<[string,number]>().x(([field]) => x(field)!).y(([field,value]) => y[field](value));
    const color = (d: Row) => Number(d.disparity_delta) < 0 ? "#d26368" : Number(d.disparity_delta) > 0 ? "#69b8e8" : "#96a2b1";
    const group = svg.append("g");
    group.selectAll("path.profile").data(data, (d: any) => d.region_id).join("path").attr("class","profile")
      .attr("d", (d) => line(fields.map((field) => [field, Number(d[field as keyof Row])]))).attr("fill","none")
      .attr("stroke", color).attr("stroke-width", 1.4).attr("stroke-opacity", 0.42)
      .on("mouseenter", (_, d) => onHover(d.region_id)).on("mouseleave", () => onHover(null));
    fields.forEach((field) => {
      const axis = group.append("g").attr("transform", `translate(${x(field)},0)`).call(d3.axisLeft(y[field]).ticks(5).tickSize(0).tickPadding(8).tickFormat(d3.format("~g")));
      axis.select(".domain").attr("stroke", "#344254"); axis.selectAll(".tick text").attr("fill", "#8794a5").attr("font-size", 10); axis.selectAll(".tick line").remove();
      (labels[field] || field.toUpperCase()).split("\n").forEach((part,index) => axis.append("text").attr("x",0).attr("y",height-margin.bottom+24+index*13).attr("text-anchor","middle").attr("fill","#aab5c3").attr("font-size",9).attr("letter-spacing",".08em").text(part));
    });
    return () => { svg.selectAll("*").remove(); };
  }, [data, fields, onHover]);

  useEffect(() => {
    if (!ref.current) return;
    d3.select(ref.current).selectAll<SVGPathElement, Row>("path.profile")
      .attr("stroke-opacity", (d) => hoveredRegion ? (d.region_id === hoveredRegion ? 1 : 0.08) : 0.42)
      .attr("stroke-width", (d) => d.region_id === hoveredRegion ? 3.2 : 1.4);
  }, [hoveredRegion]);
  return <svg ref={ref} className="parallel-chart" role="img" aria-label="Parallel coordinates comparing five development indicators for each region" />;
}
