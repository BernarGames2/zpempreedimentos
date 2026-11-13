// Mede o custo de entrar no apartamento: shaders compilados na hora, maior travada de quadro e tempo total.
// Uso: node scripts/_entrada.mjs <base> [consulta extra]   (ex.: Q=alto node scripts/_entrada.mjs http://127.0.0.1:3100)
import { chromium } from "playwright";
const [base, extra = ""] = process.argv.slice(2);
const q = process.env.Q ? `&q=${process.env.Q}` : "";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
// conta cada shader ligado (linkProgram) desde o início: é o que trava o celular
await ctx.addInitScript(() => {
  window.__links = 0;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const orig = C.prototype.linkProgram;
    C.prototype.linkProgram = function (p) { window.__links++; return orig.call(this, p); };
  }
});
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(e.message));
const t0 = Date.now();
await page.goto(`${base}/?debug=1&unidade=1301${q}${extra}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
const tPronto = (Date.now() - t0) / 1000;
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
// tempo de "leitura da ficha" antes de tocar em Entrar (o pré-aquecimento roda aqui)
await page.waitForTimeout(Number(process.env.ESPERA ?? 8000));
const antes = await page.evaluate(() => ({ prog: window.__links, q: window.__zp.getState().qualidade }));
await page.evaluate(() => {
  window.__quadros = [];
  let ult = performance.now();
  const passo = (t) => { window.__quadros.push(t - ult); ult = t; if (window.__quadros.length < 100000) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
});
const t1 = Date.now();
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
await page.waitForFunction(() => (window.__cena.getObjectByName("moveis_glb")?.children.length ?? 0) >= 10, null, { timeout: 180000 });
const tDentro = (Date.now() - t1) / 1000;
await page.waitForTimeout(3000);
const depois = await page.evaluate(() => {
  const qd = window.__quadros.slice(1);
  const ord = [...qd].sort((a, b) => b - a);
  const fim = qd.slice(-20).sort((a, b) => a - b);
  return { prog: window.__links, maior: Math.round(ord[0] ?? 0), top3: ord.slice(0, 3).map(Math.round), quadros: qd.length, medianaFinal: Math.round(fim[Math.floor(fim.length / 2)] ?? 0), luzes: (() => { let n = 0; window.__cena.traverseVisible((o) => { if (o.isPointLight) n++; }); return n; })() };
});
console.log(JSON.stringify({ base, q: antes.q, prontoS: tPronto, entrarS: tDentro, shadersAntes: antes.prog, shadersDepois: depois.prog, shadersAoEntrar: depois.prog - antes.prog, maiorQuadroMs: depois.maior, top3: depois.top3, quadroNormalMs: depois.medianaFinal, luzesPontuais: depois.luzes, erros }));
await browser.close();
