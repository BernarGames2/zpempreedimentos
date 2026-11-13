/**
 * Resolução (pixels por ponto da tela): faixa em que o ajuste automático pode andar. Mudar a resolução não
 * recompila nada; mudar sombras ou o pós-processamento recompila a cena inteira — no iPhone isso travava
 * por muitos segundos (ou derrubava o 3D). Por isso o nível de qualidade é fixo por aparelho e só a
 * resolução se adapta.
 */
export const FAIXA_DPR = { computador: [1, 1.75], celular: [1, 1.5] } as const;

function dprTela(): number {
  return typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
}

/** Faixa do ajuste automático, sem passar da densidade da própria tela (monitor comum = 1). */
export function faixaDpr(): [number, number] {
  const [min, max] = ehCelular() ? FAIXA_DPR.celular : FAIXA_DPR.computador;
  const tela = dprTela();
  return [Math.min(min, tela), Math.min(max, tela)];
}

/** Resolução inicial: 1,25 no celular e 1,5 no computador (ou a da tela, se for menor). */
export function dprInicial(): number {
  return Math.min(ehCelular() ? 1.25 : 1.5, dprTela());
}

/** Tela de toque ou estreita: celular/tablet. */
export function ehCelular(): boolean {
  return typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760);
}

/** Luminárias do apartamento acesas ao mesmo tempo (ver `luminarias` em lib/luzVolume.ts). */
export function luzesPontuais(): number {
  return ehCelular() ? 2 : 4;
}
