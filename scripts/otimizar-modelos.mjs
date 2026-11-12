// Prepara os modelos de terceiros para a web: escolhe variante, simplifica, comprime (meshopt + WebP) e grava um GLB por móvel.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsVariants } from "@gltf-transform/extensions";
import { dedup, flatten, join, weld, simplify, prune, textureCompress, meshopt, getBounds, metalRough } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import fs from "node:fs";

await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const saida = new URL("../public/modelos", import.meta.url).pathname;
fs.mkdirSync(saida, { recursive: true });

const lista = [
  { id: "sofa", src: "bruto/GlamVelvetSofa/GlamVelvetSofa.glb", tex: 1024, variante: process.env.VARIANTE ?? "Gray", tom: 0.5 },
  { id: "luminaria", src: "bruto/IridescenceLamp/IridescenceLamp.glb", tex: 512, semTransmissao: true, razao: 0.2, erro: 0.004 },
  { id: "mesa-centro", src: "bruto/coffee_table_round_01/coffee_table_round_01.gltf", tex: 512 },
  { id: "mesa-lateral", src: "bruto/side_table_01/side_table_01.gltf", tex: 512 },
  { id: "aparador", src: "bruto/modern_wooden_cabinet/modern_wooden_cabinet.gltf", tex: 512, razao: 0.3, erro: 0.004 },
  { id: "planta-grande", src: "bruto/potted_plant_02/potted_plant_02.gltf", tex: 512, razao: 0.2, erro: 0.01 },
  { id: "planta-pequena", src: "bruto/potted_plant_04/potted_plant_04.gltf", tex: 512, razao: 0.4, erro: 0.004 },
  { id: "vaso-a", src: "bruto/ceramic_vase_02/ceramic_vase_02.gltf", tex: 256, razao: 0.25 },
  { id: "vaso-b", src: "bruto/ceramic_vase_04/ceramic_vase_04.gltf", tex: 256, razao: 0.25 },
  { id: "sofa-l", src: "sf/sofa-l.glb", tex: 1024, razao: 0.16, erro: 0.004 },
  { id: "cama-casal", src: "sf/cama-casal.glb", tex: 512, razao: 0.13, erro: 0.004 },
  { id: "cama-solteiro", src: "sf/cama-solteiro.glb", tex: 512 },
  { id: "cadeira", src: "sf/cadeira.glb", tex: 512, razao: 0.1, erro: 0.004 },
  { id: "mesa-jantar", src: "sf/mesa-jantar.glb", tex: 512, razao: 0.12, erro: 0.004 },
  { id: "cooktop", src: "sf/cooktop.glb", tex: 512, metalRough: true },
  { id: "chuveiro", src: "sf/chuveiro.glb", tex: 256, metalRough: true },
  { id: "cuba-banho", src: "sf/cuba-banho.glb", tex: 512, metalRough: true },
  { id: "cuba-cozinha", src: "sf/cuba-cozinha.glb", tex: 512, metalRough: true },
  { id: "bacia", src: "sf/bacia.glb", tex: 512, razao: 0.6, erro: 0.003 },
  { id: "geladeira", src: "sf/geladeira.glb", tex: 512 },
  { id: "lavadora", src: "sf/lavadora.glb", tex: 512, razao: 0.6, erro: 0.003, metalRough: true },
].filter((m) => !process.env.SO || process.env.SO.split(",").includes(m.id));
const tri = (doc) => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);
const resumo = fs.existsSync("resumo.json") ? JSON.parse(fs.readFileSync("resumo.json", "utf8")) : {};
for (const m of lista) {
  const doc = await io.read(m.src);
  const antes = { tri: Math.round(tri(doc)), bytes: fs.statSync(m.src).size };
  const root = doc.getRoot();
  const nomes = root.listExtensionsUsed().map((e) => e.extensionName);
  if (m.variante) {
    const vs = root.listExtensionsUsed().find((e) => e.extensionName === "KHR_materials_variants");
    const todas = root.listMeshes().flatMap((x) => x.listPrimitives());
    const disponiveis = new Set();
    for (const p of todas) {
      const mv = p.getExtension("KHR_materials_variants");
      if (!mv) continue;
      for (const map of mv.listMappings()) {
        for (const v of map.listVariants()) { disponiveis.add(v.getName()); if (v.getName().toLowerCase().includes(m.variante.toLowerCase())) p.setMaterial(map.getMaterial()); }
      }
      p.setExtension("KHR_materials_variants", null);
    }
    console.log("  variantes:", [...disponiveis].join(", "), "→", m.variante);
    vs?.dispose();
  }
  if (m.tom) {
    // adaptação: cinza mais fechado (a planta oficial mostra um sofá cinza) e brilho de veludo mais contido
    for (const mat of root.listMaterials()) {
      const sh = mat.getExtension("KHR_materials_sheen");
      if (!sh) continue;
      const c = mat.getBaseColorFactor();
      mat.setBaseColorFactor([c[0] * m.tom, c[1] * m.tom, c[2] * m.tom, c[3]]);
      const k = sh.getSheenColorFactor();
      sh.setSheenColorFactor([k[0] * 0.35, k[1] * 0.35, k[2] * 0.35]);
    }
  }
  if (m.neutro) {
    // adaptação: o estofado laranja do modelo vira um linho cru, na paleta dos renders oficiais (a textura mantém a trama)
    for (const mat of root.listMaterials()) {
      const sh = mat.getExtension("KHR_materials_sheen");
      if (!sh) continue;
      const t = mat.getBaseColorTexture();
      if (t) { t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).grayscale().normalise().tint({ r: m.neutro[0], g: m.neutro[1], b: m.neutro[2] }).png().toBuffer())); t.setMimeType("image/png"); }
      else { mat.setBaseColorFactor([m.neutro[0] / 255, m.neutro[1] / 255, m.neutro[2] / 255, 1]); }
      sh.setSheenColorFactor([0.25, 0.24, 0.22]);
      sh.setSheenColorTexture(null);
    }
  }
  if (m.semTransmissao) {
    // transmissão e iridescência exigem um passe extra de renderização: no celular viram vidro simples
    for (const mat of root.listMaterials()) {
      const t = mat.getExtension("KHR_materials_transmission");
      for (const ext of ["KHR_materials_transmission", "KHR_materials_volume", "KHR_materials_iridescence"]) mat.setExtension(ext, null);
      if (t) { mat.setAlphaMode("BLEND"); const c = mat.getBaseColorFactor(); mat.setBaseColorFactor([c[0], c[1], c[2], 0.35]); mat.setRoughnessFactor(0.05); }
    }
    for (const e of root.listExtensionsUsed()) if (["KHR_materials_transmission", "KHR_materials_volume", "KHR_materials_iridescence"].includes(e.extensionName)) e.dispose();
  }
  if (m.metalRough) await doc.transform(metalRough()); // o three.js atual não lê mais specular-glossiness
  await doc.transform(dedup(), flatten(), join(), weld(), ...(m.razao ? [simplify({ simplifier: MeshoptSimplifier, ratio: m.razao, error: m.erro ?? 0.002 })] : []), prune(), textureCompress({ encoder: sharp, targetFormat: "webp", resize: [m.tex, m.tex], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const b = getBounds(doc.getRoot().listScenes()[0]);
  const arq = `${saida}/${m.id}.glb`;
  await io.write(arq, doc);
  resumo[m.id] = { tri: Math.round(tri(doc)), kb: Math.round(fs.statSync(arq).size / 1024), min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), ext: doc.getRoot().listExtensionsUsed().map((e) => e.extensionName).filter((e) => e.startsWith("KHR_materials")), mats: doc.getRoot().listMaterials().length };
  console.log(m.id, "antes", antes.tri, "tri", Math.round(antes.bytes / 1024), "KB (sem texturas externas) → depois", resumo[m.id].tri, "tri", resumo[m.id].kb, "KB", JSON.stringify(resumo[m.id].min), JSON.stringify(resumo[m.id].max), resumo[m.id].ext.join(","), "| ext originais:", nomes.join(","));
}
fs.writeFileSync("resumo.json", JSON.stringify(resumo, null, 1));
