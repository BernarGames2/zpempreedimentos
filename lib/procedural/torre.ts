import * as THREE from "three";
import type { Empreendimento } from "../types";
import { sorteio } from "./canvas";
import { P, alturaAndar, alturaTorre, cotaAndar, meioD, meioW, ondaLaje, primeiroAndar, ultimoAndar } from "./predio";

/** Materiais de caixas instanciadas (paleta dos renders do Liwo: concreto, terracota e bronze). */
export type Mat = "concreto" | "concretoClaro" | "terracota" | "grafite" | "branco" | "painel" | "vidroEscuro" | "metal" | "bronze" | "deck" | "muro" | "led";
/** Planos instanciados (texturas, gradis e luzes). */
export type Plano = "janelaAcesa" | "janelaApagada" | "janelinha" | "portaVidro" | "grade" | "brilho" | "spot" | "cone";

/** Polígono horizontal extrudado entre duas cotas (lajes em onda e fitas de LED). */
export interface Onda {
  contorno: [number, number][];
  y0: number;
  y1: number;
}

export interface Pecas {
  caixas: Record<Mat, THREE.Matrix4[]>;
  planos: Record<Plano, THREE.Matrix4[]>;
  ondas: Onda[];
  fitas: Onda[];
  /** Vegetação das floreiras: moitas e folhas pendentes. */
  arbustos: THREE.Matrix4[];
  pendentes: THREE.Matrix4[];
}

export function pecasVazias(): Pecas {
  return {
    caixas: { concreto: [], concretoClaro: [], terracota: [], grafite: [], branco: [], painel: [], vidroEscuro: [], metal: [], bronze: [], deck: [], muro: [], led: [] },
    planos: { janelaAcesa: [], janelaApagada: [], janelinha: [], portaVidro: [], grade: [], brilho: [], spot: [], cone: [] },
    ondas: [],
    fitas: [],
    arbustos: [],
    pendentes: [],
  };
}

/** Uma fachada: converte (u ao longo da fachada, w para fora) em x/z do mundo. */
export interface Face {
  ponto: (u: number, w: number) => [number, number];
  rotY: number;
}

