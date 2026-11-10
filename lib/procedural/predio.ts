import type { Empreendimento, Unidade, Vec3 } from "../types";

/**
 * Medidas da torre procedural (metros), tiradas dos renders 01 e 02.
 * Mundo: fachada da frente em +Z, fachada lateral (sacadas corridas) em +X.
 */
export const P = {
  /** Largura da frente (eixo X) e profundidade da lateral (eixo Z). */
  W: 13.6,
  D: 19.2,
  /** Altura do embasamento. */
  podio: 5.2,
  /** Planta do embasamento e chanfro da esquina. */
  lote: { x0: -11.5, x1: 10.4, z0: -12.4, z1: 13.4, chanfro: 5.6 },
  /** Frente: faixa branca | faixa areia com caixas grafite e vãos de sacada | pilar de esquina. */
  frente: { branco: -3.7, caixa: [-3.7, -0.7] as const, vao: [2.3, 5.3] as const, pilar: 5.9, balanco: 1.55 },
  /** Lateral: faixa branca com janelas até `sacadas[0]`; sacadas corridas até o fundo. */
  lateral: { sacadas: [3.2, -9.6] as const, faixa: [-2.6, -3.8] as const, balanco: 1.4 },
  /** Fundos: dois vãos de sacada recuados. */
  fundos: { vaos: [[-4.4, -1.6], [0.6, 3.4]] as const },
  coroamento: 1.5,
} as const;

export const meioW = P.W / 2;
export const meioD = P.D / 2;

/** Cota do piso de um andar (1 = primeiro andar tipo). */
export function cotaAndar(andar: number, peDireito: number): number {
  return P.podio + (andar - 1) * peDireito;
}

export function alturaTorre(e: Empreendimento): number {
  return P.podio + e.andares * e.peDireito;
}

export interface Caixa {
  centro: Vec3;
  tamanho: Vec3;
}

export interface GeoUnidade {
  numero: string;
  /** Volumes clicáveis que envolvem a fachada da unidade. */
  caixas: Caixa[];
  /** Centro da sacada, na linha do guarda-corpo. */
  sacada: Vec3;
  /** Normal da fachada (para fora). */
  normal: Vec3;
  /** Giro em Y que leva o +Z da planta do apartamento até a normal da fachada. */
  rotY: number;
  /** Caixa envolvente (para o contorno e o rótulo). */
  envolvente: Caixa;
}

function caixa(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Caixa {
  return {
    centro: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    tamanho: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)],
  };
}

function envolver(cs: Caixa[]): Caixa {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const c of cs) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i] as number, (c.centro[i] as number) - (c.tamanho[i] as number) / 2);
      max[i] = Math.max(max[i] as number, (c.centro[i] as number) + (c.tamanho[i] as number) / 2);
    }
  }
  return caixa(min[0], max[0], min[1], max[1], min[2], max[2]);
}

/** Onde cada unidade fica na fachada. As seis posições do andar seguem a planta do pavimento-tipo. */
export function geoUnidade(u: Unidade, e: Empreendimento): GeoUnidade {
  const y0 = cotaAndar(u.andar, e.peDireito) + 0.04;
  const y1 = y0 + e.peDireito - 0.08;
  const ym = y0 + 1.25;
  const f = 0.06; // folga à frente da fachada
  const zF = meioD;
  const xL = meioW;
  let caixas: Caixa[];
  let sacada: Vec3;
  let normal: Vec3;
  let rotY: number;

  switch (u.posicao) {
    case 1: {
      const [a, b] = P.frente.caixa;
      caixas = [caixa(-meioW, 0, y0, y1, zF, zF + f), caixa(a - 0.05, b + 0.05, y0, y1, zF, zF + P.frente.balanco + f)];
      sacada = [(a + b) / 2, ym, zF + P.frente.balanco];
      normal = [0, 0, 1];
      rotY = 0;
      break;
    }
    case 2: {
      const [a, b] = P.frente.vao;
      caixas = [caixa(0, meioW + f, y0, y1, zF, zF + f), caixa(xL, xL + f, y0, y1, P.lateral.sacadas[0], zF)];
      sacada = [(a + b) / 2, ym, zF];
      normal = [0, 0, 1];
      rotY = 0;
      break;
    }
    case 3: {
      const z0 = P.lateral.faixa[0];
      const z1 = P.lateral.sacadas[0];
      caixas = [caixa(xL, xL + P.lateral.balanco + f, y0, y1, z0, z1)];
      sacada = [xL + P.lateral.balanco, ym, (z0 + z1) / 2];
      normal = [1, 0, 0];
      rotY = Math.PI / 2;
      break;
    }
    case 4: {
      const z0 = -meioD - P.lateral.balanco;
      const z1 = P.lateral.faixa[1];
      caixas = [caixa(xL, xL + P.lateral.balanco + f, y0, y1, z0, z1), caixa(4.6, xL, y0, y1, z0 - f, -meioD)];
      sacada = [xL + P.lateral.balanco, ym, (-meioD + z1) / 2];
      normal = [1, 0, 0];
      rotY = Math.PI / 2;
      break;
    }
    case 5: {
      const [a, b] = P.fundos.vaos[1];
      caixas = [caixa(0, 4.6, y0, y1, -meioD - f, -meioD)];
      sacada = [(a + b) / 2, ym, -meioD];
      normal = [0, 0, -1];
      rotY = Math.PI;
      break;
    }
    default: {
      const [a, b] = P.fundos.vaos[0];
      caixas = [caixa(-meioW - f, 0, y0, y1, -meioD - f, -meioD), caixa(-meioW - f, -meioW, y0, y1, -meioD, -2)];
      sacada = [(a + b) / 2, ym, -meioD];
      normal = [0, 0, -1];
      rotY = Math.PI;
      break;
    }
  }
  return { numero: u.numero, caixas, sacada, normal, rotY, envolvente: envolver(caixas) };
}
