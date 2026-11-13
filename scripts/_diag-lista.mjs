// Lista os shaders da cena (para ver o que dá para unificar). Uso: node scripts/_diag-lista.mjs <base>
import { chromium } from "playwright";
const [base] = process.argv.slice(2);
const q = process.env.Q ? `&q=${process.env.Q}` : "";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(`${base}/?debug=1${q}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.waitForTimeout(8000);
const r = await page.evaluate(() => window.__gl.info.programs.map((p) => {
  const k = p.cacheKey.split(",");
  return `${String(k[0]).slice(0, 14).padEnd(14)} ${String(p.name).slice(0, 26).padEnd(26)} maps=${k.slice(7, 17).map((x) => (x === "false" ? "-" : "u")).join("")} luzes=${k[36] ?? "?"} sombra=${k[41] ?? "?"} ${String(k[k.length - 1]).replace(/\s+/g, " ").slice(0, 70)}`;
}));
console.log(r.length + " programas");
console.log(r.sort().join("\n"));
await browser.close();
