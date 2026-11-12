/**
 * Medidas da área de lazer do 5º pavimento usadas pelo embasamento (sitio.ts) e pela cena do lazer (Lazer.tsx).
 *
 * Piscina: a raia vem dos dados (posição e tamanho medidos na planta oficial); a prainha rasa, onde ficam
 * as duas espreguiçadeiras dentro d'água, também é da planta oficial (4,45 × 2,9 m, com o canto voltado
 * para o terraço arredondado). A profundidade (1,40 m na raia, 0,22 m na prainha) é ESTIMADA: não consta
 * no material divulgado.
 */
import { lazeres } from "../dados";
import { P } from "./predio";

export interface Ret2 {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface MedidasPiscina {
  raia: Ret2;
  prainha: Ret2;
  /** Raio do canto arredondado da prainha. */
  raio: number;
  /** Largura da borda de pedra em volta da água. */
  borda: number;
  /** Guarda-corpo de vidro dos fundos, na linha do guarda-corpo do embasamento. */
  vidro: { x0: number; x1: number; z: number };
  profRaia: number;
  profPrainha: number;
}

/** Linha do guarda-corpo do lazer, medida para fora da divisa do lote (ver `lazer()` em sitio.ts). */
export const RECUO_GUARDA = 0.62;

export function medidasPiscina(): MedidasPiscina | null {
  const l = lazeres().find((x) => x.id === "piscina");
  if (!l) return null;
  const [cx, , cz] = l.posicao;
  const [w, , d] = l.tamanho;
  const raia = { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
  const prainha = { x0: raia.x0, x1: raia.x0 + 4.45, z0: raia.z1, z1: raia.z1 + 2.9 };
  return {
    raia,
    prainha,
    raio: 0.9,
    borda: 0.3,
    vidro: { x0: raia.x0 - 0.6, x1: raia.x1 + 0.6, z: P.lote.z0 - RECUO_GUARDA },
    profRaia: 1.4,
    profPrainha: 0.22,
  };
}

/**
 * Terraço coberto entre a piscina e os ambientes fechados (planta oficial): sob a torre, aberto para a
 * piscina, com a parede de vidro do lounge recuada para `zVidro` até `xFim`.
 */
export const TERRACO = { zVidro: -12.0, xFim: 4.6, pilares: [-4.6, -0.2], luzes: [-8.6, -5.6, -2.6, 0.4, 3.4] };
