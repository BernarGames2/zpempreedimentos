/**
 * Assa o mapa de luz de cada planta: oclusão de ambiente texel a texel (~3 cm) em paredes, revestimentos,
 * pisos e forros. É o que dá sombra de contato embaixo e atrás dos móveis e escurece cantos e encontros,
 * como numa foto. Complementa o volume de luz (scripts/assar-luz.ts), que cuida da luz das janelas em
 * escala de cômodo. Saída: public/luz/<tipo>-mapa.webp (tons de cinza; PNG se faltar o Pillow) e <tipo>-mapa.json (atlas).
 * Uso: npx tsx scripts/assar-mapa.ts [tipo]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import zlib from "node:zlib";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { emp, temInterior } from "../lib/dados";
import { acabamentos } from "../lib/procedural/acabamento";
import { BORDA_MAPA, MATS_MAPA, facesCaixa, retalhoComodo, type Retalho, type V3 } from "../lib/procedural/mapaLuz";
import { mobiliar, type Modelo, type Prim } from "../lib/procedural/mobilia";
import { PE_LIVRE, limitesPlanta, montarPlanta } from "../lib/procedural/planta";

const ALCANCE = 0.8; // até onde um obstáculo escurece (m)
const RAIOS = 72;
const LARG = 1024;
const CEL = 0.5; // grade de aceleração em planta (m)
const so = process.argv[2];

// direções no hemisfério com peso de cosseno (espiral áurea no disco)
const disco: [number, number, number][] = [];
for (let i = 0; i < RAIOS; i++) {
  const r = Math.sqrt((i + 0.5) / RAIOS);
  const a = i * 2.399963229728653;
  disco.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(Math.max(0, 1 - r * r))]);
}

/** Caixa que envolve o prim (com giro, se houver). */
function aabb(p: Prim): [number, number, number, number, number, number] {
  const [w, h, d] = p.forma === "cilindro" ? [p.tam[0], p.tam[1], p.tam[0]] : p.forma === "esfera" ? [p.tam[0], p.tam[0], p.tam[0]] : p.tam;
  if (!p.rot) return [p.pos[0] - w / 2, p.pos[1] - h / 2, p.pos[2] - d / 2, p.pos[0] + w / 2, p.pos[1] + h / 2, p.pos[2] + d / 2];
  const [a, b, c] = p.rot;
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  // matriz da Euler XYZ do three
  const m = [cb * cc, -cb * sc, sb, ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb, sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb] as const;
  const ex = Math.abs(m[0]) * w / 2 + Math.abs(m[1]) * h / 2 + Math.abs(m[2]) * d / 2;
  const ey = Math.abs(m[3]) * w / 2 + Math.abs(m[4]) * h / 2 + Math.abs(m[5]) * d / 2;
  const ez = Math.abs(m[6]) * w / 2 + Math.abs(m[7]) * h / 2 + Math.abs(m[8]) * d / 2;
  return [p.pos[0] - ex, p.pos[1] - ey, p.pos[2] - ez, p.pos[0] + ex, p.pos[1] + ey, p.pos[2] + ez];
}

function dentroPoligono(poli: [number, number][], x: number, z: number): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i] as [number, number];
    const [xj, zj] = poli[j] as [number, number];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** PNG em tons de cinza (8 bits), com o filtro de linha que comprimir melhor: sem dependência externa. */
function pngCinza(w: number, h: number, px: Uint8Array): Buffer {
  const linhas = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    const ini = y * w;
    let melhor = 0, custo = Infinity;
    for (const f of [0, 1, 2]) {
      let c = 0;
      for (let x = 0; x < w; x++) {
        const v = px[ini + x]!;
        const ref = f === 1 ? (x ? px[ini + x - 1]! : 0) : f === 2 ? (y ? px[ini - w + x]! : 0) : 0;
        const d = (v - ref) & 255;
        c += d < 128 ? d : 256 - d;
      }
      if (c < custo) { custo = c; melhor = f; }
    }
    linhas[y * (w + 1)] = melhor;
    for (let x = 0; x < w; x++) {
      const v = px[ini + x]!;
      const ref = melhor === 1 ? (x ? px[ini + x - 1]! : 0) : melhor === 2 ? (y ? px[ini - w + x]! : 0) : 0;
      linhas[y * (w + 1) + 1 + x] = (v - ref) & 255;
    }
  }
  const bloco = (tipo: string, dados: Buffer) => {
    const t = Buffer.from(tipo, "ascii");
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, dados])) >>> 0);
    return Buffer.concat([tam, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 0; // tons de cinza
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco("IHDR", ihdr), bloco("IDAT", zlib.deflateSync(linhas, { level: 9 })), bloco("IEND", Buffer.alloc(0))]);
}

