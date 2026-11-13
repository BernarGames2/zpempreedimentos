// Tempo médio de quadro no exterior (desktop 1440×900, q=medio) — compara versões. Uso: node scripts/_quadro.mjs <base>
import { chromium } from "playwright";
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${base}/?debug=1&q=medio`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForTimeout(15000);
const r = await page.evaluate(() => new Promise((ok) => { const qs = []; let u = performance.now(); const p = (t) => { qs.push(t - u); u = t; if (qs.length < 12) requestAnimationFrame(p); else ok(qs); }; requestAnimationFrame(p); }));
const info = await page.evaluate(() => ({ dpr: window.__gl.getPixelRatio(), calls: window.__gl.info.render.calls, tri: window.__gl.info.render.triangles, prog: window.__gl.info.programs.length, luzes: (() => { let n = 0; window.__cena.traverse((o) => { if (o.isLight) n++; }); return n; })() }));
const s = r.slice(2).sort((a, b) => a - b);
console.log(JSON.stringify({ base, medianaMs: Math.round(s[Math.floor(s.length / 2)]), ...info }));
await browser.close();
