export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Aproximação exponencial independente da taxa de quadros. */
export const amortecer = (atual: number, alvo: number, lambda: number, dt: number): number =>
  lerp(atual, alvo, 1 - Math.exp(-lambda * dt));