/** Triângulos de um modelo .glb (meshopt + quantização), no espaço da cena do arquivo. */
const cacheGlb = new Map<string, THREE.BufferGeometry>();
function triangulosGlb(id: string): THREE.BufferGeometry {
  const pronto = cacheGlb.get(id);
  if (pronto) return pronto;
  const b = fs.readFileSync(path.join("public", "modelos", `${id}.glb`));
  const jl = b.readUInt32LE(12);
  const j = JSON.parse(b.subarray(20, 20 + jl).toString());
  const bin = b.subarray(28 + jl, 28 + jl + b.readUInt32LE(20 + jl));
  const vistas = new Map<number, Uint8Array>();
  const vista = (i: number): Uint8Array => {
    const v = vistas.get(i);
    if (v) return v;
    const bv = j.bufferViews[i];
    const ext = bv.extensions?.EXT_meshopt_compression;
    let out: Uint8Array;
    if (ext) {
      out = new Uint8Array(ext.count * ext.byteStride);
      const ini = ext.byteOffset ?? 0;
      MeshoptDecoder.decodeGltfBuffer(out, ext.count, ext.byteStride, bin.subarray(ini, ini + ext.byteLength), ext.mode, ext.filter ?? "NONE");
    } else out = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    vistas.set(i, out);
    return out;
  };
  const ler = (ai: number): number[] => {
    const a = j.accessors[ai];
    const bv = j.bufferViews[a.bufferView];
    const dados = vista(a.bufferView);
    const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
    const comp = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type]!;
    const tam = ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[a.componentType]!;
    const passo = bv.byteStride ?? (bv.extensions?.EXT_meshopt_compression?.byteStride && bv.extensions.EXT_meshopt_compression.mode === "ATTRIBUTES" ? bv.extensions.EXT_meshopt_compression.byteStride : comp * tam);
    const out: number[] = [];
    for (let i = 0; i < a.count; i++) for (let c = 0; c < comp; c++) {
      const o = (a.byteOffset ?? 0) + i * passo + c * tam;
      let v: number;
      switch (a.componentType) {
        case 5120: v = dv.getInt8(o); if (a.normalized) v = Math.max(v / 127, -1); break;
        case 5121: v = dv.getUint8(o); if (a.normalized) v /= 255; break;
        case 5122: v = dv.getInt16(o, true); if (a.normalized) v = Math.max(v / 32767, -1); break;
        case 5123: v = dv.getUint16(o, true); if (a.normalized) v /= 65535; break;
        case 5125: v = dv.getUint32(o, true); break;
        default: v = dv.getFloat32(o, true);
      }
      out.push(v);
    }
    return out;
  };
  const pos: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  const visitar = (ni: number, pai: THREE.Matrix4) => {
    const n = j.nodes[ni];
    const m = new THREE.Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else m.compose(new THREE.Vector3(...(n.translation ?? [0, 0, 0])), new THREE.Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(n.scale ?? [1, 1, 1])));
    const mundo = pai.clone().multiply(m);
    if (n.mesh != null) for (const pr of j.meshes[n.mesh].primitives) {
      if (pr.mode != null && pr.mode !== 4) continue;
      const p = ler(pr.attributes.POSITION);
      const base = pos.length / 3;
      for (let i = 0; i < p.length; i += 3) {
        v.set(p[i]!, p[i + 1]!, p[i + 2]!).applyMatrix4(mundo);
        pos.push(v.x, v.y, v.z);
      }
      const ii = pr.indices != null ? ler(pr.indices) : [...Array(p.length / 3).keys()];
      for (const k of ii) idx.push(base + k);
    }
    for (const c of n.children ?? []) visitar(c, mundo);
  };
  for (const r of j.scenes[j.scene ?? 0].nodes) visitar(r, new THREE.Matrix4());
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  cacheGlb.set(id, g);
  return g;
}

/** Modelo posto na planta, com BVH para os raios e a caixa que o envolve. */
function modeloNoMundo(m: Modelo): { bvh: MeshBVH; caixa: THREE.Box3 } {
  const g = triangulosGlb(m.id).clone();
  const e = m.escala ?? [1, 1, 1];
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...m.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), m.rotY ?? 0), new THREE.Vector3(...e)));
  g.computeBoundingBox();
  return { bvh: new MeshBVH(g), caixa: g.boundingBox!.clone() };
}

