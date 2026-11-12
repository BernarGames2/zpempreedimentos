/** Entrada do joystick virtual (x: direita, y: para baixo, de −1 a 1), lida pelo passeio a cada quadro. */
export const joystick = { x: 0, y: 0, ativo: false };

/** O aparelho usa toque como entrada principal (celular, tablet)? */
export function toquePrincipal(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}
