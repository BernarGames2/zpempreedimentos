import type { Empreendimento, Unidade, Vec3 } from "../types";

/**
 * Medidas da torre procedural do Liwo (metros), tiradas das plantas oficiais
 * (pavimento-tipo e pavimento de lazer) e dos renders de fachada.
 * Mundo: fachada da frente (finais 01 e 02) em +Z; lateral direita (final 03) em +X.
 */
export const P = {
  /** Largura da frente (eixo X) e comprimento da lateral (eixo Z) da torre. */
  W: 21.6,
  D: 30.8,
  /** Térreo com pé-direito duplo (vitrine + painel perfurado) e os quatro pavimentos de salas comerciais. */
  terreo: 6.0,
  vitrine: 3.6,
  working: 3.1,
  /** Piso do 5º pavimento (lazer), sobre o embasamento. */
  podio: 18.4,
  /** Piso do primeiro andar-tipo (6º). */
  base: 22.0,
  /** Pé-direito do pavimento das coberturas e altura da platibanda. */
  coberturaH: 3.4,
  coroamento: 1.5,
  /** Planta do embasamento (planta oficial do pavimento de lazer: avança 6 m à direita e para os fundos). */
  lote: { x0: -11.6, x1: 17.0, z0: -19.8, z1: 16.0 },
  /**
   * Frente e fundos: pilar do dormitório | vão de varandas (final 01) | coluna central |
   * vão de varandas (final 02) | pilar dos banhos. As lajes das varandas têm borda em onda.
   */
  frente: { pilarEsq: -7.9, centro: [-0.6, -0.3] as const, pilarDir: 7.2, guarda: 1.25, lajeMin: 1.35, lajeMax: 2.35, aba: 2.55, borda: 0.35 },
  /** Laterais: terço central (finais 03 e 06) entre z = ±terco; o do lado esquerdo é recuado. */
  lateral: { terco: 5.5, recuo: 1.8 },
} as const;

export const meioW = P.W / 2;
export const meioD = P.D / 2;

export function primeiroAndar(e: Empreendimento): number {
  return e.primeiroAndar ?? 1;
}

/** Número do último andar (o das coberturas). */
export function ultimoAndar(e: Empreendimento): number {
  return primeiroAndar(e) + e.andares - 1;
}

/** Cota do piso de um andar (numeração real do prédio). */
export function cotaAndar(andar: number, e: Empreendimento): number {
  return P.base + (andar - primeiroAndar(e)) * e.peDireito;
}

export function alturaAndar(andar: number, e: Empreendimento): number {
  return andar === ultimoAndar(e) ? P.coberturaH : e.peDireito;
}

/** Topo da laje de cobertura. */
export function alturaTorre(e: Empreendimento): number {
  return cotaAndar(ultimoAndar(e), e) + P.coberturaH;
}

/** Avanço da laje da varanda (m) no ponto t (0 a 1) do vão; alterna a cada andar, formando a onda. */
export function ondaLaje(t: number, andarIdx: number, espelhado: boolean): number {
  const { lajeMin, lajeMax } = P.frente;
  const meio = (lajeMin + lajeMax) / 2;
  const amp = (lajeMax - lajeMin) / 2;
  const tt = espelhado ? 1 - t : t;
  return meio + amp * Math.cos(Math.PI * tt + andarIdx * Math.PI);
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

/** Unidades lidas de um modelo real (malhas `unidade_1201`). Têm prioridade sobre o procedural. */
export const geosReais = new Map<string, GeoUnidade>();

/** Divisa entre os dois apartamentos da frente (e dos fundos). */
const DIVISA = (P.frente.centro[0] + P.frente.centro[1]) / 2;

/**
 * Onde cada unidade fica na fachada. Pavimento-tipo: finais 01 e 02 na frente, 03 na lateral
 * direita, 04 e 05 nos fundos e 06 na lateral esquerda (recuada). Coberturas: 01 na frente,
 * 02 nos fundos à direita e 03 nos fundos à esquerda, como na planta oficial do 24º pavimento.
 */
export function geoUnidade(u: Unidade, e: Empreendimento): GeoUnidade {
  const real = geosReais.get(u.numero);
  if (real) return real;
  const y0 = cotaAndar(u.andar, e) + 0.04;
  const y1 = y0 + alturaAndar(u.andar, e) - 0.08;
  const ym = y0 + 1.25;
  const f = 0.08; // folga à frente da fachada
  const g = P.frente.guarda;
  const zF = meioD;
  const xL = meioW;
  const T = P.lateral.terco;
  let caixas: Caixa[];
  let sacada: Vec3;
  let normal: Vec3;
  let rotY: number;

  if (u.andar === ultimoAndar(e) && u.tipo.startsWith("cobertura")) {
    if (u.posicao === 1) {
      caixas = [caixa(-xL, xL, y0, y1, zF, zF + g + f), caixa(xL, xL + f, y0, y1, 0, zF), caixa(-xL - f, -xL, y0, y1, 0, zF)];
      sacada = [-4, ym, zF + g];
      normal = [0, 0, 1];
      rotY = 0;
    } else if (u.posicao === 2) {
      caixas = [caixa(DIVISA, xL, y0, y1, -zF - g - f, -zF), caixa(xL, xL + f, y0, y1, -zF, 0)];
      sacada = [5, ym, -zF - g];
      normal = [0, 0, -1];
      rotY = Math.PI;
    } else {
      caixas = [caixa(-xL, DIVISA, y0, y1, -zF - g - f, -zF), caixa(-xL - f, -xL, y0, y1, -zF, 0)];
      sacada = [-5, ym, -zF - g];
      normal = [0, 0, -1];
      rotY = Math.PI;
    }
    return { numero: u.numero, caixas, sacada, normal, rotY, envolvente: envolver(caixas) };
  }

  switch (u.posicao) {
    case 1:
      caixas = [caixa(-xL, DIVISA, y0, y1, zF, zF + g + f), caixa(-xL - f, -xL, y0, y1, T, zF)];
      sacada = [-2.7, ym, zF + g];
      normal = [0, 0, 1];
      rotY = 0;
      break;
    case 2:
      caixas = [caixa(DIVISA, xL, y0, y1, zF, zF + g + f), caixa(xL, xL + f, y0, y1, T, zF)];
      sacada = [2.05, ym, zF + g];
      normal = [0, 0, 1];
      rotY = 0;
      break;
    case 3:
      caixas = [caixa(xL, xL + f, y0, y1, -T, T)];
      sacada = [xL, ym, -2.75];
      normal = [1, 0, 0];
      rotY = Math.PI / 2;
      break;
    case 4:
      caixas = [caixa(DIVISA, xL, y0, y1, -zF - g - f, -zF), caixa(xL, xL + f, y0, y1, -zF, -T)];
      sacada = [2.05, ym, -zF - g];
      normal = [0, 0, -1];
      rotY = Math.PI;
      break;
    case 5:
      caixas = [caixa(-xL, DIVISA, y0, y1, -zF - g - f, -zF), caixa(-xL - f, -xL, y0, y1, -zF, -T)];
      sacada = [-2.7, ym, -zF - g];
      normal = [0, 0, -1];
      rotY = Math.PI;
      break;
    default: {
      const xr = -xL + P.lateral.recuo;
      caixas = [caixa(xr - f, xr, y0, y1, -T, T)];
      sacada = [xr, ym, 2.5];
      normal = [-1, 0, 0];
      rotY = -Math.PI / 2;
      break;
    }
  }
  return { numero: u.numero, caixas, sacada, normal, rotY, envolvente: envolver(caixas) };
}
