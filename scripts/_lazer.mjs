// Capturas da área de lazer nos enquadramentos de apresentação (noite, que é o padrão do site, e dia).
import { chromium } from "playwright";
import fs from "node:fs";
const [base, prefixo, celular] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(celular ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)); });
await page.goto(`${base}/?debug=1&q=${process.env.Q ?? "medio"}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 180000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PREDIO" && !s.emVoo; }, null, { timeout: 120000 });
const foto = async (nome) => { const cdp = await ctx.newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82 }); fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64")); };
const ir = async (id) => {
  await page.evaluate((id) => window.__zp.getState().abrirLazer(id), id);
  await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "LAZER" && !s.emVoo; }, null, { timeout: 120000 });
  await page.waitForTimeout(3500);
};
for (const id of ["piscina", "quadra", "playground"]) { await ir(id); await foto(`${id}-noite`); }
await page.evaluate(() => window.__zp.getState().set({ noite: false, hora: 15, solTocado: true }));
for (const id of ["piscina", "playground"]) { await ir(id); await page.waitForTimeout(1500); await foto(`${id}-dia`); }
const info = await page.evaluate(() => { const g = window.__gl; g.info.autoReset = false; return new Promise((ok) => requestAnimationFrame(() => { g.info.reset(); requestAnimationFrame(() => ok({ chamadas: g.info.render.calls, triangulos: g.info.render.triangles })); })); });
console.log(JSON.stringify(info), erros.length ? erros.slice(0, 5).join(" | ") : "sem erros");
await browser.close();
