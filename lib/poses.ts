import * as THREE from "three";
import { emp, lazeres, tipoDe } from "./dados";
import { P, geoUnidade } from "./procedural/predio";
import type { TipoPlanta, Unidade } from "./types";

export interface Pose {
  pos: THREE.Vector3;
  alvo: THREE.Vector3;
  fov: number;
}

export const FOV_PREDIO = 50;
export const FOV_PASSEIO = 70;
export const ALTURA_OLHO = 1.6;
/** Rumo da vista inicial: o ângulo de esquina do render 01. */
export const AZIMUTE_01 = THREE.MathUtils.degToRad(42);
export const ALVO_PREDIO = new THREE.Vector3(0.6, 20.5, 0);

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Enquadramento da portaria (render 02), onde a introdução começa. */
export function poseIntro(): Pose {
  return { pos: v(-6.4, 1.5, P.lote.z1 + 9.8), alvo: v(-4.6, 15, 6), fov: 58 };
}

/** Vista de esquina da torre inteira (render 01), no azimute pedido. */
export function posePredio(aspecto: number, azimute = AZIMUTE_01): Pose {
  const dist = aspecto < 0.8 ? 88 : aspecto < 1.2 ? 74 : 64;
  const y = 2.4;
  const r = Math.sqrt(dist * dist - (ALVO_PREDIO.y - y) ** 2);
  return { pos: v(Math.sin(azimute) * r, y, Math.cos(azimute) * r), alvo: ALVO_PREDIO.clone(), fov: FOV_PREDIO };
}

/** De frente para a unidade, deixando espaço para o painel (à direita no desktop, embaixo no celular). */
export function poseUnidade(u: Unidade, aspecto: number): Pose {
  const g = geoUnidade(u, emp);
  const n = v(...g.normal);
  const lado = v(n.z, 0, -n.x); // direita de quem olha para a fachada
  const centro = v(...g.sacada);
  const retrato = aspecto < 0.9;
  const d = retrato ? 30 : 21;
  const alvo = retrato ? centro.clone().add(v(0, -5.5, 0)) : centro.clone().addScaledVector(lado, 4.6);
  const pos = centro.clone().addScaledVector(n, d).addScaledVector(lado, retrato ? -4 : -3.5).add(v(0, retrato ? -1 : 1.4, 0));
  pos.y = Math.max(pos.y, 2);
  return { pos, alvo, fov: 42 };
}

/** Pontos do voo de entrada: até a sacada, por cima do guarda-corpo e porta adentro. */
export function caminhoEntrada(u: Unidade): { antes: THREE.Vector3; dentro: THREE.Vector3; alvo: THREE.Vector3 } {
  const g = geoUnidade(u, emp);
  const n = v(...g.normal);
  const s = v(...g.sacada);
  return {
    antes: s.clone().addScaledVector(n, 3.2).add(v(0, 0.45, 0)),
    dentro: s.clone().addScaledVector(n, -1.1).add(v(0, 0.3, 0)),
    alvo: s.clone().addScaledVector(n, -6).add(v(0, 0.1, 0)),
  };
}

/** Na sacada, olhando para fora (modo "Ver a vista"). */
export function poseVista(u: Unidade): Pose {
  const g = geoUnidade(u, emp);
  const n = v(...g.normal);
  const s = v(...g.sacada);
  const pos = s.clone().addScaledVector(n, 0.35);
  pos.y = s.y - 1.25 + ALTURA_OLHO;
  return { pos, alvo: pos.clone().addScaledVector(n, 10).add(v(0, -1.2, 0)), fov: FOV_PASSEIO };
}

export interface Limites {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
}

export function limitesPlanta(t: TipoPlanta): Limites {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const c of t.comodos) {
    for (const [x, z] of c.poligono) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  }
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

/** Vista isométrica de cima, do lado da fachada. */
export function poseMaquete(u: Unidade, aspecto: number): Pose {
  const l = limitesPlanta(tipoDe(u));
  const k = aspecto < 0.9 ? 1.75 : 1;
  return { pos: v(l.cx - 4.6 * k, 8.6 * k, l.cz + 8.4 * k), alvo: v(l.cx, 0.3, l.cz - (aspecto < 0.9 ? 1.2 : 0)), fov: 40 };
}

/** Câmera no enquadramento da foto oficial do cômodo. */
export function poseComodo(u: Unidade, comodoId: string | null): Pose {
  const t = tipoDe(u);
  const c = t.comodos.find((x) => x.id === comodoId) ?? t.comodos[0];
  if (!c) throw new Error("Planta sem cômodos.");
  const e = c.splat ? { posicao: c.splat.spawn, olhar: c.splat.olhar } : c.enquadramento;
  return { pos: v(...c.enquadramento.posicao).setY(ALTURA_OLHO), alvo: v(...e.olhar), fov: FOV_PASSEIO };
}

/** Vista aérea que mostra os pontos de lazer do térreo e da cobertura. */
export function poseLazer(id: string | null, aspecto: number): Pose {
  const l = lazeres().find((x) => x.id === id);
  if (l) return { pos: v(...l.camera.posicao), alvo: v(...l.camera.olhar), fov: 45 };
  const k = aspecto < 0.9 ? 1.45 : 1;
  return { pos: v(-50 * k, 46 * k + 6, 60 * k), alvo: v(-1, 23, 0), fov: FOV_PREDIO };
}
