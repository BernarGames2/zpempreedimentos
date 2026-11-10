// Captura os cinco cômodos do passeio em sequência (revisão visual).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const [unidade = "1202", q = "medio", larg = "1440", alt = "900", prefixo = "f3"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: Number(larg), height: Number(alt) } });
page.on("console", (m) => { if (m.type() === "error") console.log("[erro]", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const foto = async (nome) => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tests/capturas/${prefixo}-${nome}.png`, Buffer.from(data, "base64"));
  await cdp.detach();
};
await page.goto(`http://localhost:3100/?debug=1&q=${q}&unidade=${unidade}&comodo=sala`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 120000 });
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.veu && !s.emVoo; }, null, { timeout: 60000 });
await page.waitForTimeout(9000);
await foto("sala");
for (const c of ["quarto", "banheiro", "varanda", "cozinha"]) {
  await page.evaluate((id) => window.__zp.getState().irComodo(id), c);
  await page.waitForTimeout(13000);
  await foto(c);
}
await page.evaluate(() => window.__zp.getState().maquete());
await page.waitForTimeout(8000);
await foto("maquete");
await browser.close();
