// Mostra quais shaders são compilados na hora de entrar no apartamento e o que mudou na chave de cada um
// (comparado ao programa mais parecido que já existia). Uso: ESPERA=ms Q=alto node scripts/_diag-shaders.mjs <base>
import { chromium } from "playwright";
const [base] = process.argv.slice(2);
const q = process.env.Q ? `&q=${process.env.Q}` : "";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on("console", (m) => { if (/PREAQ/.test(m.text())) console.log(m.text()); });
await page.goto(`${base}/?debug=1&unidade=1301${q}`);
await page.waitForFunction(() => window.__zp?.getState().pronto === true, null, { timeout: 240000 });
await page.evaluate(() => window.__zp.getState().pularIntro());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "UNIDADE" && !s.emVoo; }, null, { timeout: 120000 });
await page.waitForTimeout(Number(process.env.ESPERA ?? 9000));
await page.evaluate(() => { window.__antes = new Set(window.__gl.info.programs.map((p) => p.cacheKey)); window.__antesNome = window.__gl.info.programs.map((p) => [p.name, p.cacheKey]); window.__moveis = window.__cena.getObjectByName("moveis_glb")?.children.length; });
console.log("moveis antes de entrar:", await page.evaluate(() => window.__moveis));
await page.evaluate(() => window.__zp.getState().entrar());
await page.waitForFunction(() => { const s = window.__zp.getState(); return s.estado === "PASSEIO" && !s.emVoo && !s.veu; }, null, { timeout: 180000 });
await page.waitForTimeout(4000);
const r = await page.evaluate(() => {
  const ps = window.__gl.info.programs;
  const antes = [...window.__antes];
  const novos = ps.filter((p) => !window.__antes.has(p.cacheKey));
  return novos.map((p) => {
    const k = p.cacheKey.split(",");
    // programa antigo com o mesmo nome e mais partes iguais
    let melhor = null, iguais = -1;
    const mesmos = window.__antesNome.filter(([n]) => n === p.name && n !== "").map(([, c]) => c);
    for (const a of (mesmos.length ? mesmos : antes)) { const ka = a.split(","); if (ka.length !== k.length) continue; let n = 0; for (let i = 0; i < k.length; i++) if (ka[i] === k[i]) n++; if (n > iguais) { iguais = n; melhor = ka; } }
    const dif = melhor ? k.map((v, i) => (v !== melhor[i] ? `${i}:${String(melhor[i]).slice(0, 30)}→${String(v).slice(0, 30)}` : null)).filter(Boolean).slice(0, 6) : ["(sem par)"];
    return `${p.name} [${mesmos.length ? "mesmo nome" : "outro"}] | ${dif.join(" ; ")}`;
  });
});
console.log(r.join("\n"));
await browser.close();
