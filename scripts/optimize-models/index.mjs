// npm run models
// Otimiza os .glb de /modelos-originais e grava em /public/models (mesmo nome e subpastas).
// Etapas (gltf-transform): dedup, prune, weld, compressão meshopt e texturas WebP de no máximo 2048 px.
// Ao final imprime e salva um relatório de tamanho antes/depois.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const origem = path.join(raiz, "modelos-originais");
const destino = path.join(raiz, "public", "models");
const LIMITES_MB = { "predio.glb": 8 }; // metas da seção 12; cada interior: 15 MB

function listar(dir, rel = "") {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((nome) => {
    const cheio = path.join(dir, nome);
    const r = path.join(rel, nome);
    if (statSync(cheio).isDirectory()) return listar(cheio, r);
    return /\.(glb|gltf)$/i.test(nome) ? [r] : [];
  });
}

const arquivos = listar(origem);
if (arquivos.length === 0) {
  console.log("Nenhum .glb em /modelos-originais. Coloque ali o predio.glb, os apto-[tipo].glb e os móveis (moveis/*.glb) e rode de novo.");
  process.exit(0);
}

const mb = (b) => (b / 1024 / 1024).toFixed(2);
const relatorio = [];
for (const rel of arquivos) {
  const entrada = path.join(origem, rel);
  const saida = path.join(destino, rel.replace(/\.gltf$/i, ".glb"));
  mkdirSync(path.dirname(saida), { recursive: true });
  const r = spawnSync(
    "npx",
    ["gltf-transform", "optimize", entrada, saida, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "2048", "--simplify", "false"],
    { cwd: raiz, stdio: ["ignore", "ignore", "inherit"] },
  );
  if (r.status !== 0) {
    console.error(`Falhou: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  const antes = statSync(entrada).size;
  const depois = statSync(saida).size;
  const limite = LIMITES_MB[path.basename(saida)] ?? 15;
  relatorio.push({ arquivo: rel, antesMB: Number(mb(antes)), depoisMB: Number(mb(depois)), reducao: `${(100 - (depois / antes) * 100).toFixed(0)}%`, meta: `< ${limite} MB`, ok: depois / 1024 / 1024 < limite });
}
console.table(relatorio);
writeFileSync(path.join(raiz, "scripts", "optimize-models", "relatorio.json"), `${JSON.stringify(relatorio, null, 2)}\n`);
if (relatorio.some((r) => !r.ok)) console.warn("Atenção: há modelos acima da meta de tamanho. Reduza polígonos ou texturas no Blender.");
