// Captura o enquadramento de cada cômodo de uma unidade (teleporta pelas abas e espera a câmera chegar).
import { chromium } from "playwright";
const [base, unidade, prefixo, celular, so] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(celular ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)); });
await page.goto(`${base}/?debug=1&q=medio&unidade=${unidade}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 150000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 120000 });
const comodos = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="aba-"]')].map((b) => b.dataset.testid.slice(4)));
const fs = await import("node:fs");
for (const c of comodos.filter((x) => !so || so.split(",").includes(x))) {
  await page.evaluate((c) => window.__zp.getState().irComodo(c), c);
  // espera parar de andar
  let ant = "";
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(700);
    const p = await page.evaluate(() => JSON.stringify([window.__pose.x.toFixed(2), window.__pose.z.toFixed(2), window.__pose.guinada.toFixed(2), window.__zp.getState().veu]));
    if (p === ant && i > 2) break;
    ant = p;
  }
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  fs.writeFileSync(`/home/claude/capturas/${prefixo}-${c}.jpg`, Buffer.from(data, "base64"));
  console.log(c, ant);
}
console.log(erros.length ? erros.slice(0, 6).join("\n") : "sem erros no console");
await browser.close();
