// Perfil de CPU do carregamento (CPU 4× mais lenta, como um celular intermediário): onde o tempo é gasto.
import { chromium } from "playwright";
const [base, caminho = "/?debug=1&q=medio"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
await cdp.send("Profiler.start");
const t0 = Date.now();
await page.goto(base + caminho);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
const pronto = Date.now() - t0;
await page.waitForTimeout(3000);
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForTimeout(6000);
const medir = (quadros) => page.evaluate((quadros) => { const g = window.__gl; g.info.autoReset = false; return new Promise((ok) => requestAnimationFrame(() => { g.info.reset(); let n = 0; const passo = () => (++n >= quadros ? ok({ chamadas: g.info.render.calls / quadros, triangulos: Math.round(g.info.render.triangles / quadros), texturas: g.info.memory.textures, qualidade: window.__zp.getState().qualidade }) : requestAnimationFrame(passo)); requestAnimationFrame(passo); })); }, quadros);
console.log("exterior no celular, média de 4 quadros:", JSON.stringify(await medir(4)));
const { profile } = await cdp.send("Profiler.stop");
const dt = profile.timeDeltas, ids = profile.samples;
const proprio = new Map();
for (let i = 0; i < ids.length; i++) proprio.set(ids[i], (proprio.get(ids[i]) ?? 0) + dt[i]);
const porFn = new Map();
for (const n of profile.nodes) {
  const nome = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop().slice(0, 28)}:${n.callFrame.lineNumber}`;
  porFn.set(nome, (porFn.get(nome) ?? 0) + (proprio.get(n.id) ?? 0));
}
const total = [...porFn.entries()].filter(([k]) => !k.startsWith("(idle)") && !k.startsWith("(program)")).reduce((s, [, v]) => s + v, 0);
console.log(`pronto em ${(pronto / 1000).toFixed(1)} s; JS ocupado ${(total / 1e6).toFixed(1)} s`);
for (const [k, v] of [...porFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log((v / 1e6).toFixed(2).padStart(6), "s", k);
const partes = await page.evaluate(() => { const out = []; window.__cena.traverseVisible((o) => { if (!o.isMesh) return; const g = o.geometry; const t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); let p = o, nome = o.name; while (!nome && p.parent) { p = p.parent; nome = p.name; } out.push([nome || "?", Math.round(t)]); }); const m = {}; for (const [n, t] of out) m[n] = (m[n] ?? 0) + t; return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 9); });
console.log("triângulos por grupo:", JSON.stringify(partes));
await browser.close();
