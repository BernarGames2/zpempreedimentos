/** Entrada do joystick virtual (x: direita, y: para baixo, de −1 a 1), lida pelo passeio a cada quadro. */
export const joystick = { x: 0, y: 0, ativo: false };

let moveis: boolean | null = null;
/**
 * Móveis com modelos 3D de terceiros (GLB) nas plantas que já os têm. `?moveis=antigos` volta aos móveis
 * gerados por código, para comparar. Lido uma vez, no primeiro uso (a URL muda durante a navegação).
 */
export function moveisGlb(): boolean {
  if (moveis === null) moveis = typeof window === "undefined" || new URLSearchParams(window.location.search).get("moveis") !== "antigos";
  return moveis;
}

/** O aparelho usa toque como entrada principal (celular, tablet)? */
export function toquePrincipal(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}
