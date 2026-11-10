import * as THREE from "three";
import { emp } from "./dados";
import { diaDoAno, direcaoSol, posicaoSol, type PosicaoSol } from "./sol";

export interface Ambiente {
  sol: PosicaoSol;
  /** Vetor para o sol no mundo (fachada da frente em +Z). */
  solDir: THREE.Vector3;
  /** 1 quando a iluminação artificial está acesa (modo Noite). */
  noite: number;
  /** Intensidade das luzes artificiais (0 a 1). */
  artificial: number;
}

const HOJE = diaDoAno(new Date());

export function diaAtual(): number {
  return HOJE;
}

/** Estado de luz da cena para uma hora do estudo de sol ou para o modo Noite. */
export function ambiente(hora: number, noite: boolean): Ambiente {
  const sol = posicaoSol(hora, emp.latitude, emp.longitude, HOJE);
  const d = direcaoSol(sol, emp.orientacaoNorteGraus);
  const solDir = new THREE.Vector3(d[0], Math.max(d[1], 0.03), d[2]).normalize();
  // perto do nascer e do pôr do sol as luzes já começam a acender
  const crepusculo = THREE.MathUtils.clamp(1 - sol.elevacao / 9, 0, 1);
  return { sol, solDir, noite: noite ? 1 : 0, artificial: noite ? 1 : crepusculo * 0.7 };
}
