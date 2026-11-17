// Measures interaction latency (input event -> next painted frame) in the production build.
//
//   npm run build && npm run start            # in one terminal
//   CHROME="/path/to/chrome" npm run measure  # in another (any Chrome/Chromium binary)
//
// Each trial runs inside the page: it changes a control the way a user would (native
// value setter + input/change event, or a mouseover on a chart line), then waits two
// animation frames so React has committed and the browser has painted. Results are
// written to evaluation/results/latency.json and summarised on stdout.
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { chromium } from "playwright-core";

const url = process.env.URL ?? "http://localhost:3000";
const trials = Number(process.env.TRIALS ?? 30);
const args = (process.env.CHROME_ARGS ?? "").split(" ").filter(Boolean);
const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: process.env.HEADED !== "1", args });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("svg path");

const loadMs = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const data = performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/data/"));
  return { domContentLoaded: nav.domContentLoadedEventEnd, dataLoaded: Math.max(...data.map((entry) => entry.responseEnd)) };
});

const measure = (kind) => page.evaluate(async ({ kind, trials }) => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const setValue = (element, value) => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  };
  const [metricSelect, countrySelect] = document.querySelectorAll("select");
  const slider = document.querySelector('input[type="range"]');
  const samples = [];
  for (let i = 0; i < trials; i += 1) {
    await frame();
    const start = performance.now();
    if (kind === "year") setValue(slider, String(2000 + (i % 15)));
    if (kind === "metric") setValue(metricSelect, metricSelect.options[i % metricSelect.options.length].value);
    if (kind === "country") setValue(countrySelect, countrySelect.options[(i * 7) % countrySelect.options.length].value);
    if (kind === "hover") {
      const lines = [...document.querySelectorAll("svg path")].filter((path) => path.getAttribute("fill") === "none");
      lines[i % lines.length].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    }
    await frame();
    samples.push(performance.now() - start);
  }
  if (kind === "country") setValue(countrySelect, "KHM");
  return samples;
}, { kind, trials });

const results = { url, trials, cpu: cpus()[0].model, chromeArgs: args, userAgent: await page.evaluate(() => navigator.userAgent), loadMs, interactions: {} };
for (const kind of ["year", "metric", "hover", "country"]) {
  const samples = (await measure(kind)).sort((a, b) => a - b);
  const pick = (q) => samples[Math.min(samples.length - 1, Math.floor(q * samples.length))];
  results.interactions[kind] = { median: pick(0.5), p95: pick(0.95), max: samples.at(-1), under300: samples.filter((s) => s < 300).length / samples.length };
}
writeFileSync(new URL("./results/latency.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(`data loaded after ${results.loadMs.dataLoaded.toFixed(0)} ms`);
console.table(Object.fromEntries(Object.entries(results.interactions).map(([kind, r]) => [kind, {
  "median ms": r.median.toFixed(1), "p95 ms": r.p95.toFixed(1), "max ms": r.max.toFixed(1), "< 300 ms": `${(r.under300 * 100).toFixed(0)}%`,
}])));
await browser.close();
