/**
 * Pré-calcula a iluminação indireta de cada planta num volume de sondas (grade 3D):
 * quanto céu cada ponto do apartamento enxerga pelas janelas e pela varanda, mais a luz rebatida
 * nas paredes (3 rebatimentos), e o mesmo para as luminárias (noite). O resultado é um arquivo
 * pequeno por planta em public/luz/, lido pelo site como textura 3D que modula a luz ambiente de
 * paredes, pisos, móveis e modelos. Uso: npx tsx scripts/assar-luz.ts
 */
import fs from "node:fs";
import path from "node:path";
import { emp, temInterior } from "../lib/dados";
import { mobiliar } from "../lib/procedural/mobilia";
import { PE_LIVRE, limitesPlanta, montarPlanta } from "../lib/procedural/planta";

interface Caixa { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
const D = 0.25; // lado da célula em planta (m)
const NY = 5;
const RAIOS = 192;
const ALBEDO = 0.62;

const dirs: [number, number, number][] = [];
for (let i = 0; i < RAIOS; i++) {
  const y = 1 - (2 * (i + 0.5)) / RAIOS;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963229728653;
  dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
}

/** Distância até a primeira caixa atingida (ou Infinity). */
function tiro(cs: Caixa[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max = Infinity): number {
  let melhor = max;
  const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
  for (let k = 0; k < cs.length; k++) {
    const c = cs[k] as Caixa;
    let t0 = (c.x0 - ox) * ix, t1 = (c.x1 - ox) * ix;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    let a = (c.y0 - oy) * iy, b = (c.y1 - oy) * iy;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    a = (c.z0 - oz) * iz; b = (c.z1 - oz) * iz;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t1 >= t0 && t1 > 1e-4 && t0 < melhor) melhor = t0 > 1e-4 ? t0 : 0;
  }
  return melhor;
}

fs.mkdirSync(path.join("public", "luz"), { recursive: true });
for (const t of emp.tipos) {
  if (!temInterior(t)) continue;
  const inicio = Date.now();
  const planta = montarPlanta(t);
  const mob = mobiliar(t, false);
  const l = limitesPlanta(t);
  const caixas: Caixa[] = planta.paredes.map((b) => ({ ...b }));
  for (const p of mob.prims) {
    if (p.mat === "vidro" || p.mat === "vidroFosco" || p.camada === "teto") continue;
    const [w, h, d] = p.tam;
    if (Math.min(w, h, d) < 0.05 || w * h * d < 0.03) continue;
    caixas.push({ x0: p.pos[0] - w / 2, x1: p.pos[0] + w / 2, y0: p.pos[1] - h / 2, y1: p.pos[1] + h / 2, z0: p.pos[2] - d / 2, z1: p.pos[2] + d / 2 });
  }
  // a porta de entrada é uma folha fechada
  for (const a of t.portas) {
    if (a.tipo !== "porta" || !a.liga?.includes("hall")) continue;
    caixas.push({ x0: Math.min(a.p1[0], a.p2[0]) - 0.02, x1: Math.max(a.p1[0], a.p2[0]) + 0.02, y0: 0, y1: a.altura, z0: Math.min(a.p1[1], a.p2[1]) - 0.02, z1: Math.max(a.p1[1], a.p2[1]) + 0.02 });
  }
  // piso e forro como lajes finas sobre toda a planta
  caixas.push({ x0: l.x0 - 0.2, x1: l.x1 + 0.2, y0: -0.2, y1: 0, z0: l.z0 - 0.2, z1: l.z1 + 0.2 }, { x0: l.x0 - 0.2, x1: l.x1 + 0.2, y0: PE_LIVRE, y1: PE_LIVRE + 0.2, z0: l.z0 - 0.2, z1: l.z1 + 0.2 });

  const m = 0.25; // margem em volta da planta
  const [X0, Z0] = [l.x0 - m, l.z0 - m];
  const nx = Math.ceil((l.x1 - l.x0 + 2 * m) / D);
  const nz = Math.ceil((l.z1 - l.z0 + 2 * m) / D);
  const dy = PE_LIVRE / NY;
  const n = nx * NY * nz;
  const idx = (i: number, j: number, k: number) => i + nx * (j + NY * k);
  const pos = (i: number, j: number, k: number): [number, number, number] => [X0 + (i + 0.5) * D, (j + 0.5) * dy, Z0 + (k + 0.5) * D];
  const valido = new Uint8Array(n);
  const ceu = new Float32Array(n);
  const lamp = new Float32Array(n);
  const batidas = new Float32Array(n * RAIOS * 3).fill(NaN);
  const saiu = (x: number, y: number, z: number) => x < l.x0 - 0.15 || x > l.x1 + 0.15 || z < l.z0 - 0.15 || z > l.z1 + 0.15 || y < -0.3 || y > PE_LIVRE + 0.3;

  for (let k = 0; k < nz; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < nx; i++) {
    const [x, y, z] = pos(i, j, k);
    const q = idx(i, j, k);
    if (saiu(x, y, z) || caixas.some((c) => x > c.x0 - 0.02 && x < c.x1 + 0.02 && y > c.y0 - 0.02 && y < c.y1 + 0.02 && z > c.z0 - 0.02 && z < c.z1 + 0.02)) continue;
    valido[q] = 1;
    let s = 0;
    const giro = (q * 0.618033) % 1 * Math.PI * 2;
    const [cg, sg] = [Math.cos(giro), Math.sin(giro)];
    for (let r = 0; r < RAIOS; r++) {
      const d = dirs[r] as [number, number, number];
      const dx = d[0] * cg - d[2] * sg, dz = d[0] * sg + d[2] * cg, dyv = d[1];
      const tt = tiro(caixas, x, y, z, dx, dyv, dz);
      if (tt === Infinity) { s += dyv > 0 ? 1 : 0.3; continue; }
      const b = (q * RAIOS + r) * 3;
      batidas[b] = x + dx * (tt - 0.06); batidas[b + 1] = y + dyv * (tt - 0.06); batidas[b + 2] = z + dz * (tt - 0.06);
    }
    ceu[q] = s / RAIOS;
    let a = 0;
    for (const lz of mob.luzes) {
      const [vx, vy, vz] = [lz.pos[0] - x, lz.pos[1] - y, lz.pos[2] - z];
      const dist = Math.hypot(vx, vy, vz);
      if (dist < 0.05 || tiro(caixas, x, y, z, vx / dist, vy / dist, vz / dist, dist) >= dist) a += lz.forca / (dist * dist + 0.6);
    }
    lamp[q] = a;
  }

  /** Preenche as sondas inválidas (dentro de parede ou móvel) com a média das vizinhas válidas. */
  const preencher = (campo: Float32Array) => {
    const ok = Uint8Array.from(valido);
    const c = Float32Array.from(campo);
    for (let passo = 0; passo < 6; passo++) {
      const novoOk = Uint8Array.from(ok);
      for (let k = 0; k < nz; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < nx; i++) {
        const q = idx(i, j, k);
        if (ok[q]) continue;
        let s = 0, w = 0;
        for (const [a, b, d] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const [ii, jj, kk] = [i + a, j + b, k + d];
          if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= NY || kk >= nz || !ok[idx(ii, jj, kk)]) continue;
          s += c[idx(ii, jj, kk)] as number; w++;
        }
        if (w) { c[q] = s / w; novoOk[q] = 1; }
      }
      ok.set(novoOk);
    }
    return c;
  };
  const amostra = (c: Float32Array, x: number, y: number, z: number) => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - X0) / D - 0.5)), fy = Math.min(NY - 1.001, Math.max(0, y / dy - 0.5)), fz = Math.min(nz - 1.001, Math.max(0, (z - Z0) / D - 0.5));
    const [i, j, k] = [Math.floor(fx), Math.floor(fy), Math.floor(fz)];
    const [u, v, w] = [fx - i, fy - j, fz - k];
    let s = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let d = 0; d < 2; d++) s += (c[idx(i + a, j + b, k + d)] as number) * (a ? u : 1 - u) * (b ? v : 1 - v) * (d ? w : 1 - w);
    return s;
  };
  const rebater = (direta: Float32Array) => {
    let atual = preencher(direta);
    for (let it = 0; it < 3; it++) {
      const prox = new Float32Array(n);
      for (let q = 0; q < n; q++) {
        if (!valido[q]) continue;
        let s = 0;
        for (let r = 0; r < RAIOS; r++) {
          const b = (q * RAIOS + r) * 3;
          const bx = batidas[b] as number;
          if (bx === bx) s += amostra(atual, bx, batidas[b + 1] as number, batidas[b + 2] as number);
        }
        prox[q] = (direta[q] as number) + (ALBEDO * s) / RAIOS;
      }
      atual = preencher(prox);
    }
    return atual;
  };
  const dia = rebater(ceu);
  const noite = rebater(lamp);
  const percentil = (c: Float32Array, p: number) => {
    const v = [...c].filter((_, q) => valido[q]).sort((a, b) => a - b);
    return v[Math.floor(v.length * p)] ?? 1;
  };
  const [refDia, refNoite] = [percentil(dia, 0.7), percentil(noite, 0.7)];
  const dados = Buffer.alloc(n * 4);
  for (let q = 0; q < n; q++) {
    const fd = Math.min(1.45, 0.34 + 0.72 * Math.pow((dia[q] as number) / refDia, 0.55));
    const fn = Math.min(1.6, 0.45 + 0.68 * Math.pow((noite[q] as number) / refNoite, 0.5));
    dados[q * 4] = Math.round(fd * 127.5);
    dados[q * 4 + 1] = Math.round(fn * 127.5);
    dados[q * 4 + 3] = 255;
  }
  fs.writeFileSync(path.join("public", "luz", `${t.id}.json`), JSON.stringify({ min: [X0, 0, Z0], tam: [nx * D, PE_LIVRE, nz * D], n: [nx, NY, nz], dados: dados.toString("base64") }));
  const vals = [...dia].filter((_, q) => valido[q]);
  console.log(t.id, `${nx}×${NY}×${nz} sondas, ${caixas.length} caixas, céu mín ${Math.min(...vals).toFixed(3)} / ref ${refDia.toFixed(3)} / máx ${Math.max(...vals).toFixed(3)}, ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
}
