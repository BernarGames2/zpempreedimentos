// Capturas de um apartamento qualquer: cômodo de entrada e todos os cômodos em sequência (1 foto cada).
// uso: [Q=medio] node scripts/_unidade.mjs <base> <unidade> <prefixo> [max]
import { chromium } from "playwright";
import fs from "node:fs";
const [base, unidade, prefixo, max = "3"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror " + e.message));
await page.goto(`${base}/?debug=1&q=${process.env.Q ?? "medio"}&unidade=${unidade}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
await page.waitForTimeout(6000);
const comodos = await page.evaluate(() => [...document.querySelectorAll("[data-testid^='aba-']")].map((b) => b.getAttribute("data-testid").slice(4)));
const lista = [null, ...comodos.slice(1, Number(max))];
const foto = async (nome) => { await page.waitForTimeout(5000); const cdp = await ctx.newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 80 }); fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64")); };
for (const c of lista) {
  if (c) {
    await page.evaluate((id) => window.__zp.getState().irComodo(id), c);
    await page.waitForFunction(() => { const s = window.__zp.getState(); return !s.emVoo && !s.veu; }, null, { timeout: 120000 });
  }
  await foto(c ?? "entrada");
}
console.log(prefixo, JSON.stringify(comodos), erros.length ? erros.slice(0, 3).join(" | ") : "sem erros");
await browser.close();
