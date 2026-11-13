// Capturas do apartamento 1301 de dia (living e suíte), para comparar com os renders oficiais.
// uso: [Q=alto|medio] node scripts/_interior.mjs <base> <prefixo>
import { chromium } from "playwright";
import fs from "node:fs";
const [base, prefixo] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror " + e.message));
await page.goto(`${base}/?debug=1&q=${process.env.Q ?? "medio"}&unidade=1301&comodo=living`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 240000 });
await page.waitForFunction(() => (window.__cena.getObjectByName("moveis_glb")?.children.length ?? 0) >= 10, null, { timeout: 180000 });
const foto = async (nome) => { await page.waitForTimeout(7000); const cdp = await ctx.newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 84 }); fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64")); };
await foto("living");
await page.evaluate(() => window.__zp.getState().irComodo("suite"));
await page.waitForFunction(() => { const s = window.__zp.getState(); return !s.emVoo && !s.veu; }, null, { timeout: 120000 });
await foto("suite");
console.log(prefixo, erros.length ? erros.slice(0, 5).join(" | ") : "sem erros");
await browser.close();
