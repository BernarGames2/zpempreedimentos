// Captura de tela avulsa para revisar o 3D durante o desenvolvimento.
// uso: node scripts/captura.mjs <url> <arquivo.png> [largura] [altura] [esperaMs] [js a executar antes]
import { chromium } from "playwright";

const [url, arquivo, larg = "1440", alt = "900", espera = "6000", acao = ""] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: Number(larg), height: Number(alt) }, deviceScaleFactor: 1 });
const erros = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") erros.push(`[${m.type()}] ${m.text().slice(0, 400)}`); });
page.on("pageerror", (e) => erros.push(`[pageerror] ${e.message}\n${(e.stack || "").split("\n").slice(0, 6).join("\n")}`));
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 120000 }).catch(() => erros.push("timeout esperando pronto"));
if (acao) await page.evaluate(acao);
await page.waitForTimeout(Number(espera));
// O render por software é lento: a captura via CDP não espera o próximo quadro.
const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
(await import("node:fs")).writeFileSync(arquivo, Buffer.from(data, "base64"));
console.log([...new Set(erros)].slice(0, 12).join("\n") || "sem erros no console");
await browser.close();
