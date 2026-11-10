import * as THREE from "three";
import type { Empreendimento } from "../types";
import { sorteio } from "./canvas";
import { P, alturaTorre, cotaAndar, meioD, meioW } from "./predio";

/** Materiais de caixas instanciadas. */
export type Mat = "branco" | "areia" | "grafite" | "granito" | "laje" | "vidroEscuro" | "metal" | "deck" | "maximar" | "muro";
/** Planos instanciados (texturas, grades e luzes). */
export type Plano = "janelaAcesa" | "janelaApagada" | "janelinha" | "portaVidro" | "grade" | "brilho" | "spot" | "cone";

export interface Pecas {
  caixas: Record<Mat, THREE.Matrix4[]>;
  planos: Record<Plano, THREE.Matrix4[]>;
}

export function pecasVazias(): Pecas {
  return {
    caixas: { branco: [], areia: [], grafite: [], granito: [], laje: [], vidroEscuro: [], metal: [], deck: [], maximar: [], muro: [] },
    planos: { janelaAcesa: [], janelaApagada: [], janelinha: [], portaVidro: [], grade: [], brilho: [], spot: [], cone: [] },
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

  /** Caixa girada (centro, tamanho e giro livre). */
  caixaGirada(mat: Mat, centro: [number, number, number], tamanho: [number, number, number], rot: [number, number, number]): void {
    const m = new THREE.Matrix4();
    _e.set(rot[0], rot[1], rot[2], "YXZ");
    m.compose(_p.set(...centro), _q.setFromEuler(_e), _s.set(...tamanho));
    this.pecas.caixas[mat].push(m);
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

  /** Janela maxim-ar aberta: vão escuro e folha de vidro inclinada. */
  maximar(f: Face, u: number, y: number, w: number): void {
    this.caixaF(f, "grafite", u - 0.3, u + 0.3, y - 0.3, y + 0.3, w - 0.02, w + 0.015);
    const [x, z] = f.ponto(u, w + 0.14);
    this.caixaGirada("maximar", [x, y - 0.02, z], [0.56, 0.56, 0.035], [-0.5, f.rotY, 0]);
  }

  /** Vão de sacada recuado: fundo com porta de vidro acesa, forro com spot e guarda-corpo de grade. */
  nicho(f: Face, u0: number, u1: number, y0: number, w: number): void {
    const prof = 1.3;
    const meio = (u0 + u1) / 2;
    const larg = u1 - u0;
    this.planoF(f, "portaVidro", meio, y0 + 1.16, w - prof + 0.01, larg - 0.06, 2.32);
    this.caixaF(f, "branco", u0, u1, y0 + 2.4, y0 + 2.46, w - prof, w);
    this.caixaF(f, "laje", u0, u1, y0 - 0.1, y0 + 0.02, w - prof, w + 0.04);
    this.caixaF(f, "areia", u0 - 0.03, u0 + 0.03, y0, y0 + 2.4, w - prof, w);
    this.caixaF(f, "areia", u1 - 0.03, u1 + 0.03, y0, y0 + 2.4, w - prof, w);
    this.planoF(f, "grade", meio, y0 + 0.55, w - 0.04, larg, 1.04);
    this.caixaF(f, "metal", u0, u1, y0 + 1.07, y0 + 1.12, w - 0.07, w - 0.01);
    this.planoF(f, "spot", meio, y0 + 2.395, w - 0.62, 0.15, 0.15, Math.PI / 2);
    this.planoF(f, "brilho", meio, y0 + 2.39, w - 0.62, 2.4, 1.3, Math.PI / 2);
  }
}

/** Monta a torre: fachadas, sacadas, janelas, luzes e coroamento. */
export function construirTorre(e: Empreendimento): Pecas {
  const c = new Construtor();
  const H = e.peDireito;
  const T = alturaTorre(e);
  const B = P.podio;
  const t = 0.25;
  const r = sorteio(1201);
  const janela = (): Plano => (r() < 0.42 ? "janelaAcesa" : "janelaApagada");

  // ── Frente (+Z) ───────────────────────────────────────────────
  const fr = P.frente;
  const rec = -0.2; // a faixa areia é recuada
  c.caixaF(FRENTE, "branco", -meioW, fr.branco, B, T, -t, 0);
  c.caixaF(FRENTE, "areia", fr.branco, fr.vao[0], B, T, rec - t, rec);
  c.caixaF(FRENTE, "areia", fr.vao[1], fr.pilar, B, T, rec - t, rec);
  c.caixaF(FRENTE, "branco", fr.pilar, meioW, B, T, -t, 0);
  // quinas brancas que dão a espessura do recuo
  c.caixaF(FRENTE, "branco", fr.branco - 0.02, fr.branco, B, T, rec, 0);
  c.caixaF(FRENTE, "branco", fr.pilar, fr.pilar + 0.02, B, T, rec, 0);
  const [ca, cb] = fr.caixa;
  const wb = fr.balanco;
  const cm = (ca + cb) / 2;

  // ── Lateral (+X): faixa branca e sacadas corridas ─────────────
  const uS = -P.lateral.sacadas[0]; // início das sacadas (u = -z)
  const uFim = meioD + P.lateral.balanco; // dobra a esquina dos fundos
  const [ug0, ug1] = [-P.lateral.faixa[0], -P.lateral.faixa[1]]; // faixa grafite
  const wl = P.lateral.balanco;
  c.caixaF(LATERAL, "branco", -meioD, uS, B, T, -t, 0);
  c.caixaF(LATERAL, "areia", uS, meioD, B, T, -t, 0);
  c.caixaF(LATERAL, "grafite", ug0, ug1, B, T + 0.1, 0, wl + 0.12);
  const portasLateral = [uS + 1.7, (uS + ug0) / 2 + 1.3, ug1 + 1.5, ug1 + 4.2];

  // ── Fundos (-Z) ───────────────────────────────────────────────
  const uWrap = -4.6; // até aqui chega a sacada corrida que dobra a esquina
  const nichosFundos: [number, number][] = P.fundos.vaos.map(([a, b]) => [-b, -a] as [number, number]).reverse();
  c.caixaF(FUNDOS, "areia", -meioW, uWrap, B, T, -t, 0);
  c.caixaF(FUNDOS, "branco", 5.0, meioW, B, T, -t, 0);
  {
    let u = uWrap;
    for (const [a, b] of nichosFundos) {
      c.caixaF(FUNDOS, "areia", u, a, B, T, rec - t, rec);
      u = b;
    }
    c.caixaF(FUNDOS, "areia", u, 5.0, B, T, rec - t, rec);
  }

  // ── Esquerda (-X): empena com a prumada da escada ─────────────
  c.caixaF(ESQUERDA, "branco", -meioD, meioD, B, T, -t, 0);
  c.caixaF(ESQUERDA, "grafite", -1.5, 1.5, B, T, 0, 0.04);

  for (let andar = 1; andar <= e.andares; andar++) {
    const y0 = cotaAndar(andar, H);

    // Frente: vão de sacada recuado (unidade final 02)
    c.caixaF(FRENTE, "areia", fr.vao[0], fr.vao[1], y0 + 2.46, y0 + H, rec - t, rec);
    c.nicho(FRENTE, fr.vao[0], fr.vao[1], y0, rec);
    // Frente: caixa de sacada em balanço, grafite (unidade final 01)
    c.caixaF(FRENTE, "grafite", ca, cb, y0 - 0.14, y0 + 0.03, rec, wb);
    c.caixaF(FRENTE, "grafite", ca, cb, y0 + 0.03, y0 + 1.0, wb - 0.1, wb);
    c.caixaF(FRENTE, "grafite", ca, ca + 0.1, y0 + 0.03, y0 + 1.0, rec, wb);
    c.caixaF(FRENTE, "grafite", cb - 0.1, cb, y0 + 0.03, y0 + 1.0, rec, wb);
    c.planoF(FRENTE, "portaVidro", cm, y0 + 1.14, rec + 0.012, 2.3, 2.26);
    c.planoF(FRENTE, "spot", cm + 0.7, y0 - 0.146, wb * 0.55, 0.16, 0.16, Math.PI / 2);
    c.planoF(FRENTE, "brilho", cm + 0.5, y0 - 0.148, wb * 0.5, 2.6, 1.5, Math.PI / 2);
    // Frente: janelas
    c.planoF(FRENTE, "janelinha", -5.85, y0 + 1.55, 0.012, 0.74, 0.74);
    c.maximar(FRENTE, -4.5, y0 + 1.72, 0);
    c.planoF(FRENTE, janela(), 0.45, y0 + 1.45, rec + 0.012, 1.2, 1.38);
    c.maximar(FRENTE, 1.6, y0 + 1.72, rec);

    // Lateral: faixa branca com janelas
    c.planoF(LATERAL, janela(), -6.2, y0 + 1.45, 0.012, 1.2, 1.38);
    c.maximar(LATERAL, -8.55, y0 + 1.72, 0);
    // Lateral: sacada corrida com borda texturizada e grade preta
    c.caixaF(LATERAL, "laje", uS, uFim, y0 - 0.12, y0 + 0.02, 0, wl);
    c.caixaF(LATERAL, "granito", uS, uFim, y0 - 0.3, y0 + 0.62, wl - 0.1, wl);
    c.caixaF(LATERAL, "granito", uS, uS + 0.1, y0 - 0.3, y0 + 0.62, 0, wl);
    c.caixaF(LATERAL, "branco", uS + 0.1, uFim - 0.1, y0 - 0.3, y0 - 0.12, 0, wl - 0.1);
    for (const [a, b] of [[uS + 0.1, ug0], [ug1, uFim]] as const) {
      c.planoF(LATERAL, "grade", (a + b) / 2, y0 + 0.86, wl - 0.05, b - a, 0.48);
      c.caixaF(LATERAL, "metal", a, b, y0 + 1.1, y0 + 1.15, wl - 0.08, wl - 0.02);
    }
    for (const u of portasLateral) {
      c.planoF(LATERAL, "portaVidro", u, y0 + 1.14, 0.012, 2.2, 2.26);
      c.planoF(LATERAL, "spot", u, y0 + H - 0.305, wl * 0.5, 0.15, 0.15, Math.PI / 2);
      c.planoF(LATERAL, "brilho", u, y0 + H - 0.307, wl * 0.5, 2.6, 1.3, Math.PI / 2);
    }
    // a sacada dobra a esquina dos fundos
    c.caixaF(FUNDOS, "laje", -uFim + meioD - meioW, uWrap, y0 - 0.12, y0 + 0.02, 0, wl);
    c.caixaF(FUNDOS, "granito", -meioW - wl, uWrap, y0 - 0.3, y0 + 0.62, wl - 0.1, wl);
    c.caixaF(FUNDOS, "granito", uWrap - 0.1, uWrap, y0 - 0.3, y0 + 0.62, 0, wl);
    c.planoF(FUNDOS, "grade", (-meioW - wl + uWrap) / 2, y0 + 0.86, wl - 0.05, uWrap + meioW + wl, 0.48);
    c.planoF(FUNDOS, "portaVidro", -5.7, y0 + 1.14, 0.012, 1.7, 2.26);

    // Fundos: dois vãos recuados
    for (const [a, b] of nichosFundos) {
      c.caixaF(FUNDOS, "areia", a, b, y0 + 2.46, y0 + H, rec - t, rec);
      c.nicho(FUNDOS, a, b, y0, rec);
    }
    c.planoF(FUNDOS, janela(), 0.5, y0 + 1.45, rec + 0.012, 1.2, 1.38);
    c.planoF(FUNDOS, "janelinha", 5.9, y0 + 1.55, 0.012, 0.74, 0.74);
    c.maximar(FUNDOS, -4.0, y0 + 1.72, rec);

    // Esquerda
    c.planoF(ESQUERDA, janela(), -6.2, y0 + 1.45, 0.012, 1.2, 1.38);
    c.planoF(ESQUERDA, janela(), 6.2, y0 + 1.45, 0.012, 1.2, 1.38);
    c.planoF(ESQUERDA, "janelinha", -3.3, y0 + 1.55, 0.012, 0.74, 0.74);
    c.planoF(ESQUERDA, "janelinha", 3.3, y0 + 1.55, 0.012, 0.74, 0.74);
    c.maximar(ESQUERDA, 0, y0 + 1.9, 0.04);
  }
  // cobertura da última caixa de sacada e da última sacada corrida
  c.caixaF(FRENTE, "grafite", ca, cb, T - 0.14, T + 0.03, rec, wb);

  // ── Coroamento ────────────────────────────────────────────────
  const xD = meioW + wl + 0.1; // borda direita (sobre as sacadas corridas)
  const zT = -meioD - wl - 0.1;
  c.caixa("branco", -7.6, xD, T - 0.3, T + 0.1, zT, 10.5);
  c.caixa("deck", -7.1, xD - 0.4, T + 0.1, T + 0.15, zT + 0.4, 10.0);
  // "tampa" branca grossa em balanço (parte esquerda)
  const xN = 1.4;
  const hc = P.coroamento;
  c.caixa("branco", -7.6, xN, T + 0.1, T + hc, 10.05, 10.5);
  c.caixa("branco", -7.6, -7.15, T + 0.1, T + hc, zT, 10.5);
  c.caixa("branco", -7.6, xN, T + 0.1, T + hc, zT, zT + 0.45);
  // parte direita: testeira branca com o logo e guarda-corpo de vidro escuro
  c.caixa("branco", xD - 0.45, xD, T + 0.1, T + 1.7, zT, 9.9);
  c.caixa("branco", xN, xD, T + 0.1, T + 0.9, 9.55, 9.9);
  c.caixa("branco", xN, xD, T + 0.1, T + 0.9, zT, zT + 0.35);
  c.caixa("grafite", xN, xN + 0.5, T + 0.1, T + hc - 0.25, 9.3, 10.3);
  c.caixa("vidroEscuro", xD - 0.12, xD - 0.07, T + 1.7, T + 2.8, zT + 0.05, 9.85);
  c.caixa("vidroEscuro", xN + 0.5, xD - 0.07, T + 0.9, T + 2.8, 9.72, 9.77);
  c.caixa("vidroEscuro", xN, xD - 0.07, T + 0.9, T + 2.8, zT + 0.12, zT + 0.17);
  c.caixa("metal", xD - 0.14, xD - 0.05, T + 2.8, T + 2.86, zT + 0.05, 9.85);
  // casa de máquinas / caixa d'água
  c.caixa("branco", -6.6, -2.4, T + 0.15, T + 3.4, -9.2, -4.2);
  c.caixa("grafite", -6.7, -2.3, T + 3.4, T + 3.6, -9.3, -4.1);

  return c.pecas;
}

/** Barras do logo "ZP" em relevo (unidades do próprio logo; altura 1). */
export function barrasLogoZP(): { centro: [number, number]; tamanho: [number, number]; giro: number }[] {
  const e = 0.13;
  return [
    // Z
    { centro: [-0.62, 0.435], tamanho: [0.74, e], giro: 0 },
    { centro: [-0.62, -0.435], tamanho: [0.74, e], giro: 0 },
    { centro: [-0.62, 0], tamanho: [1.1, e], giro: Math.atan2(0.74, 0.62) },
    // P
    { centro: [0.2, 0], tamanho: [e, 1], giro: 0 },
    { centro: [0.55, 0.435], tamanho: [0.7, e], giro: 0 },
    { centro: [0.55, -0.02], tamanho: [0.7, e], giro: 0 },
    { centro: [0.865, 0.21], tamanho: [e, 0.56], giro: 0 },
  ];
}