export const FRENTE: Face = { ponto: (u, w) => [u, meioD + w], rotY: 0 };
export const LATERAL: Face = { ponto: (u, w) => [meioW + w, -u], rotY: Math.PI / 2 };
export const FUNDOS: Face = { ponto: (u, w) => [-u, -meioD - w], rotY: Math.PI };
export const ESQUERDA: Face = { ponto: (u, w) => [-meioW - w, u], rotY: -Math.PI / 2 };
/** Trecho recuado da lateral esquerda (final 06). */
export const ESQ_RECUO: Face = { ponto: (u, w) => [-meioW + P.lateral.recuo - w, u], rotY: -Math.PI / 2 };

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export class Construtor {
  readonly pecas: Pecas;
  constructor(pecas: Pecas = pecasVazias()) {
    this.pecas = pecas;
  }

  /** Caixa alinhada aos eixos, em coordenadas do mundo. */
  caixa(mat: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void {
    const m = new THREE.Matrix4();
    _p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    _s.set(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    m.compose(_p, _q.identity(), _s);
    this.pecas.caixas[mat].push(m);
  }

  /** Caixa em coordenadas de fachada. */
  caixaF(f: Face, mat: Mat, u0: number, u1: number, y0: number, y1: number, w0: number, w1: number): void {
    const [xa, za] = f.ponto(u0, w0);
    const [xb, zb] = f.ponto(u1, w1);
    this.caixa(mat, xa, xb, y0, y1, za, zb);
  }

  /** Plano em coordenadas do mundo. `rotX` = π/2 vira o plano para baixo. */
  plano(tipo: Plano, x: number, y: number, z: number, larg: number, alt: number, rotY: number, rotX = 0): void {
    const m = new THREE.Matrix4();
    _e.set(rotX, rotY, 0, "YXZ");
    m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(larg, alt, 1));
    this.pecas.planos[tipo].push(m);
  }

  planoF(f: Face, tipo: Plano, u: number, y: number, w: number, larg: number, alt: number, rotX = 0): void {
    const [x, z] = f.ponto(u, w);
    this.plano(tipo, x, y, z, larg, alt, f.rotY, rotX);
  }

  /** Moita de floreira (icosaedro achatado). */
  arbusto(x: number, y: number, z: number, s: number, giro = 0): void {
    _e.set(0, giro, 0);
    this.pecas.arbustos.push(new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(s * 1.5, s * 0.85, s * 1.15)));
  }

  /** Folhas que caem pela borda da floreira. `rotY` aponta para fora da fachada. */
  pendente(x: number, y: number, z: number, rotY: number, s: number, queda = 2.2): void {
    _e.set(queda, rotY, 0, "YXZ");
    this.pecas.pendentes.push(new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(s, s * 1.5, s)));
  }

  /** Floreira corrida com vegetação pendente (embasamento e lazer). */
  floreira(f: Face, u0: number, u1: number, y: number, w: number, r: () => number, densidade = 1): void {
    const n = Math.max(2, Math.round((u1 - u0) * 1.5 * densidade));
    for (let i = 0; i < n; i++) {
      const u = u0 + ((i + 0.3 + r() * 0.4) / n) * (u1 - u0);
      const [x, z] = f.ponto(u, w);
      this.arbusto(x, y + 0.22 + r() * 0.12, z, 0.42 + r() * 0.3, r() * 3);
      const [px, pz] = f.ponto(u + (r() - 0.5) * 0.4, w + 0.28);
      this.pendente(px, y + 0.12, pz, f.rotY, 0.5 + r() * 0.45, 2.0 + r() * 0.5);
    }
  }

  /** Varanda recuada das laterais: porta de vidro ao fundo, forro com spot e gradil de bronze. */
  nicho(f: Face, u0: number, u1: number, y0: number, alt: number): void {
    const prof = 1.3;
    const meio = (u0 + u1) / 2;
    const larg = u1 - u0;
    this.planoF(f, "portaVidro", meio, y0 + 1.16, -prof + 0.01, larg - 0.06, 2.32);
    this.caixaF(f, "concretoClaro", u0, u1, y0 + 2.4, y0 + 2.46, -prof, 0);
    this.caixaF(f, "concretoClaro", u0, u1, y0 - 0.1, y0 + 0.02, -prof, 0.06);
    this.caixaF(f, "concreto", u0 - 0.03, u0 + 0.03, y0, y0 + 2.4, -prof, 0);
    this.caixaF(f, "concreto", u1 - 0.03, u1 + 0.03, y0, y0 + 2.4, -prof, 0);
    this.caixaF(f, "concreto", u0, u1, y0 + 2.46, y0 + alt, -0.25, 0);
    this.planoF(f, "grade", meio, y0 + 0.57, -0.04, larg, 1.08);
    this.caixaF(f, "bronze", u0, u1, y0 + 1.1, y0 + 1.15, -0.07, -0.01);
    this.planoF(f, "spot", meio, y0 + 2.395, -0.62, 0.15, 0.15, Math.PI / 2);
    this.planoF(f, "brilho", meio, y0 + 2.39, -0.62, 2.2, 1.3, Math.PI / 2);
  }
}

interface Ctx {
  c: Construtor;
  e: Empreendimento;
  r: () => number;
  B: number;
  T: number;
  janela: () => Plano;
  andares: number[];
}

/**
 * Fachada das varandas (frente e fundos, que são espelhadas): abas e tampa em terracota,
 * pilares de concreto nas pontas, coluna central e lajes com a borda em onda.
 */