fs.mkdirSync(path.join("public", "luz"), { recursive: true });
async function principal(): Promise<void> {
await MeshoptDecoder.ready;
for (const t of emp.tipos) {
  if (!temInterior(t) || (so && t.id !== so)) continue;
  const inicio = Date.now();
  const planta = montarPlanta(t);
  const mob = mobiliar(t, true); // igual ao site: móveis com modelo 3D entram pela forma real, não por caixas
  const acab = acabamentos(t, planta, mob);
  const l = limitesPlanta(t);

  // ---- obstáculos: paredes, móveis, acabamentos (sem vidro), laje de piso e de forro
  const lista: number[] = [];
  for (const b of planta.paredes) lista.push(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);
  for (const p of [...mob.prims, ...acab]) {
    if (p.mat === "vidro" || p.mat === "vidroFosco") continue;
    const c = aabb(p);
    const [dx, dy, dz] = [c[3] - c[0], c[4] - c[1], c[5] - c[2]];
    if (Math.min(dx, dy, dz) < 0.012 || dx * dy * dz < 0.0004) continue;
    if (dy < 0.03 && c[1] < 0.02) continue; // tapete não faz sombra
    lista.push(...c);
  }
  lista.push(l.x0 - 1, -0.3, l.z0 - 1, l.x1 + 1, -0.035, l.z1 + 1);
  lista.push(l.x0 - 1, PE_LIVRE, l.z0 - 1, l.x1 + 1, PE_LIVRE + 0.3, l.z1 + 1);
  const cx = Float64Array.from(lista);
  const nb = cx.length / 6;
  const modelos = (mob.modelos ?? []).map(modeloNoMundo);
  const raio = new THREE.Ray();
  const pontoM = new THREE.Vector3();

  // ---- grade em planta para só testar as caixas por perto
  const M = ALCANCE + 0.6;
  const [GX0, GZ0] = [l.x0 - M, l.z0 - M];
  const gnx = Math.ceil((l.x1 - l.x0 + 2 * M) / CEL);
  const gnz = Math.ceil((l.z1 - l.z0 + 2 * M) / CEL);
  const celulas: number[][] = Array.from({ length: gnx * gnz }, () => []);
  const ci = (v: number, v0: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor((v - v0) / CEL)));
  for (let b = 0; b < nb; b++) {
    const [i0, i1, k0, k1] = [ci(cx[b * 6]!, GX0, gnx), ci(cx[b * 6 + 3]!, GX0, gnx), ci(cx[b * 6 + 2]!, GZ0, gnz), ci(cx[b * 6 + 5]!, GZ0, gnz)];
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) celulas[i + gnx * k]!.push(b);
  }
  const marca = new Int32Array(nb).fill(-1);
  let rodada = 0;
  const perto = new Int32Array(nb);
  /** Caixas a até `r` de (x, z); devolve quantas foram postas em `perto`. */
  const juntar = (x: number, z: number, r: number) => {
    rodada++;
    let n = 0;
    const [i0, i1, k0, k1] = [ci(x - r, GX0, gnx), ci(x + r, GX0, gnx), ci(z - r, GZ0, gnz), ci(z + r, GZ0, gnz)];
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) for (const b of celulas[i + gnx * k]!) if (marca[b] !== rodada) { marca[b] = rodada; perto[n++] = b; }
    return n;
  };
  const dentroDeCaixa = (x: number, y: number, z: number) => {
    const n = juntar(x, z, 0);
    for (let q = 0; q < n; q++) {
      const o = perto[q]! * 6;
      if (x > cx[o]! && x < cx[o + 3]! && y > cx[o + 1]! && y < cx[o + 4]! && z > cx[o + 2]! && z < cx[o + 5]!) return true;
    }
    return false;
  };
  const foraDaPlanta = (x: number, z: number) => x < l.x0 - 0.005 || x > l.x1 + 0.005 || z < l.z0 - 0.005 || z > l.z1 + 0.005;

  // ---- retalhos: faces de paredes e revestimentos, pisos e forros
  const todos = new Map<string, { r: Retalho; poli?: [number, number][] }>();
  const caixasMapa: { pos: V3; tam: V3 }[] = planta.paredes.map((b) => ({ pos: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2], tam: [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0] }));
  for (const p of [...acab, ...mob.prims]) if (p.forma === "caixa" && !p.rot && MATS_MAPA.includes(p.mat)) caixasMapa.push({ pos: p.pos, tam: p.tam });
  for (const c of caixasMapa) {
    for (const f of facesCaixa(c.pos, c.tam)) {
      if (f.su * f.sv < 0.0004) continue;
      if (f.n[1] < 0 && f.o[1] < 0.03) continue; // apoiada no piso
      if (f.n[1] > 0 && f.o[1] > PE_LIVRE - 0.002) continue; // encostada no forro
      const amostras: [number, number][] = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];
      const pts = amostras.map(([a, b]) => [0, 1, 2].map((e) => f.o[e]! + f.u[e]! * a * f.su + f.v[e]! * b * f.sv + f.n[e]! * 0.012) as V3);
      if (pts.every((p) => foraDaPlanta(p[0], p[2])) || pts.every((p) => dentroDeCaixa(p[0], p[1], p[2]))) continue;
      todos.set(f.k, { r: f });
    }
  }
  for (const c of t.comodos) {
    const piso = retalhoComodo(c, false, c.piso === "externo" ? -0.03 : 0);
    const forro = retalhoComodo(c, true, PE_LIVRE);
    todos.set(piso.k, { r: piso, poli: c.poligono });
    todos.set(forro.k, { r: forro, poli: c.poligono });
  }
  const rets = [...todos.values()];
  const area = rets.reduce((s, x) => s + x.r.su * x.r.sv, 0);

  // ---- empacotamento em prateleiras, baixando a densidade até caber em LARG × LARG
  let dens = 40;
  let pos: { x: number; y: number; w: number; h: number }[] = [];
  let altura = 0;
  for (;;) {
    const tamanhos = rets.map((x) => ({ w: Math.ceil(x.r.su * dens) + 2 * BORDA_MAPA, h: Math.ceil(x.r.sv * dens) + 2 * BORDA_MAPA }));
    const ordem = tamanhos.map((_, i) => i).sort((a, b) => tamanhos[b]!.h - tamanhos[a]!.h || tamanhos[b]!.w - tamanhos[a]!.w);
    pos = new Array(rets.length);
    let [x, y, prat] = [4, 0, 4]; // 4×4 px brancos no canto (valor neutro de quem não tem mapa)
    for (const i of ordem) {
      const s = tamanhos[i]!;
      if (x + s.w > LARG) { x = 0; y += prat; prat = 0; }
      pos[i] = { x, y, w: s.w, h: s.h };
      x += s.w;
      prat = Math.max(prat, s.h);
    }
    altura = y + prat;
    if (altura <= LARG || dens < 12) break;
    dens *= 0.93;
  }
  const W = LARG;
  const H = Math.ceil(altura / 4) * 4;

  // ---- oclusão texel a texel
  const ao = new Float32Array(W * H).fill(-1);
  const dono = new Int32Array(W * H).fill(-1);
  let texels = 0;
  rets.forEach(({ r, poli }, i) => {
    const p = pos[i]!;
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) dono[x + W * y] = i;
    const [nu, nv] = [Math.ceil(r.su * dens), Math.ceil(r.sv * dens)];
    for (let tv = 0; tv < nv; tv++) for (let tu = 0; tu < nu; tu++) {
      const s = Math.min(r.su, (tu + 0.5) / dens);
      const tt = Math.min(r.sv, (tv + 0.5) / dens);
      const px = r.o[0] + r.u[0] * s + r.v[0] * tt + r.n[0] * 0.012;
      const py = r.o[1] + r.u[1] * s + r.v[1] * tt + r.n[1] * 0.012;
      const pz = r.o[2] + r.u[2] * s + r.v[2] * tt + r.n[2] * 0.012;
      if (poli && !dentroPoligono(poli, px, pz)) continue;
      if (dentroDeCaixa(px, py, pz)) {
        // embaixo de móvel: escuro (o modelo 3D pode deixar ver um pouco, entre os pés)
        ao[p.x + BORDA_MAPA + tu + W * (p.y + BORDA_MAPA + tv)] = 0.2;
        continue;
      }
      const n = juntar(px, pz, ALCANCE);
      pontoM.set(px, py, pz);
      const mods = modelos.filter((m) => m.caixa.distanceToPoint(pontoM) < ALCANCE);
      const giro = ((texels++ * 0.618033988749895) % 1) * Math.PI * 2;
      const [cg, sg] = [Math.cos(giro), Math.sin(giro)];
      let oc = 0;
      for (let k = 0; k < RAIOS; k++) {
        const d = disco[k]!;
        const lx = d[0] * cg - d[1] * sg, ly = d[0] * sg + d[1] * cg, lz = d[2];
        const dx = r.u[0] * lx + r.v[0] * ly + r.n[0] * lz;
        const dy = r.u[1] * lx + r.v[1] * ly + r.n[1] * lz;
        const dz = r.u[2] * lx + r.v[2] * ly + r.n[2] * lz;
        const [ix, iy, iz] = [1 / dx, 1 / dy, 1 / dz];
        let melhor = ALCANCE;
        for (let q = 0; q < n; q++) {
          const o = perto[q]! * 6;
          let t0 = (cx[o]! - px) * ix, t1 = (cx[o + 3]! - px) * ix;
          if (t0 > t1) { const a = t0; t0 = t1; t1 = a; }
          let a = (cx[o + 1]! - py) * iy, b = (cx[o + 4]! - py) * iy;
          if (a > b) { const c = a; a = b; b = c; }
          if (a > t0) t0 = a;
          if (b < t1) t1 = b;
          a = (cx[o + 2]! - pz) * iz; b = (cx[o + 5]! - pz) * iz;
          if (a > b) { const c = a; a = b; b = c; }
          if (a > t0) t0 = a;
          if (b < t1) t1 = b;
          if (t1 >= t0 && t1 > 0 && t0 < melhor) melhor = Math.max(0, t0);
        }
        if (mods.length) {
          raio.origin.set(px, py, pz);
          raio.direction.set(dx, dy, dz);
          for (const m of mods) {
            const h = m.bvh.raycastFirst(raio, THREE.DoubleSide, 0, melhor);
            if (h && h.distance < melhor) melhor = h.distance;
          }
        }
        if (melhor < ALCANCE) { const f = melhor / ALCANCE; oc += 1 - f * f; }
      }
      ao[p.x + BORDA_MAPA + tu + W * (p.y + BORDA_MAPA + tv)] = 1 - oc / RAIOS;
    }
  });

  // ---- espalha para a borda e para o que ficou sob móveis; suaviza o ruído dentro de cada retalho
  for (let passo = 0; passo < 8; passo++) {
    const novo = Float32Array.from(ao);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = x + W * y;
      if (dono[q]! < 0 || ao[q]! >= 0) continue;
      let s = 0, n = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const [xx, yy] = [x + a, y + b];
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const qq = xx + W * yy;
        if (dono[qq] === dono[q] && ao[qq]! >= 0) { s += ao[qq]!; n++; }
      }
      if (n) novo[q] = s / n;
    }
    ao.set(novo);
  }
  const liso = Float32Array.from(ao);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const q = x + W * y;
    if (dono[q]! < 0 || ao[q]! < 0) continue;
    let s = 0, n = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const [xx, yy] = [x + a, y + b];
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const qq = xx + W * yy;
      if (dono[qq] === dono[q] && ao[qq]! >= 0) { s += ao[qq]!; n++; }
    }
    liso[q] = s / n;
  }

  const cinza = Buffer.alloc(W * H, 255);
  for (let q = 0; q < W * H; q++) if (liso[q]! >= 0) cinza[q] = Math.round(Math.min(1, Math.max(0, liso[q]!)) * 255);
  fs.writeFileSync(path.join("public", "luz", `${t.id}-mapa.png`), pngCinza(W, H, cinza));
  const r: Record<string, [number, number]> = {};
  rets.forEach(({ r: x }, i) => (r[x.k] = [pos[i]!.x + BORDA_MAPA, pos[i]!.y + BORDA_MAPA]));
  fs.writeFileSync(path.join("public", "luz", `${t.id}-mapa.json`), JSON.stringify({ w: W, h: H, dens, r }));
  const vals = [...liso].filter((v, q) => v >= 0 && dono[q]! >= 0);
  const media = vals.reduce((s, v) => s + v, 0) / vals.length;
  console.log(t.id, `${modelos.length} modelos, ${rets.length} retalhos, ${area.toFixed(0)} m², ${dens.toFixed(1)} px/m, ${W}×${H}, ${texels} texels, AO médio ${media.toFixed(2)}, ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
}
}

/** PNG → WebP (q90, ~5× menor) com o Python/Pillow da máquina; sem ele os PNGs ficam e o site usa o PNG. */
function paraWebp(): void {
  const pngs = fs.readdirSync(path.join("public", "luz")).filter((f) => f.endsWith("-mapa.png")).map((f) => path.join("public", "luz", f));
  if (!pngs.length) return;
  const py = "import sys,os\nfrom PIL import Image\nfor f in sys.argv[1:]:\n  Image.open(f).save(f[:-4]+'.webp','WEBP',quality=90,method=6); os.remove(f)";
  try {
    execFileSync("python3", ["-c", py, ...pngs], { stdio: "inherit" });
    console.log(`${pngs.length} mapas convertidos para WebP`);
  } catch {
    console.warn("Sem Python/Pillow: os mapas ficaram em PNG (o site lê o PNG quando não acha o WebP).");
  }
}

void principal().then(paraWebp);
