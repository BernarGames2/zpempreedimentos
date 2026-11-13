// Diagnóstico de tela preta ao entrar numa unidade.
import { chromium } from "playwright";
import fs from "node:fs";
const [base, unidade] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("ERRO", e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.type(), m.text().slice(0, 200)); });
await page.goto(`${base}/?debug=1&q=medio&unidade=${unidade}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(4000);
  console.log(await page.evaluate(() => {
    const gl = window.__gl; const cam = window.__zp && window.__cena;
    let camera = null; window.__cena.traverse((o) => { if (o.isCamera && !camera && o.type === "PerspectiveCamera" && !o.parent?.isCubeCamera) camera = o; });
    const rt = gl.getRenderTarget();
    const s = window.__zp.getState();
    return JSON.stringify({ frame: gl.info.render.frame, rt: rt ? rt.constructor.name + " " + rt.width : null, cena: s.cena, estado: s.estado, comodo: s.comodoAtual, veu: s.veu, pose: typeof window.__pose === "function" ? "fn" : String(Boolean(window.__pose)) });
  }));
}
const cdp = await ctx.newCDPSession(page);
{ const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 70 }); fs.writeFileSync(`/home/claude/capturas/diag-preto-${unidade}-a.jpg`, Buffer.from(data, "base64")); }
console.log("desligando a sonda:", await page.evaluate(() => { let n = 0; window.__cena.traverse((o) => { const s = o.material?.userData?.sonda; if (s) { s.forca.value = 0; n++; } }); return n; }));
await page.waitForTimeout(5000);
const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 70 });
fs.writeFileSync(`/home/claude/capturas/diag-preto-${unidade}.jpg`, Buffer.from(data, "base64"));
await browser.close();
