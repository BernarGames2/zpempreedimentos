import type { Vec3 } from "./types";

const RAD = Math.PI / 180;

export interface PosicaoSol {
  /** Altura acima do horizonte, em graus. */
  elevacao: number;
  /** Rumo em graus, sentido horário a partir do norte. */
  azimute: number;
}

/** Dia do ano (1 a 365). */
export function diaDoAno(d: Date): number {
  const inicio = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - inicio) / 86_400_000);
}

/**
 * Posição do sol para uma hora local (relógio de Brasília, UTC-3).
 * Precisão de 1 a 2 graus, suficiente para um estudo de insolação.
 */
export function posicaoSol(hora: number, latitude: number, longitude: number, dia: number): PosicaoSol {
  const decl = 23.44 * RAD * Math.sin(((2 * Math.PI) / 365) * (284 + dia));
  // Correção de longitude em relação ao meridiano do fuso (-45°): 4 minutos por grau.
  const horaSolar = hora + (4 * (longitude + 45)) / 60;
  const h = 15 * RAD * (horaSolar - 12);
  const lat = latitude * RAD;
  const senAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(h);
  const elevacao = Math.asin(Math.max(-1, Math.min(1, senAlt)));
  const az = Math.atan2(-Math.sin(h) * Math.cos(decl), Math.cos(lat) * Math.sin(decl) - Math.sin(lat) * Math.cos(decl) * Math.cos(h));
  return { elevacao: elevacao / RAD, azimute: ((az / RAD) % 360 + 360) % 360 };
}

/**
 * Vetor (mundo) que aponta para o sol. No mundo, a fachada da frente olha para +Z;
 * `rumoFrente` diz para que ponto cardeal ela aponta.
 */
export function direcaoSol(p: PosicaoSol, rumoFrente: number): Vec3 {
  const b = rumoFrente * RAD;
  const norte: Vec3 = [Math.sin(b), 0, Math.cos(b)];
  const leste: Vec3 = [-Math.cos(b), 0, Math.sin(b)];
  const az = p.azimute * RAD;
  const el = p.elevacao * RAD;
  const c = Math.cos(el);
  return [
    c * (Math.cos(az) * norte[0] + Math.sin(az) * leste[0]),
    Math.sin(el),
    c * (Math.cos(az) * norte[2] + Math.sin(az) * leste[2]),
  ];
}

/** Rumo (graus a partir do norte) de uma fachada cuja normal no mundo é (nx, nz). */
export function rumoDaNormal(nx: number, nz: number, rumoFrente: number): number {
  // +Z tem rumo `rumoFrente`; girar de +Z para -X soma 90°.
  const ang = Math.atan2(-nx, nz) / RAD;
  return ((rumoFrente + ang) % 360 + 360) % 360;
}

const CARDEAIS = ["norte", "nordeste", "leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste"];
export function cardeal(rumo: number): string {
  return CARDEAIS[Math.round((((rumo % 360) + 360) % 360) / 45) % 8] ?? "norte";
}

/** Há sol direto na fachada nesse instante? */
export function solNaFachada(p: PosicaoSol, rumoFachada: number): boolean {
  if (p.elevacao <= 2) return false;
  const d = Math.cos((p.azimute - rumoFachada) * RAD);
  return d > 0.12;
}

/** Frase automática do estudo de sol, ex.: "Sol da manhã na varanda". */
export function resumoSol(rumoFachada: number, latitude: number, longitude: number, dia: number, onde = "varanda"): string {
  let manha = 0;
  let tarde = 0;
  for (let h = 6.5; h <= 17.5; h += 0.5) {
    if (solNaFachada(posicaoSol(h, latitude, longitude, dia), rumoFachada)) {
      if (h < 12) manha++;
      else tarde++;
    }
  }
  if (manha >= 4 && tarde >= 4) return `Sol o dia todo na ${onde}`;
  if (manha >= 3 && manha >= tarde) return `Sol da manhã na ${onde}`;
  if (tarde >= 3) return `Sol da tarde na ${onde}`;
  if (manha + tarde > 0) return `Pouco sol direto na ${onde}`;
  return `Luz indireta na ${onde} nesta época do ano`;
}
