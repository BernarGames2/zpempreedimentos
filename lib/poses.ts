import * as THREE from "three";
import { emp, lazeres, tipoDe } from "./dados";
import { limitesPlanta } from "./procedural/planta";
import { P, alturaTorre, geoUnidade } from "./procedural/predio";
import type { Unidade } from "./types";

export interface Pose {
  pos: THREE.Vector3;
  alvo: THREE.Vector3;
  fov: number;
}

export const FOV_PREDIO = 50;
export const FOV_PASSEIO = 70;
export const ALTURA_OLHO = 1.6;
/** Rumo da vista inicial: o ângulo diagonal do render oficial "fachada diagonal". */
export const AZIMUTE_01 = THREE.MathUtils.degToRad(-28);
export const ALVO_PREDIO = new THREE.Vector3(1.5, alturaTorre(emp) * 0.47, 0);

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Da calçada em frente ao térreo, olhando a torre de baixo para cima (render "embasamento"). */
export function poseIntro(): Pose {
  return { pos: v(4, 1.6, P.lote.z1 + 22), alvo: v(2, 30, 4), fov: 60 };
}

/** Vista de esquina da torre inteira (render 01), no azimute pedido. */
export function posePredio(aspecto: number, azimute = AZIMUTE_01): Pose {
  const dist = aspecto < 0.8 ? 175 : aspecto < 1.2 ? 140 : 118;
  const y = 26;
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
  const d = retrato ? 40 : 27;
  const alvo = retrato ? centro.clone().add(v(0, -6.5, 0)) : centro.clone().addScaledVector(lado, 5.5);
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

/** Vista isométrica de cima, do lado da fachada. */
export function poseMaquete(u: Unidade, aspecto: number): Pose {
  const l = limitesPlanta(tipoDe(u));
  const k = (aspecto < 0.9 ? 1.75 : 1) * Math.max(1, Math.max(l.x1 - l.x0, l.z1 - l.z0) / 7);
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
  return { pos: v(62 * k, 52 * k + 12, -58 * k), alvo: v(3, P.podio, -2), fov: FOV_PREDIO };
}
