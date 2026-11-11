// Mede as metas da seção 12 que dá para medir sem aparelho real:
// JS inicial (gzip), chamadas de desenho e triângulos do exterior e do interior, e tempo até ficar pronto.
// Precisa do site em http://localhost:3100. FPS real deve ser medido em aparelhos (o Chromium daqui usa GPU por software).
import { chromium } from "playwright";
import { gzipSync } from "node:zlib";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const html = await (await fetch(BASE)).text();
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let inicial = 0;
for (const s of new Set(scripts)) inicial += gzipSync(Buffer.from(await (await fetch(BASE + s)).arrayBuffer())).length;
console.log(`JS inicial (scripts do HTML, gzip): ${(inicial / 1024).toFixed(0)} KB em ${new Set(scripts).size} arquivos`);

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let js3d = 0;
page.on("response", async (r) => {
  if (r.url().endsWith(".js") && !scripts.some((s) => r.url().endsWith(s))) js3d += gzipSync(await r.body().catch(() => Buffer.alloc(0))).length;
});
const t0 = Date.now();
await page.goto(`${BASE}/?debug=1&q=medio`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
console.log(`Cena pronta em ${((Date.now() - t0) / 1000).toFixed(1)} s (GPU por software, sem cache)`);
const info = () => page.evaluate(() => { window.__gl.info.autoReset = false; window.__gl.info.reset(); return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok({ chamadas: window.__gl.info.render.calls, triangulos: window.__gl.info.render.triangles })))); });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PREDIO" && !s.emVoo; }, null, { timeout: 120000 });
await page.waitForTimeout(3000);
console.log("Exterior (nível médio, com pós-processamento):", JSON.stringify(await info()));
await page.evaluate(() => window.__zp.getState().set({ qualidade: "baixo", qualidadeAuto: false }));
await page.waitForTimeout(4000);
console.log("Exterior (nível baixo, sem pós-processamento):", JSON.stringify(await info()));
console.log(`JS do 3D sob demanda (gzip): ${(js3d / 1024).toFixed(0)} KB`);
await browser.close();
