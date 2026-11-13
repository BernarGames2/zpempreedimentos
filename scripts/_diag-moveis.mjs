// Lista os móveis 3D carregados num apartamento (posição e tamanho de cada um).
import { chromium } from "playwright";
const [base, unidade] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage();
page.on("pageerror", (e) => console.log("ERRO", e.message.slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.text().slice(0, 200)); });
await page.goto(`${base}/?debug=1&q=medio&unidade=${unidade}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
await page.waitForFunction(() => (window.__cena.getObjectByName("moveis_glb")?.children.length ?? 0) >= 3, null, { timeout: 180000 }).catch(() => undefined);
await page.waitForTimeout(5000);
console.log(await page.evaluate(() => {
  const g = window.__cena.getObjectByName("moveis_glb");
  if (!g) return "sem moveis_glb";
  const T = g.children[0]?.constructor;
  const out = [];
  for (const c of g.children) {
    let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    c.updateMatrixWorld(true);
    c.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); min = [Math.min(min[0], b.min.x), Math.min(min[1], b.min.y), Math.min(min[2], b.min.z)]; max = [Math.max(max[0], b.max.x), Math.max(max[1], b.max.y), Math.max(max[2], b.max.z)]; } });
    out.push(`${c.position.toArray().map((v) => v.toFixed(2))} → x ${min[0].toFixed(2)}..${max[0].toFixed(2)} y ${min[1].toFixed(2)}..${max[1].toFixed(2)} z ${min[2].toFixed(2)}..${max[2].toFixed(2)}`);
  }
  return out.length + " móveis\n" + out.join("\n");
}));
await browser.close();