function fachadaVarandas(x: Ctx, f: Face, s: 1 | -1): void {
  const { c, e, r, B, T } = x;
  const fr = P.frente;
  const t = 0.25;
  const g = fr.guarda;
  const u = (xx: number) => s * xx;
  /** Faixa em X convertida para a coordenada da fachada. */
  const cx = (mat: Mat, xa: number, xb: number, y0: number, y1: number, w0: number, w1: number) =>
    c.caixaF(f, mat, Math.min(u(xa), u(xb)), Math.max(u(xa), u(xb)), y0, y1, w0, w1);
  const topo = T + P.coroamento;

  cx("concreto", -meioW, meioW, B, T, -t, 0);
  cx("concreto", -meioW + fr.borda, fr.pilarEsq, B, T, 0, g);
  cx("concreto", fr.pilarDir, meioW - fr.borda, B, T, 0, g);
  cx("concreto", fr.centro[0], fr.centro[1], B, T, 0, g + 0.12);
  // moldura de terracota: abas laterais e tampa
  cx("terracota", -meioW, -meioW + fr.borda, B - 0.6, topo, -t, fr.aba);
  cx("terracota", meioW - fr.borda, meioW, B - 0.6, topo, -t, fr.aba);
  cx("terracota", -meioW, meioW, T, T + 0.5, -t, fr.aba);
  cx("terracota", -meioW, meioW, T + 0.5, topo, fr.aba - 0.3, fr.aba);

  const vaos: { xa: number; xb: number; espelhado: boolean; portas: number[]; janela: number }[] = [
    { xa: fr.pilarEsq, xb: fr.centro[0], espelhado: false, portas: [-3.75, -1.75], janela: -6.4 },
    { xa: fr.centro[1], xb: fr.pilarDir, espelhado: true, portas: [1.0, 3.1], janela: 5.9 },
  ];
  const N = 10;
  x.andares.forEach((andar, k) => {
    const y0 = cotaAndar(andar, e);
    const h = alturaAndar(andar, e);
    for (const v of vaos) {
      const pts: [number, number][] = [];
      for (let j = 0; j <= N; j++) pts.push([v.xa + ((v.xb - v.xa) * j) / N, ondaLaje(j / N, k, v.espelhado)]);
      const borda = pts.map(([xx, d]) => f.ponto(u(xx), d));
      c.pecas.ondas.push({ contorno: [f.ponto(u(v.xa), 0), f.ponto(u(v.xb), 0), ...[...borda].reverse()], y0: y0 - 0.16, y1: y0 + 0.02 });
      if (k % 3 === 0) {
        const fora = pts.map(([xx, d]) => f.ponto(u(xx), d - 0.03));
        const dentro = pts.map(([xx, d]) => f.ponto(u(xx), d - 0.12));
        c.pecas.fitas.push({ contorno: [...fora, ...dentro.reverse()], y0: y0 - 0.185, y1: y0 - 0.16 });
      }
      const um = u((v.xa + v.xb) / 2);
      const larg = v.xb - v.xa;
      c.planoF(f, "grade", um, y0 + 0.59, g, larg, 1.1);
      cx("bronze", v.xa, v.xb, y0 + 1.12, y0 + 1.17, g - 0.04, g + 0.02);
      c.planoF(f, "spot", um, y0 + h - 0.165, 0.7, 0.16, 0.16, Math.PI / 2);
      c.planoF(f, "brilho", um, y0 + h - 0.167, 0.75, larg * 0.75, 1.5, Math.PI / 2);
      for (const px of v.portas) c.planoF(f, "portaVidro", u(px), y0 + 1.17, 0.012, 1.96, 2.3);
      c.planoF(f, x.janela(), u(v.janela), y0 + 1.45, 0.012, 1.5, 1.38);
      // vegetação sobre a laje, do lado de fora do gradil, onde ela avança mais
      for (let i = 0; i < 3; i++) {
        const tt = r();
        const d = ondaLaje(tt, k, v.espelhado);
        if (d - g < 0.6 || r() < 0.35) continue;
        const xx = v.xa + (v.xb - v.xa) * tt;
        const [ax, az] = f.ponto(u(xx), g + (d - g) * 0.5);
        c.arbusto(ax, y0 + 0.24, az, 0.3 + r() * 0.22, r() * 3);
        const [px, pz] = f.ponto(u(xx), d - 0.04);
        c.pendente(px, y0 + 0.02, pz, f.rotY, 0.4 + r() * 0.3);
      }
    }
    // pilares das pontas: janela do dormitório (final 01) e janelinhas dos banhos (final 02)
    c.planoF(f, x.janela(), u(-9.2), y0 + 1.45, g + 0.012, 1.2, 1.38);
    c.planoF(f, "janelinha", u(8.1), y0 + 1.7, g + 0.012, 0.55, 0.9);
    c.planoF(f, "janelinha", u(9.5), y0 + 1.7, g + 0.012, 0.55, 0.9);
  });
}

/** Faixa vertical de concreto com uma janela por andar, sobre a empena de terracota. */
function faixa(x: Ctx, f: Face, u0: number, u1: number): void {
  const { c, e, B, T } = x;
  c.caixaF(f, "concreto", u0, u1, B, T, 0, 0.09);
  for (const andar of x.andares) c.planoF(f, x.janela(), (u0 + u1) / 2, cotaAndar(andar, e) + 1.45, 0.102, Math.min(1.5, u1 - u0 - 0.5), 1.38);
}

function janelinhas(x: Ctx, f: Face, us: number[], w = 0.012): void {
  for (const andar of x.andares) for (const u of us) x.c.planoF(f, "janelinha", u, cotaAndar(andar, x.e) + 1.7, w, 0.55, 0.9);
}

