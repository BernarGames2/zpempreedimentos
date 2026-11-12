/**
 * Entorno urbano procedural do Liwo: malha de quadras do Parque Sul Karaíba (Uberlândia) com ruas,
 * calçadas, casas, condomínios verticais, comércio, praças, terrenos vazios de cerrado e o skyline
 * ao longe. Tudo é determinístico (mesma semente) e pensado para instâncias: poucas chamadas de desenho.
 *
 * ILUSTRATIVO: a Maxi não forneceu o entorno real; a malha só reproduz o padrão do bairro
 * (quadras retangulares, casas de 1 e 2 pavimentos, torres esparsas e muitos lotes vagos).
 */
import { P } from "./predio";

export type Uso = "liwo" | "casas" | "vertical" | "vazio" | "praca" | "comercial";
export type Especie = "copa" | "ipe" | "flamboyant" | "palmeira" | "cone" | "cerrado";

export interface Quadra { x0: number; x1: number; z0: number; z1: number; uso: Uso; semente: number }
export interface Via { x0: number; x1: number; z0: number; z1: number; eixo: "x" | "z"; faixa: boolean }
export interface Volume { x: number; z: number; larg: number; prof: number; alt: number; giro: number; cor: number }
export interface Casa extends Volume { telhado: 0 | 1 | 2; corTelhado: number }
export interface Arvore { x: number; z: number; escala: number; especie: Especie; tom: number; giro: number }
export interface Poste { x: number; z: number; giro: number }
export interface Piscina { x: number; z: number; larg: number; prof: number }

export interface Entorno {
  quadras: Quadra[];
  vias: Via[];
  predios: Volume[];
  casas: Casa[];
  arvores: Arvore[];
  postes: Poste[];
  piscinas: Piscina[];
  /** Metade do lado do quadrado coberto pela textura do chão (m). */
  meioLado: number;
}

export const LARG_RUA = 10;
export const CALCADA = 2.6;
const PASSO_Z = 92; // distância entre ruas paralelas ao eixo x
const PASSO_X = 112; // distância entre ruas paralelas ao eixo z
const BASE_Z = P.lote.z1 + 9.6; // rua da frente do Liwo
const BASE_X = P.lote.x1 + 40; // rua lateral
const ALCANCE = 760; // raio da malha detalhada
export const MEIO_LADO = 860;
/** Câmera da introdução (na calçada oposta): nada pode nascer em volta dela nem entre ela e o prédio. */
const LIVRE = { x0: -26, x1: 34, z0: BASE_Z + 4, z1: BASE_Z + 46 };

export function gerador(semente: number) {
  let s = semente >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const dentro = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }, m = 0) =>
  x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

