import { color, interpolateLab } from "d3";

export const Z_LIMIT = 2.5;
const NEUTRAL = 0.25;
const negative = interpolateLab("#475569", "#f87171");
const positive = interpolateLab("#475569", "#60a5fa");
export function zColor(z: number): [number, number, number] {
  if (Math.abs(z) < NEUTRAL) return [71, 85, 105];
  // Most |z| fall below 1.5, so start partly saturated and ease with sqrt to keep moderate gaps visible.
  const t = Math.min(1, (Math.abs(z) - NEUTRAL) / (Z_LIMIT - NEUTRAL));
  const rgb = color((z < 0 ? negative : positive)(0.2 + 0.8 * Math.sqrt(t)))!.rgb();
  return [Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)];
}
export const legendGradient = `linear-gradient(to right, ${Array.from({ length: 1001 }, (_, i) => `rgb(${zColor(-Z_LIMIT + i / 1000 * 2 * Z_LIMIT).join(",")}) ${i / 10}%`).join(",")})`;

export function zTextColor(z: number): string {
  const [r, g, b] = zColor(z).map(channel => { const s = channel / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? "#020617" : "#f8fafc";
}
