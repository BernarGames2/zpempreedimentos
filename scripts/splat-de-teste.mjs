// Gera um splat sintético (uma "sala" colorida) e um colisor para testar o caminho Spark
// antes de os arquivos reais do Marble chegarem.
//   node scripts/splat-de-teste.mjs          cria public/splats/sala.splat e sala-collider.glb
//   node scripts/splat-de-teste.mjs --apagar remove os arquivos de teste
// Depois rode `npm run build` (ou `npm run dev`): o site passa a mostrar a sala e a cozinha por splat.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";

const dir = new URL("../public/splats/", import.meta.url);
const arqSplat = new URL("sala.splat", dir);
const arqColisor = new URL("sala-collider.glb", dir);

if (process.argv.includes("--apagar")) {
  for (const a of [arqSplat, arqColisor]) if (existsSync(a)) rmSync(a);
  console.log("Arquivos de teste removidos.");
  process.exit(0);
}

mkdirSync(dir, { recursive: true });
// Sala de 4 x 2,6 x 4 m em volta do ponto de captura (origem), no padrão OpenCV (Y para baixo).
const L = 2, A = 1.6, CHAO = 1.6, TETO = -1.0;
const pontos = [];
let s = 7;
const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const por = (n, f) => { for (let i = 0; i < n; i++) pontos.push(f()); };
por(30000, () => { const x = (r() * 2 - 1) * L, z = (r() * 2 - 1) * L; const q = (Math.floor(x * 1.25 + 9) + Math.floor(z * 1.25 + 9)) % 2; return [x, CHAO, z, q ? [190, 188, 182] : [160, 158, 152]]; });
por(14000, () => [(r() * 2 - 1) * L, TETO, (r() * 2 - 1) * L, [236, 234, 228]]);
por(20000, () => { const y = TETO + r() * (CHAO - TETO); const z = (r() * 2 - 1) * L; return [-L, y, z, y < 0.9 && y > -0.6 ? [170, 125, 85] : [70, 70, 76]]; });
por(20000, () => [L, TETO + r() * (CHAO - TETO), (r() * 2 - 1) * L, [58, 59, 64]]);
por(20000, () => { const x = (r() * 2 - 1) * L; const y = TETO + r() * (CHAO - TETO); return [x, y, -L, Math.abs(x) < 0.8 && y < 0.6 ? [40, 110, 50] : [150, 110, 76]]; });
por(20000, () => [(r() * 2 - 1) * L, TETO + r() * (CHAO - TETO), L, [66, 66, 72]]);
void A;

const buf = Buffer.alloc(pontos.length * 32);
pontos.forEach(([x, y, z, c], i) => {
  const o = i * 32;
  buf.writeFloatLE(x, o); buf.writeFloatLE(y, o + 4); buf.writeFloatLE(z, o + 8);
  for (let k = 0; k < 3; k++) buf.writeFloatLE(0.022, o + 12 + k * 4);
  buf[o + 24] = c[0]; buf[o + 25] = c[1]; buf[o + 26] = c[2]; buf[o + 27] = 255;
  buf[o + 28] = 255; buf[o + 29] = 128; buf[o + 30] = 128; buf[o + 31] = 128; // quaternion identidade
});
writeFileSync(arqSplat, buf);

// Colisor: as quatro paredes e o piso da mesma sala.
const doc = new Document();
const buffer = doc.createBuffer();
const pos = [], idx = [];
const quad = (a, b, c, d) => { const n = pos.length / 3; pos.push(...a, ...b, ...c, ...d); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
quad([-L, CHAO, -L], [L, CHAO, -L], [L, CHAO, L], [-L, CHAO, L]);
quad([-L, TETO, -L], [-L, CHAO, -L], [-L, CHAO, L], [-L, TETO, L]);
quad([L, TETO, -L], [L, CHAO, -L], [L, CHAO, L], [L, TETO, L]);
quad([-L, TETO, -L], [L, TETO, -L], [L, CHAO, -L], [-L, CHAO, -L]);
quad([-L, TETO, L], [L, TETO, L], [L, CHAO, L], [-L, CHAO, L]);
const prim = doc.createPrimitive()
  .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(idx)).setBuffer(buffer));
doc.createScene().addChild(doc.createNode("colisor").setMesh(doc.createMesh("colisor").addPrimitive(prim)));
await new NodeIO().write(arqColisor.pathname, doc);
console.log(`Gerados ${pontos.length} splats em public/splats/sala.splat e o colisor sala-collider.glb.`);
