// Gera o comparativo 3D x render oficial (lado a lado) em docs/comparativo/.
// Precisa do site rodando em http://localhost:3100 (npm run build && npx next start -p 3100).
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CENAS = [
  { nome: "01-fachada", ref: "public/referencias/01-fachada-esquina.png", url: "/?debug=1&q=alto", larg: 800, alt: 1000, predio: true },
  { nome: "03-sala", ref: "public/referencias/03-sala-varanda.png", url: "/?debug=1&q=alto&unidade=1202&comodo=sala", larg: 1080, alt: 608 },
  { nome: "05-quarto", ref: "public/referencias/05-quarto.png", url: "/?debug=1&q=alto&unidade=1202&comodo=quarto", larg: 800, alt: 1000 },
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const c of CENAS) {
  const page = await browser.newPage({ viewport: { width: c.larg, height: c.alt }, deviceScaleFactor: 1 });
  await page.goto(BASE + c.url);
  await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
  await page.addStyleTag({ content: "header, #experiencia > *:not([data-testid=canvas-3d]) { display: none !important; }" });
  if (c.predio) await page.evaluate(() => { const s = window.__zp.getState(); s.set({ mostrarStatus: false }); s.pularIntro(); });
  await page.waitForFunction((predio) => { const s = window.__zp.getState(); return s.estado === (predio ? "PREDIO" : "PASSEIO") && !s.emVoo && !s.veu; }, c.predio ?? false, { timeout: 240000 });
  await page.waitForTimeout(c.predio ? 15000 : 25000);
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  await page.close();
  const A = 720;
  const esq = await sharp(Buffer.from(data, "base64")).resize({ height: A }).toBuffer({ resolveWithObject: true });
  const dir = await sharp(c.ref).resize({ height: A }).toBuffer({ resolveWithObject: true });
  const faixa = 44;
  const larg = esq.info.width + dir.info.width + 12;
  const legenda = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${larg}" height="${faixa}"><rect width="100%" height="100%" fill="#141824"/>
    <text x="${esq.info.width / 2}" y="29" fill="#eef0f4" font-family="sans-serif" font-size="18" text-anchor="middle">3D do site (tempo real)</text>
    <text x="${esq.info.width + 12 + dir.info.width / 2}" y="29" fill="#e8a94e" font-family="sans-serif" font-size="18" text-anchor="middle">Render oficial</text></svg>`);
  await sharp({ create: { width: larg, height: A + faixa, channels: 3, background: "#141824" } })
    .composite([{ input: legenda, top: 0, left: 0 }, { input: esq.data, top: faixa, left: 0 }, { input: dir.data, top: faixa, left: esq.info.width + 12 }])
    .jpeg({ quality: 86 })
    .toFile(`docs/comparativo/${c.nome}.jpg`);
  console.log(`docs/comparativo/${c.nome}.jpg`);
}
await browser.close();
