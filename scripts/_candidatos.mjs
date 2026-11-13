// Testa enquadramentos candidatos de um apartamento numa só sessão (espera os móveis 3D carregarem).
// uso: node scripts/_candidatos.mjs <base> <unidade> <prefixo> '<[[x,z,ax,ay,az],...]>' [largura] [altura]
import { chromium } from "playwright";
import fs from "node:fs";
const [base, unidade, prefixo, lista, largura = "1100", altura = "700"] = process.argv.slice(2);
const candidatos = JSON.parse(lista);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: Number(largura), height: Number(altura) } });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push("pageerror " + e.message));
await page.goto(`${base}/?debug=1&q=${process.env.Q ?? "medio"}&unidade=${unidade}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
await page.waitForFunction(() => (window.__cena.getObjectByName("moveis_glb")?.children.length ?? 0) >= 3, null, { timeout: 180000 }).catch(() => erros.push("móveis 3D não carregaram"));
await page.waitForTimeout(8000);
const foto = async (nome) => { const cdp = await ctx.newCDPSession(page); const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 78 }); fs.writeFileSync(`/home/claude/capturas/${prefixo}-${nome}.jpg`, Buffer.from(data, "base64")); };
await foto("entrada");
for (const [i, c] of candidatos.entries()) {
  await page.evaluate((c) => window.__enquadrar(...c), c);
  await page.waitForTimeout(3500);
  await foto(`c${i}`);
}
console.log(prefixo, erros.length ? erros.slice(0, 3).join(" | ") : "sem erros");
await browser.close();