export function gerarEntorno(): Entorno {
  const r = gerador(1855); // número do Liwo na rua João Severiano Rodrigues da Cunha
  const zs: number[] = [];
  const xs: number[] = [];
  for (let k = -9; k <= 9; k++) zs.push(BASE_Z + k * PASSO_Z);
  for (let j = -8; j <= 8; j++) xs.push(BASE_X + j * PASSO_X);
  const lim = MEIO_LADO;
  const meia = LARG_RUA / 2;

  // ── Vias: trechos entre cruzamentos (sem sobreposição) e os próprios cruzamentos ──
  const vias: Via[] = [];
  for (const z of zs) {
    if (Math.abs(z) > lim) continue;
    for (let j = 0; j < xs.length - 1; j++) {
      const a = (xs[j] as number) + meia;
      const b = (xs[j + 1] as number) - meia;
      if (b < -lim || a > lim) continue;
      vias.push({ x0: Math.max(a, -lim), x1: Math.min(b, lim), z0: z - meia, z1: z + meia, eixo: "x", faixa: true });
    }
  }
  for (const x of xs) {
    if (Math.abs(x) > lim) continue;
    for (let k = 0; k < zs.length - 1; k++) {
      const a = (zs[k] as number) + meia;
      const b = (zs[k + 1] as number) - meia;
      if (b < -lim || a > lim) continue;
      vias.push({ x0: x - meia, x1: x + meia, z0: Math.max(a, -lim), z1: Math.min(b, lim), eixo: "z", faixa: true });
    }
    for (const z of zs) if (Math.abs(z) < lim) vias.push({ x0: x - meia, x1: x + meia, z0: z - meia, z1: z + meia, eixo: "x", faixa: false });
  }

  // ── Quadras e uso do solo ──
  const quadras: Quadra[] = [];
  const recuo = meia + CALCADA;
  for (let j = 0; j < xs.length - 1; j++) {
    for (let k = 0; k < zs.length - 1; k++) {
      const q = { x0: (xs[j] as number) + recuo, x1: (xs[j + 1] as number) - recuo, z0: (zs[k] as number) + recuo, z1: (zs[k + 1] as number) - recuo };
      const cx = (q.x0 + q.x1) / 2;
      const cz = (q.z0 + q.z1) / 2;
      const d = Math.hypot(cx, cz);
      if (d > ALCANCE + 60) continue;
      let uso: Uso;
      if (dentro(0, 0, q)) uso = "liwo";
      else if (dentro(4, BASE_Z + 30, q)) uso = "praca"; // em frente ao Liwo: a vista da rua fica aberta
      else {
        const t = r();
        const longe = d > 520;
        const perto = d < 260;
        if (perto) uso = t < 0.52 ? "casas" : t < 0.6 ? "vazio" : t < 0.78 ? "vertical" : t < 0.9 ? "praca" : "comercial";
        else if (longe) uso = t < 0.34 ? "casas" : t < 0.74 ? "vertical" : t < 0.86 ? "comercial" : t < 0.94 ? "praca" : "vazio";
        else uso = t < 0.46 ? "casas" : t < 0.7 ? "vertical" : t < 0.77 ? "vazio" : t < 0.89 ? "comercial" : "praca";
      }
      quadras.push({ ...q, uso, semente: Math.floor(r() * 1e9) });
    }
  }

  const predios: Volume[] = [];
  const casas: Casa[] = [];
  const arvores: Arvore[] = [];
  const piscinas: Piscina[] = [];
  const lote = P.lote;
  const livreDoLiwo = (x: number, z: number, m: number) => !dentro(x, z, lote, m) && !dentro(x, z, LIVRE);
  const arvore = (x: number, z: number, especie: Especie, escala: number, rr: () => number) => {
    if (!livreDoLiwo(x, z, 4)) return;
    arvores.push({ x, z, especie, escala, tom: rr(), giro: rr() * Math.PI * 2 });
  };
  // sibipirunas (amarelas) e flamboyants (vermelhos) florescem em novembro em Uberlândia
  const especieRua = (t: number): Especie => (t < 0.5 ? "copa" : t < 0.6 ? "ipe" : t < 0.68 ? "flamboyant" : t < 0.86 ? "palmeira" : "cone");

  for (const q of quadras) {
    const rr = gerador(q.semente);
    const W = q.x1 - q.x0;
    const D = q.z1 - q.z0;
    if (q.uso === "casas") {
      // duas fileiras de lotes de 12 m voltados para as ruas paralelas a x
      const n = Math.floor(W / 12);
      const sobra = (W - n * 12) / 2;
      for (const lado of [0, 1] as const) {
        for (let i = 0; i < n; i++) {
          if (rr() < 0.09) continue; // lote vago
          const cx = q.x0 + sobra + i * 12 + 6;
          const larg = 8 + rr() * 2;
          const prof = 10 + rr() * 6;
          const recuoFrente = 4 + rr() * 2.5;
          const cz = lado === 0 ? q.z0 + recuoFrente + prof / 2 : q.z1 - recuoFrente - prof / 2;
          const doisAndares = rr() < 0.42;
          const alt = doisAndares ? 6.2 + rr() * 0.8 : 3.1 + rr() * 0.6;
          const tt = rr();
          casas.push({ x: cx + (rr() - 0.5) * 1.2, z: cz, larg, prof, alt, giro: 0, cor: Math.floor(rr() * 6), telhado: tt < 0.38 ? 0 : tt < 0.72 ? 1 : 2, corTelhado: Math.floor(rr() * 3) });
          if (rr() < 0.3) arvore(cx + (rr() < 0.5 ? -4.6 : 4.6), lado === 0 ? q.z0 + 2.2 : q.z1 - 2.2, rr() < 0.4 ? "palmeira" : "copa", 0.7 + rr() * 0.35, rr);
          if (rr() < 0.14) arvore(cx + (rr() - 0.5) * 6, (q.z0 + q.z1) / 2 + (rr() - 0.5) * 8, "copa", 0.8 + rr() * 0.4, rr);
        }
      }
    } else if (q.uso === "vertical") {
      // condomínio de 1 a 3 torres com piscina e jardim
      const n = 1 + Math.floor(rr() * 2.6);
      const andaresBase = Math.hypot((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2) > 520 ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const larg = 18 + rr() * 8;
        const prof = 16 + rr() * 7;
        const cx = q.x0 + ((i + 0.5) / n) * W + (rr() - 0.5) * 6;
        const cz = q.z0 + 14 + prof / 2 + rr() * Math.max(0, D - prof - 28);
        const andares = andaresBase + Math.floor(rr() * 16);
        const cor = Math.floor(rr() * 6);
        const alt = andares * 3 + 2;
        predios.push({ x: cx, z: cz, larg, prof, alt, giro: 0, cor });
        predios.push({ x: cx, z: cz, larg: larg + 8, prof: prof + 8, alt: 4.5, giro: 0, cor: 6 }); // embasamento
        // volumes que quebram a caixa: casa de máquinas no topo, prumada de varandas e, às vezes, um corpo lateral mais baixo
        predios.push({ x: cx + (rr() - 0.5) * larg * 0.3, z: cz, larg: larg * 0.38, prof: prof * 0.42, alt: alt + 3.6, giro: 0, cor: 6 });
        predios.push({ x: cx, z: cz + prof / 2 + 0.7, larg: larg * 0.56, prof: 1.6, alt: alt - 3, giro: 0, cor: (cor + 1) % 6 });
        if (rr() < 0.45) predios.push({ x: cx + larg / 2 + 3, z: cz, larg: 7, prof: prof * 0.7, alt: alt * (0.55 + rr() * 0.25), giro: 0, cor });
      }
      piscinas.push({ x: q.x0 + W * (0.25 + rr() * 0.5), z: q.z1 - 9, larg: 12 + rr() * 6, prof: 5 + rr() * 2 });
      for (let i = 0; i < 7; i++) arvore(q.x0 + 3 + rr() * (W - 6), q.z1 - 3 - rr() * 14, rr() < 0.5 ? "palmeira" : "copa", 0.7 + rr() * 0.5, rr);
    } else if (q.uso === "comercial") {
      const n = 1 + Math.floor(rr() * 2);
      for (let i = 0; i < n; i++) {
        const larg = 28 + rr() * 26;
        const prof = 22 + rr() * 16;
        const cx = q.x0 + ((i + 0.5) / n) * W;
        const cz = q.z0 + prof / 2 + 6 + rr() * 8;
        predios.push({ x: cx, z: cz, larg: Math.min(larg, W / n - 6), prof, alt: 6 + rr() * 7, giro: 0, cor: 6 + Math.floor(rr() * 2) });
      }
      for (let i = 0; i < 6; i++) arvore(q.x0 + 4 + rr() * (W - 8), q.z1 - 4, "copa", 0.7 + rr() * 0.3, rr);
    } else if (q.uso === "praca") {
      const n = 18 + Math.floor(rr() * 14);
      for (let i = 0; i < n; i++) {
        const x = q.x0 + 3 + rr() * (W - 6);
        const z = q.z0 + 3 + rr() * (D - 6);
        // deixa o centro (gramado e caminhos) mais aberto
        const dc = Math.hypot((x - (q.x0 + q.x1) / 2) / W, (z - (q.z0 + q.z1) / 2) / D);
        if (dc < 0.18 && rr() < 0.8) continue;
        arvore(x, z, rr() < 0.6 ? "copa" : rr() < 0.4 ? "ipe" : rr() < 0.5 ? "flamboyant" : "palmeira", 0.8 + rr() * 0.6, rr);
      }
    } else {
      // terreno vago (inclui o resto da quadra do Liwo): capim, terra e árvores retorcidas de cerrado
      const n = q.uso === "liwo" ? 16 : 5 + Math.floor(rr() * 8);
      for (let i = 0; i < n; i++) arvore(q.x0 + 3 + rr() * (W - 6), q.z0 + 3 + rr() * (D - 6), "cerrado", 0.7 + rr() * 0.6, rr);
    }
  }

  // ── Árvores e postes de calçada nas ruas mais próximas ──
  const postes: Poste[] = [];
  const passeio = meia + 1.3;
  const perto = (x: number, z: number, raio: number) => Math.hypot(x, z) < raio;
  const naEsquina = (x: number, z: number) => xs.some((xx) => Math.abs(x - xx) < meia + 7) && zs.some((zz) => Math.abs(z - zz) < meia + 7);
  for (const z of zs) {
    for (let x = -ALCANCE; x <= ALCANCE; x += 19 + r() * 6) {
      for (const lado of [-1, 1]) {
        const zz = z + lado * passeio;
        if (!perto(x, zz, 390) || naEsquina(x, zz) || r() < 0.32) continue;
        // frente do Liwo: só as quatro árvores dos renders
        if (lado === -1 && Math.abs(z - BASE_Z) < 1 && x > lote.x0 - 8 && x < lote.x1 + 8) continue;
        arvore(x, zz, especieRua(r()), 0.62 + r() * 0.3, r);
      }
    }
    for (let x = -ALCANCE, i = 0; x <= ALCANCE; x += 34, i++) {
      const lado = i % 2 ? 1 : -1;
      const zz = z + lado * (meia + 0.5);
      if (!perto(x, zz, 380) || naEsquina(x, zz) || !livreDoLiwo(x, zz, 1)) continue;
      postes.push({ x, z: zz, giro: lado > 0 ? Math.PI : 0 });
    }
  }
  for (const x of xs) {
    for (let z = -ALCANCE; z <= ALCANCE; z += 19 + r() * 6) {
      for (const lado of [-1, 1]) {
        const xx = x + lado * passeio;
        if (!perto(xx, z, 390) || naEsquina(xx, z) || r() < 0.32) continue;
        arvore(xx, z, especieRua(r()), 0.62 + r() * 0.3, r);
      }
    }
    for (let z = -ALCANCE, i = 0; z <= ALCANCE; z += 34, i++) {
      const lado = i % 2 ? 1 : -1;
      const xx = x + lado * (meia + 0.5);
      if (!perto(xx, z, 380) || naEsquina(xx, z) || !livreDoLiwo(xx, z, 1)) continue;
      postes.push({ x: xx, z, giro: lado > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
  }
  // as quatro árvores de calçada dos renders, em frente ao Liwo
  for (const x of [-16, -4, 8, 22]) arvores.push({ x, z: lote.z1 + 3.2, especie: "copa", escala: 0.55, tom: 0.5, giro: x });

  // ── Skyline ao longe: centro de Uberlândia (ao norte) e torres esparsas em volta ──
  const centro = { x: -420, z: 1250 };
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.7) * 380;
    const x = centro.x + Math.cos(a) * d;
    const z = centro.z + Math.sin(a) * d;
    const alt = 30 + Math.pow(r(), 1.6) * 95 * (1 - d / 520);
    const [larg, prof, giro] = [18 + r() * 20, 16 + r() * 18, r() * Math.PI];
    predios.push({ x, z, larg, prof, alt, giro, cor: Math.floor(r() * 6) });
    if (r() < 0.6) predios.push({ x, z, larg: larg * 0.45, prof: prof * 0.45, alt: alt + 4 + r() * 6, giro, cor: 6 });
  }
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI * 2;
    const d = ALCANCE + 120 + r() * 900;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(x - centro.x, z - centro.z) < 420) continue;
    predios.push({ x, z, larg: 16 + r() * 16, prof: 14 + r() * 14, alt: 18 + Math.pow(r(), 2) * 60, giro: r() * Math.PI, cor: Math.floor(r() * 6) });
  }

  return { quadras, vias, predios, casas, arvores, postes, piscinas, meioLado: lim };
}
