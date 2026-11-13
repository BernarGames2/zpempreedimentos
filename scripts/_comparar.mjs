// Capturas de enquadramento fixo na 1301, com móveis novos (GLB) e antigos (?moveis=antigos).
import { chromium } from "playwright";
import fs from "node:fs";
const [base, prefixo, extra = ""] = process.argv.slice(2);
const vistas = { cozinha: [3.0, 9.0, 6.6, 0.9, 9.9], banho: [4.75, 1.55, 3.8, 0.9, 0.4], circ: [4.6, 5.3, 4.6, 1.3, 2.2], sofa: [4.5, 7.9, 7.3, 0.55, 6.3], estar: [8.2, 7.6, 5.9, 0.5, 6.5], aparador: [5.6, 6.9, 6.6, 0.6, 8.4], varanda: [2.0, 8.2, 0.4, 0.6, 5.9], suite: [7.6, 3.1, 5.6, 0.5, 5.2], dorm1: [3.2, 3.9, 1.3, 0.5, 4.6] };
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)); });
let bytes = 0; const arquivos = new Set();
page.on("response", async (r) => { if (r.url().includes("/modelos/")) { arquivos.add(r.url().split("/").pop()); try { bytes += (await r.body()).length; } catch {} } });
await page.goto(`${base}/?debug=1&q=${process.env.Q ?? "medio"}&unidade=1301${extra}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 150000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 120000 });
await page.waitForTimeout(6000);
await page.addStyleTag({ content: "header, [data-testid='botoes-passeio'], [data-testid='minimapa'], [data-testid='abas-comodos'], [data-testid='dica-passeio'], [data-testid='selo-proposta'], .vidro, .btn { display: none !important; }" });
for (const [nome, v] of Object.entries(vistas)) {
  await page.evaluate((v) => window.__enquadrar(...v), v);
  await page.waitForTimeout(3500);
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 86 });
  fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64"));
}
const info = await page.evaluate(() => { window.__gl.info.autoReset = false; window.__gl.info.reset(); return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok({ chamadas: window.__gl.info.render.calls, triangulos: window.__gl.info.render.triangles, texturas: window.__gl.info.memory.textures, geometrias: window.__gl.info.memory.geometries })))); });
console.log(JSON.stringify({ modelos: [...arquivos], kb: Math.round(bytes / 1024), info }), erros.length ? erros.slice(0, 4).join("\n") : "sem erros");
await browser.close();