/** Monta a torre do Liwo: fachadas, varandas em onda, janelas, luzes e coroamento. */
export function construirTorre(e: Empreendimento): Pecas {
  const c = new Construtor();
  const B = P.base;
  const T = alturaTorre(e);
  const t = 0.25;
  const r = sorteio(2401);
  const andares = Array.from({ length: ultimoAndar(e) - primeiroAndar(e) + 1 }, (_, i) => primeiroAndar(e) + i);
  const x: Ctx = { c, e, r, B, T, andares, janela: () => (r() < 0.4 ? "janelaAcesa" : "janelaApagada") };
  const topo = T + P.coroamento;
  const Tz = P.lateral.terco;

  fachadaVarandas(x, FRENTE, 1);
  fachadaVarandas(x, FUNDOS, -1);

  // ── Lateral direita (+X): finais 02 | 03 | 04 ─────────────────
  c.caixaF(LATERAL, "terracota", -meioD, -Tz, B, topo, -t, 0);
  c.caixaF(LATERAL, "terracota", Tz, meioD, B, topo, -t, 0);
  c.caixaF(LATERAL, "terracota", -Tz, Tz, T, topo, -t, 0);
  for (const sinal of [1, -1]) {
    // u = -z: o terço da frente tem u negativo
    const lim = (za: number, zb: number): [number, number] => (sinal > 0 ? [-zb, -za] : [za, zb]);
    faixa(x, LATERAL, ...lim(10.4, 12.6));
    faixa(x, LATERAL, ...lim(6.3, 8.5));
    janelinhas(x, LATERAL, [-sinal * 14.0, -sinal * 9.45]);
  }
  // terço central (final 03): parede de concreto com a varanda gourmet recuada
  const nicho03: [number, number] = [1.6, 3.9];
  c.caixaF(LATERAL, "concreto", -Tz, nicho03[0], B, T, -t, 0);
  c.caixaF(LATERAL, "concreto", nicho03[1], Tz, B, T, -t, 0);
  for (const andar of andares) {
    const y0 = cotaAndar(andar, e);
    c.nicho(LATERAL, nicho03[0], nicho03[1], y0, alturaAndar(andar, e));
    c.planoF(LATERAL, x.janela(), -3.9, y0 + 1.45, 0.012, 1.5, 1.38);
    c.planoF(LATERAL, x.janela(), -0.2, y0 + 1.45, 0.012, 1.5, 1.38);
  }
  janelinhas(x, LATERAL, [-2.0, 4.8]);

  // ── Lateral esquerda (-X): finais 01 | 06 (recuado) | 05 ──────
  c.caixaF(ESQUERDA, "terracota", Tz, meioD, B, topo, -t, 0);
  c.caixaF(ESQUERDA, "terracota", -meioD, -Tz, B, topo, -t, 0);
  for (const sinal of [1, -1]) {
    const lim = (za: number, zb: number): [number, number] => (sinal > 0 ? [za, zb] : [-zb, -za]);
    faixa(x, ESQUERDA, ...lim(12.6, 14.8));
    faixa(x, ESQUERDA, ...lim(7.0, 9.2));
    janelinhas(x, ESQUERDA, [sinal * 10.9]);
    // retornos do recuo
    c.caixa("terracota", -meioW, -meioW + P.lateral.recuo + 0.02, B, topo, sinal * Tz - (sinal > 0 ? 0 : -0.25), sinal * Tz - (sinal > 0 ? 0.25 : 0));
  }
  const nicho06: [number, number] = [1.4, 3.6];
  c.caixaF(ESQ_RECUO, "concreto", -Tz, nicho06[0], B, T, -t, 0);
  c.caixaF(ESQ_RECUO, "concreto", nicho06[1], Tz, B, T, -t, 0);
  c.caixaF(ESQ_RECUO, "terracota", -Tz, Tz, T, topo, -t, 0);
  for (const andar of andares) {
    const y0 = cotaAndar(andar, e);
    c.nicho(ESQ_RECUO, nicho06[0], nicho06[1], y0, alturaAndar(andar, e));
    c.planoF(ESQ_RECUO, x.janela(), -0.5, y0 + 1.45, 0.012, 1.5, 1.38);
    c.planoF(ESQ_RECUO, x.janela(), -3.6, y0 + 1.45, 0.012, 1.5, 1.38);
  }
  janelinhas(x, ESQ_RECUO, [4.6]);

  // ── Laje de transição, cobertura e caixa d'água ───────────────
  const zL = meioD + P.frente.lajeMin;
  c.caixa("concretoClaro", -meioW, meioW, B - 0.45, B - 0.02, -zL, zL);
  c.caixa("deck", -meioW + 0.2, meioW - 0.2, T - 0.25, T + 0.04, -meioD + 0.2, meioD - 0.2);
  c.caixa("concreto", -3.6, 3.6, T, T + 3.2, -4.5, 4.5);
  c.caixa("terracota", -3.8, 3.8, T + 3.2, T + 3.5, -4.7, 4.7);

  return c.pecas;
}
