// Gera um predio.glb de teste (caixas com as malhas nomeadas `unidade_NNNN`) para conferir
// que um modelo real substitui o prédio procedural sem mexer no código.
//   node --experimental-strip-types scripts/modelo-de-teste.mjs            cria modelos-originais/predio.glb
//   node --experimental-strip-types scripts/modelo-de-teste.mjs --apagar   remove o arquivo de teste e o public/models/predio.glb
// Depois: npm run models && npm run build
import { existsSync, readFileSync, rmSync } from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { geoUnidade, P } from "../lib/procedural/predio.ts";

const saida = new URL("../modelos-originais/predio.glb", import.meta.url);
if (process.argv.includes("--apagar")) {
  for (const a of [saida, new URL("../public/models/predio.glb", import.meta.url)]) if (existsSync(a)) rmSync(a);
  console.log("Modelo de teste removido.");
  process.exit(0);
}
const emp = JSON.parse(readFileSync(new URL("../data/empreendimento.json", import.meta.url), "utf8"));
const doc = new Document();
const buffer = doc.createBuffer();
const cena = doc.createScene();
const mat = (nome, cor) => doc.createMaterial(nome).setBaseColorFactor([...cor, 1]).setRoughnessFactor(0.8);
const branco = mat("branco", [0.9, 0.9, 0.88]);
const vidro = mat("vidro", [0.95, 0.75, 0.45]);

function caixa(nome, c, t, material) {
  const [hx, hy, hz] = t.map((v) => v / 2);
  const p = [], n = [], i = [];
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [nx, ny, nz] of faces) {
    const u = nx ? [0, 1, 0] : [1, 0, 0];
    const v = [ny * u[2] - nz * u[1], nz * u[0] - nx * u[2], nx * u[1] - ny * u[0]];
    const b = p.length / 3;
    for (const [a, d] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      p.push(c[0] + (nx + a * u[0] + d * v[0]) * hx, c[1] + (ny + a * u[1] + d * v[1]) * hy, c[2] + (nz + a * u[2] + d * v[2]) * hz);
      n.push(nx, ny, nz);
    }
    i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const prim = doc.createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(n)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(i)).setBuffer(buffer))
    .setMaterial(material);
  cena.addChild(doc.createNode(nome).setMesh(doc.createMesh(nome).addPrimitive(prim)));
}

const topo = P.podio + emp.andares * emp.peDireito;
caixa("torre", [0, (P.podio + topo) / 2, 0], [P.W - 0.4, topo - P.podio, P.D - 0.4], branco);
for (const u of emp.unidades) {
  const g = geoUnidade(u, emp);
  caixa(`unidade_${u.numero}`, g.envolvente.centro, g.envolvente.tamanho.map((v) => Math.max(v, 0.4)), vidro);
}
await new NodeIO().write(saida.pathname, doc);
console.log(`modelos-originais/predio.glb com ${emp.unidades.length} malhas unidade_NNNN.`);
