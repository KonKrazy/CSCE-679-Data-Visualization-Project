import { color, interpolateRdBu } from "d3";

export const Z_LIMIT = 2.5;
export function zColor(z: number): [number, number, number] {
  if (Math.abs(z) < 0.25) return [148, 163, 184];
  const rgb = color(interpolateRdBu((Math.max(-Z_LIMIT, Math.min(Z_LIMIT, z)) + Z_LIMIT) / (2 * Z_LIMIT)))!.rgb();
  return [Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)];
}
export const legendGradient = `linear-gradient(to right, ${Array.from({ length: 1001 }, (_, i) => `rgb(${zColor(-Z_LIMIT + i / 1000 * 2 * Z_LIMIT).join(",")}) ${i / 10}%`).join(",")})`;
