// Diagnóstico da sonda de reflexo do piso: quantas fotos e o brilho médio de uma face.
import { chromium } from "playwright";
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage();
page.on("pageerror", (e) => console.log("ERRO", e.message));
page.on("console", (m) => { if (m.type() === "error" || /feedback|GL_INVALID/i.test(m.text())) console.log("CONSOLE", m.text().slice(0, 200)); });
await page.goto(`${base}/?debug=1&q=medio&unidade=1301&comodo=living`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 240000 });
await page.waitForTimeout(6000);
console.log(await page.evaluate(() => {
  const piso = window.__cena.getObjectByName("comodo_living")?.material;
  const sonda = piso?.userData?.sonda;
  if (!sonda) return "sem sonda";
  const gl = window.__gl;
  const px = new Uint16Array(4 * 16 * 16);
  const meio = (h) => { const e = (h >> 10) & 31, m = h & 1023; return e === 0 ? m / 16777216 : e === 31 ? 0 : Math.pow(2, e - 15) * (1 + m / 1024); };
  const rt = sonda.rt;
  // lê um pedaço de cada face
  const medias = [];
  for (let f = 0; f < 6; f++) {
    try { gl.readRenderTargetPixels(rt, 56, 56, 16, 16, px, f); } catch (e) { return "erro leitura " + e.message; }
    let s = 0; for (let i = 0; i < px.length; i += 4) s += meio(px[i]) + meio(px[i + 1]) + meio(px[i + 2]);
    medias.push((s / (px.length / 4) / 3).toFixed(3));
  }
  return JSON.stringify({ fotos: sonda.fotos, centro: sonda.centro, min: sonda.caixaMin, max: sonda.caixaMax, envMap: Boolean(piso.envMap), medias });
}));
await browser.close();
