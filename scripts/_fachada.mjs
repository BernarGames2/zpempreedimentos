// Capturas do prédio por fora: visão geral (noite e dia), unidade 1301 vista de fora e vista da janela.
// uso: [Q=alto|medio|baixo] node scripts/_fachada.mjs <base> <prefixo> [celular]
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
const parado = (estado) => page.waitForFunction((e) => { const s = window.__zp.getState(); return s.estado === e && !s.emVoo; }, estado, { timeout: 120000 });
await parado("PREDIO");
const foto = async (nome) => { await page.waitForTimeout(3000); const cdp = await ctx.newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 84 }); fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64")); };
await foto("predio-noite");
await page.evaluate(() => window.__zp.getState().set({ noite: false, hora: 15, solTocado: true }));
await foto("predio-dia");
await page.evaluate(() => window.__zp.getState().selecionar("1301"));
await parado("UNIDADE");
await foto("unidade-dia");
await page.evaluate(() => window.__zp.getState().verVista?.());
await page.waitForTimeout(1000);
await page.waitForFunction(() => !window.__zp.getState().emVoo, null, { timeout: 120000 });
await foto("vista-dia");
console.log(prefixo, erros.length ? erros.slice(0, 5).join(" | ") : "sem erros");
await browser.close();
