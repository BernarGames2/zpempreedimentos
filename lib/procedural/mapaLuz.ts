/**
 * Mapa de luz das plantas (scripts/assar-mapa.ts): oclusão de ambiente pré-calculada, texel a texel, nas
 * superfícies fixas — paredes, revestimentos, pisos e forros. Cada face vira um retalho num atlas; a chave
 * da face (lado, canto e tamanho em milímetros) liga o que foi assado à geometria montada no site, então uma
 * face que não estiver no arquivo só fica sem o mapa (valor neutro), nunca com o mapa de outra.
 */
import type { Comodo } from "../types";

export type V3 = [number, number, number];

/** Face plana: canto `o`, eixos `u` e `v` (unitários) e tamanho `su` × `sv` em metros. */
export interface Retalho {
  k: string;
  o: V3;
  u: V3;
  v: V3;
  su: number;
  sv: number;
  n: V3;
}

/** Atlas assado: tamanho em pixels, densidade (px/m) e canto de cada retalho. */
export interface MapaLuzInfo {
  w: number;
  h: number;
  dens: number;
  r: Record<string, [number, number]>;
}

/** Materiais de caixa que recebem o mapa (o resto da mobília segue só com o volume de luz). */
export const MATS_MAPA: readonly string[] = ["parede", "azulejo", "tapete"];
/** Borda em volta de cada retalho, para o filtro bilinear não misturar vizinhos. */
export const BORDA_MAPA = 2;

const mm = (x: number) => Math.round(x * 1000);
const chave = (lado: string, o: V3, su: number, sv: number) => `${lado}|${mm(o[0])},${mm(o[1])},${mm(o[2])}|${mm(su)}x${mm(sv)}`;

/** As seis faces de uma caixa alinhada aos eixos, na ordem da BoxGeometry do three (+x, −x, +y, −y, +z, −z). */
export function facesCaixa(pos: V3, tam: V3): Retalho[] {
  const [cx, cy, cz] = pos;
  const [w, h, d] = tam;
  const [x0, x1, y0, y1, z0, z1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cz - d / 2, cz + d / 2];
  const f = (lado: string, n: V3, o: V3, u: V3, v: V3, su: number, sv: number): Retalho => ({ k: chave(lado, o, su, sv), o, u, v, su, sv, n });
  return [
    f("+x", [1, 0, 0], [x1, y0, z0], [0, 0, 1], [0, 1, 0], d, h),
    f("-x", [-1, 0, 0], [x0, y0, z0], [0, 0, 1], [0, 1, 0], d, h),
    f("+y", [0, 1, 0], [x0, y1, z0], [1, 0, 0], [0, 0, 1], w, d),
    f("-y", [0, -1, 0], [x0, y0, z0], [1, 0, 0], [0, 0, 1], w, d),
    f("+z", [0, 0, 1], [x0, y0, z1], [1, 0, 0], [0, 1, 0], w, h),
    f("-z", [0, 0, -1], [x0, y0, z0], [1, 0, 0], [0, 1, 0], w, h),
  ];
}

/** Piso (ou forro) do cômodo: o retângulo que envolve o polígono, na altura `y`. */
export function retalhoComodo(c: Comodo, forro: boolean, y: number): Retalho {
  const xs = c.poligono.map((p) => p[0]);
  const zs = c.poligono.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  return { k: `${forro ? "forro" : "piso"}|${c.id}`, o: [x0, y, z0], u: [1, 0, 0], v: [0, 0, 1], su: x1 - x0, sv: z1 - z0, n: forro ? [0, -1, 0] : [0, 1, 0] };
}

/** Coordenada no atlas de um ponto da face (ou null se a face não foi assada). */
export function uvMapa(info: MapaLuzInfo, r: Retalho, x: number, y: number, z: number): [number, number] | null {
  const c = info.r[r.k];
  if (!c) return null;
  const [px, py, pz] = [x - r.o[0], y - r.o[1], z - r.o[2]];
  const s = Math.min(r.su, Math.max(0, px * r.u[0] + py * r.u[1] + pz * r.u[2]));
  const t = Math.min(r.sv, Math.max(0, px * r.v[0] + py * r.v[1] + pz * r.v[2]));
  return [(c[0] + s * info.dens) / info.w, (c[1] + t * info.dens) / info.h];
}
