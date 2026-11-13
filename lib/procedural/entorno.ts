/**
 * Entorno urbano procedural do Liwo: malha de quadras do Parque Sul Karaíba (Uberlândia) com ruas,
 * calçadas, casas, condomínios verticais, comércio, praças, terrenos vazios de cerrado e o skyline
 * ao longe. Tudo é determinístico (mesma semente) e pensado para instâncias: poucas chamadas de desenho.
 *
 * ILUSTRATIVO: a Maxi não forneceu o entorno real; a malha só reproduz o padrão do bairro
 * (quadras retangulares, casas de 1 e 2 pavimentos, torres esparsas e muitos lotes vagos).
 */
import { P } from "./predio";

export type Uso = "liwo" | "casas" | "vertical" | "vazio" | "praca" | "comercial" | "parque" | "mata";
export type Especie = "copa" | "ipe" | "flamboyant" | "palmeira" | "cone" | "cerrado";

export interface Quadra { x0: number; x1: number; z0: number; z1: number; uso: Uso; semente: number }
export interface Via { x0: number; x1: number; z0: number; z1: number; eixo: "x" | "z"; faixa: boolean }
export interface Volume { x: number; z: number; larg: number; prof: number; alt: number; giro: number; cor: number }
export interface Casa extends Volume { telhado: 0 | 1 | 2; corTelhado: number }
export interface Arvore { x: number; z: number; escala: number; especie: Especie; tom: number; giro: number }
export interface Poste { x: number; z: number; giro: number }
export interface Piscina { x: number; z: number; larg: number; prof: number }
/** Muro ou portão de frente de lote (caixa alinhada, `cor` 0–4 muro, 5 portão de metal). */
export interface Muro { x: number; z: number; larg: number; prof: number; alt: number; cor: number }
/** Carro parado junto ao meio-fio ou andando na faixa. */
export interface Carro { x: number; z: number; giro: number; cor: number }

export interface Entorno {
  quadras: Quadra[];
  vias: Via[];
  predios: Volume[];
  casas: Casa[];
  arvores: Arvore[];
  postes: Poste[];
  piscinas: Piscina[];
  muros: Muro[];
  carros: Carro[];
  /** Metade do lado do quadrado coberto pela textura do chão (m). */
  meioLado: number;
}

export const LARG_RUA = 10;
/** Índices da paleta de fachadas (Entorno.tsx) usados nas torres: brancos, beges e cinzas, como no skyline real. */
const CORES_TORRE = [0, 1, 2, 3, 4, 7];
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

/**
 * Onde fica a mata: na foto aérea oficial o Liwo encosta numa grande área de mata densa (à direita e atrás),
 * com o bairro de casas do outro lado e os prédios só bem longe. Campo suave, para formar manchas contínuas.
 */
export function campoMata(x: number, z: number): number {
  return 0.55 * Math.sin(x * 0.0065 + 0.8) + 0.45 * Math.cos(z * 0.0072 - 0.4) + 0.35 * Math.sin((x - z) * 0.011 + 2.1) + (x > 40 ? 0.55 : -0.25);
}

const dentro = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }, m = 0) =>
  x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** Linha do caminho sinuoso do parque linear (z em função de x), usada nas árvores e na textura do chão. */
export function caminhoParque(q: { x0: number; x1: number; z0: number; z1: number }, x: number): number {
  return (q.z0 + q.z1) / 2 + Math.sin(x * 0.045) * (q.z1 - q.z0) * 0.18;
}

export function gerarEntorno(): Entorno {
  const r = gerador(1855); // número do Liwo na rua João Severiano Rodrigues da Cunha
  const zs: number[] = [];
  const xs: number[] = [];
  for (let k = -9; k <= 9; k++) zs.push(BASE_Z + k * PASSO_Z);
  for (let j = -8; j <= 8; j++) xs.push(BASE_X + j * PASSO_X);
  const lim = MEIO_LADO;
  const meia = LARG_RUA / 2;

  // ── Uso do solo por quadra (antes das ruas: entre duas quadras de mata não passa rua) ──
  const recuo = meia + CALCADA;
  const usos = new Map<string, Uso>();
  const chave = (j: number, k: number) => `${j},${k}`;
  const celula = (j: number, k: number) => ({ x0: (xs[j] as number) + recuo, x1: (xs[j + 1] as number) - recuo, z0: (zs[k] as number) + recuo, z1: (zs[k + 1] as number) - recuo });
  for (let j = 0; j < xs.length - 1; j++) {
    for (let k = 0; k < zs.length - 1; k++) {
      const q = celula(j, k);
      const cx = (q.x0 + q.x1) / 2;
      const cz = (q.z0 + q.z1) / 2;
      const d = Math.hypot(cx, cz);
      if (d > ALCANCE + 60) continue;
      let uso: Uso;
      if (dentro(0, 0, q)) uso = "liwo";
      // Parque Sul Karaíba: parque linear com árvores adultas que "abraça as torres" (Maxi / Udicult, 2025).
      // A posição exata não é pública: fica em frente ao Liwo, ao longo da rua, o que mantém a vista aberta.
      else if (q.z0 < BASE_Z + 30 && q.z1 > BASE_Z + 30 && Math.abs(cx - 4) < PASSO_X * 1.6) uso = "parque";
      else if (d < 620 && campoMata(cx, cz) > 0.25) uso = "mata";
      else {
        // perto do Liwo, bairro de casas (foto aérea); prédios só a partir de ~450 m e mais longe
        const t = r();
        const longe = d > 520;
        const perto = d < 300;
        if (perto) uso = t < 0.78 ? "casas" : t < 0.88 ? "praca" : t < 0.94 ? "vazio" : "comercial";
        else if (longe) uso = t < 0.4 ? "casas" : t < 0.7 ? "vertical" : t < 0.84 ? "comercial" : t < 0.94 ? "praca" : "vazio";
        else uso = t < 0.64 ? "casas" : t < 0.74 ? "vertical" : t < 0.8 ? "vazio" : t < 0.9 ? "comercial" : "praca";
      }
      usos.set(chave(j, k), uso);
    }
  }
  const ehMata = (j: number, k: number) => usos.get(chave(j, k)) === "mata";

  // ── Vias: trechos entre cruzamentos (sem sobreposição) e os próprios cruzamentos; não cortam a mata ──
  const vias: Via[] = [];
  zs.forEach((z, k) => {
    if (Math.abs(z) > lim) return;
    for (let j = 0; j < xs.length - 1; j++) {
      const a = (xs[j] as number) + meia;
      const b = (xs[j + 1] as number) - meia;
      if (b < -lim || a > lim) continue;
      if (ehMata(j, k - 1) && ehMata(j, k)) continue;
      vias.push({ x0: Math.max(a, -lim), x1: Math.min(b, lim), z0: z - meia, z1: z + meia, eixo: "x", faixa: true });
    }
  });
  xs.forEach((x, j) => {
    if (Math.abs(x) > lim) return;
    for (let k = 0; k < zs.length - 1; k++) {
      const a = (zs[k] as number) + meia;
      const b = (zs[k + 1] as number) - meia;
      if (b < -lim || a > lim) continue;
      if (ehMata(j - 1, k) && ehMata(j, k)) continue;
      vias.push({ x0: x - meia, x1: x + meia, z0: Math.max(a, -lim), z1: Math.min(b, lim), eixo: "z", faixa: true });
    }
    zs.forEach((z, k) => {
      if (Math.abs(z) >= lim) return;
      if (ehMata(j - 1, k - 1) && ehMata(j, k - 1) && ehMata(j - 1, k) && ehMata(j, k)) return;
      vias.push({ x0: x - meia, x1: x + meia, z0: z - meia, z1: z + meia, eixo: "x", faixa: false });
    });
  });

  // ── Quadras: a mata avança sobre a rua que não existe mais, até emendar com a vizinha ──
  const quadras: Quadra[] = [];
  for (let j = 0; j < xs.length - 1; j++) {
    for (let k = 0; k < zs.length - 1; k++) {
      const uso = usos.get(chave(j, k));
      if (!uso) continue;
      const q = celula(j, k);
      if (uso === "mata") {
        if (ehMata(j - 1, k)) q.x0 = xs[j] as number;
        if (ehMata(j + 1, k)) q.x1 = xs[j + 1] as number;
        if (ehMata(j, k - 1)) q.z0 = zs[k] as number;
        if (ehMata(j, k + 1)) q.z1 = zs[k + 1] as number;
      }
      quadras.push({ ...q, uso, semente: Math.floor(r() * 1e9) });
    }
  }
  /** O ponto cai dentro de uma quadra de mata (sem rua, árvore de calçada nem poste). */
  const naMata = (x: number, z: number) => quadras.some((q) => q.uso === "mata" && x > q.x0 - 1 && x < q.x1 + 1 && z > q.z0 - 1 && z < q.z1 + 1);

  const predios: Volume[] = [];
  const casas: Casa[] = [];
  const arvores: Arvore[] = [];
  const piscinas: Piscina[] = [];
  const muros: Muro[] = [];
  const carros: Carro[] = [];
  const lote = P.lote;
  const livreDoLiwo = (x: number, z: number, m: number) => !dentro(x, z, lote, m) && !dentro(x, z, LIVRE);
  const arvore = (x: number, z: number, especie: Especie, escala: number, rr: () => number) => {
    if (!livreDoLiwo(x, z, 4)) return;
    arvores.push({ x, z, especie, escala, tom: rr(), giro: rr() * Math.PI * 2 });
  };
  // sibipirunas (amarelas) e flamboyants (vermelhos) florescem em novembro em Uberlândia
  // menos copas floridas que antes: na foto aérea o verde domina
  const especieRua = (t: number): Especie => (t < 0.6 ? "copa" : t < 0.66 ? "ipe" : t < 0.7 ? "flamboyant" : t < 0.86 ? "palmeira" : "cone");

  for (const q of quadras) {
    const rr = gerador(q.semente);
    const W = q.x1 - q.x0;
    const D = q.z1 - q.z0;
    if (q.uso === "casas") {
      // duas fileiras de lotes voltados para as ruas paralelas a x. Perto do Liwo é o Karaíba de alto padrão
      // (sobrados em lotes de ~20 m, muitos com piscina, e condomínios fechados com muro); mais longe, lotes de 12 m
      const alto = Math.hypot((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2) < 430;
      const loteL = alto ? 20 : 12;
      const n = Math.floor(W / loteL);
      const sobra = (W - n * loteL) / 2;
      const condominio = alto && rr() < 0.4;
      if (condominio) {
        // condomínio horizontal fechado: muro claro em volta da quadra
        const [mx, mz] = [(q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2];
        predios.push({ x: mx, z: q.z0 + 0.15, larg: W, prof: 0.3, alt: 2.8, giro: 0, cor: 7 }, { x: mx, z: q.z1 - 0.15, larg: W, prof: 0.3, alt: 2.8, giro: 0, cor: 7 });
        predios.push({ x: q.x0 + 0.15, z: mz, larg: 0.3, prof: D, alt: 2.8, giro: 0, cor: 7 }, { x: q.x1 - 0.15, z: mz, larg: 0.3, prof: D, alt: 2.8, giro: 0, cor: 7 });
      }
      for (const lado of [0, 1] as const) {
        for (let i = 0; i < n; i++) {
          if (rr() < 0.09) continue; // lote vago
          const cx = q.x0 + sobra + i * loteL + loteL / 2;
          const larg = alto ? 12.5 + rr() * 4 : 8 + rr() * 2;
          const prof = alto ? 12 + rr() * 5 : 10 + rr() * 6;
          const recuoFrente = alto ? 5 + rr() * 2 : 4 + rr() * 2.5;
          const cz = lado === 0 ? q.z0 + recuoFrente + prof / 2 : q.z1 - recuoFrente - prof / 2;
          if (alto && rr() < 0.45) piscinas.push({ x: cx + (rr() - 0.5) * 4, z: lado === 0 ? cz + prof / 2 + 4.6 : cz - prof / 2 - 4.6, larg: 7 + rr() * 3, prof: 3.4 + rr() * 1.4 });
          const doisAndares = rr() < (alto ? 0.72 : 0.42);
          const alt = doisAndares ? 6.2 + rr() * 0.8 : 3.1 + rr() * 0.6;
          const tt = rr();
          casas.push({ x: cx + (rr() - 0.5) * 1.2, z: cz, larg, prof, alt, giro: 0, cor: Math.floor(rr() * 6), telhado: tt < 0.38 ? 0 : tt < 0.72 ? 1 : 2, corTelhado: Math.floor(rr() * 3) });
          // muro e portão na frente do lote (fora dos condomínios), como nas ruas de Uberlândia
          const zf = lado === 0 ? q.z0 + 0.1 : q.z1 - 0.1;
          if (!condominio) {
            const x0 = cx - loteL / 2 + 0.05;
            const x1 = cx + loteL / 2 - 0.05;
            const g0 = x1 - 3.6; // portão de garagem (3 m) perto da divisa
            const altM = 1.9 + rr() * 0.6;
            const corM = Math.floor(rr() * 5);
            muros.push({ x: (x0 + g0) / 2, z: zf, larg: g0 - x0, prof: 0.16, alt: altM, cor: corM });
            muros.push({ x: (g0 + 3 + x1) / 2, z: zf, larg: x1 - g0 - 3, prof: 0.16, alt: altM, cor: corM });
            muros.push({ x: g0 + 1.5, z: zf, larg: 3, prof: 0.06, alt: altM - 0.1, cor: 5 });
          }
          // carro parado na rua, junto ao meio-fio da frente do lote
          if (rr() < (alto ? 0.3 : 0.4)) carros.push({ x: cx + (rr() - 0.5) * 4, z: lado === 0 ? q.z0 - CALCADA - 1.15 : q.z1 + CALCADA + 1.15, giro: rr() < 0.5 ? 0 : Math.PI, cor: Math.floor(rr() * 7) });
          if (rr() < (alto ? 0.55 : 0.3)) arvore(cx + (rr() < 0.5 ? -loteL * 0.38 : loteL * 0.38), lado === 0 ? q.z0 + 2.2 : q.z1 - 2.2, rr() < 0.4 ? "palmeira" : "copa", 0.7 + rr() * 0.35, rr);
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
        const cor = CORES_TORRE[Math.floor(rr() * CORES_TORRE.length)] as number;
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
    } else if (q.uso === "parque") {
      // árvores adultas e densas dos dois lados de um caminho sinuoso; a ciclovia corre na borda da frente
      const n = Math.floor((W * D) / 60);
      for (let i = 0; i < n; i++) {
        const x = q.x0 + 2 + rr() * (W - 4);
        const z = q.z0 + 5 + rr() * (D - 7);
        if (Math.abs(z - caminhoParque(q, x)) < 3.2) continue;
        const t = rr();
        arvore(x, z, t < 0.74 ? "copa" : t < 0.82 ? "ipe" : t < 0.86 ? "flamboyant" : "cerrado", 1.05 + rr() * 0.6, rr);
      }
    } else if (q.uso === "mata") {
      // a massa da mata é uma copa contínua (Entorno.tsx); aqui só as árvores da borda, vistas da rua
      if (Math.hypot((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2) < 420) {
        const borda = (x: number, z: number) => {
          const t = rr();
          arvore(x, z, t < 0.55 ? "copa" : t < 0.8 ? "cerrado" : t < 0.92 ? "ipe" : "flamboyant", 1.0 + rr() * 0.7, rr);
        };
        // só nos lados que dão para a rua (do lado de outra quadra de mata a copa é contínua)
        const [cx, cz] = [(q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2];
        const ruaZ0 = !naMata(cx, q.z0 - 4);
        const ruaZ1 = !naMata(cx, q.z1 + 4);
        const ruaX0 = !naMata(q.x0 - 4, cz);
        const ruaX1 = !naMata(q.x1 + 4, cz);
        for (let x = q.x0 + 3; x < q.x1 - 3; x += 7 + rr() * 5) {
          if (ruaZ0) borda(x, q.z0 + 2.5 + rr() * 2);
          if (ruaZ1) borda(x, q.z1 - 2.5 - rr() * 2);
        }
        for (let z = q.z0 + 8; z < q.z1 - 8; z += 7 + rr() * 5) {
          if (ruaX0) borda(q.x0 + 2.5 + rr() * 2, z);
          if (ruaX1) borda(q.x1 - 2.5 - rr() * 2, z);
        }
      }
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
    // arborização de rua cheia (uma árvore a cada ~13 m de calçada, como nos bairros de Uberlândia)
    for (let x = -ALCANCE; x <= ALCANCE; x += 11 + r() * 5) {
      for (const lado of [-1, 1]) {
        const zz = z + lado * passeio;
        if (!perto(x, zz, 390) || naEsquina(x, zz) || r() < 0.18 || naMata(x, zz)) continue;
        // frente do Liwo: só as quatro árvores dos renders
        if (lado === -1 && Math.abs(z - BASE_Z) < 1 && x > lote.x0 - 8 && x < lote.x1 + 8) continue;
        arvore(x, zz, especieRua(r()), 0.62 + r() * 0.3, r);
      }
    }
    for (let x = -ALCANCE, i = 0; x <= ALCANCE; x += 34, i++) {
      const lado = i % 2 ? 1 : -1;
      const zz = z + lado * (meia + 0.5);
      if (!perto(x, zz, 380) || naEsquina(x, zz) || !livreDoLiwo(x, zz, 1) || naMata(x, zz)) continue;
      postes.push({ x, z: zz, giro: lado > 0 ? Math.PI : 0 });
    }
  }
  for (const x of xs) {
    for (let z = -ALCANCE; z <= ALCANCE; z += 11 + r() * 5) {
      for (const lado of [-1, 1]) {
        const xx = x + lado * passeio;
        if (!perto(xx, z, 390) || naEsquina(xx, z) || r() < 0.18 || naMata(xx, z)) continue;
        arvore(xx, z, especieRua(r()), 0.62 + r() * 0.3, r);
      }
    }
    for (let z = -ALCANCE, i = 0; z <= ALCANCE; z += 34, i++) {
      const lado = i % 2 ? 1 : -1;
      const xx = x + lado * (meia + 0.5);
      if (!perto(xx, z, 380) || naEsquina(xx, z) || !livreDoLiwo(xx, z, 1) || naMata(xx, z)) continue;
      postes.push({ x: xx, z, giro: lado > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
  }
  // carros andando nas ruas perto do Liwo (mão dupla: cada sentido na sua faixa)
  for (const v of vias) {
    if (!v.faixa) continue;
    const comp = v.eixo === "x" ? v.x1 - v.x0 : v.z1 - v.z0;
    const [mx, mz] = [(v.x0 + v.x1) / 2, (v.z0 + v.z1) / 2];
    if (Math.hypot(mx, mz) > 420) continue;
    const n = Math.floor(comp / 45);
    for (let i = 0; i < n; i++) {
      if (r() < 0.55) continue;
      const t = (i + 0.2 + r() * 0.6) / Math.max(n, 1);
      const lado = r() < 0.5 ? -1 : 1;
      // o carro é modelado ao longo de x (frente em +x)
      if (v.eixo === "x") carros.push({ x: v.x0 + comp * t, z: mz + lado * 2.4, giro: lado < 0 ? 0 : Math.PI, cor: Math.floor(r() * 7) });
      else carros.push({ x: mx + lado * 2.4, z: v.z0 + comp * t, giro: lado < 0 ? -Math.PI / 2 : Math.PI / 2, cor: Math.floor(r() * 7) });
    }
  }
  // nada de carro na frente do Liwo nem em volta da câmera da introdução
  const carrosLivres = carros.filter((c) => livreDoLiwo(c.x, c.z, 6));

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
    predios.push({ x, z, larg, prof, alt, giro, cor: CORES_TORRE[Math.floor(r() * CORES_TORRE.length)] as number });
    if (r() < 0.6) predios.push({ x, z, larg: larg * 0.45, prof: prof * 0.45, alt: alt + 4 + r() * 6, giro, cor: 6 });
  }
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI * 2;
    const d = ALCANCE + 120 + r() * 900;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(x - centro.x, z - centro.z) < 420) continue;
    predios.push({ x, z, larg: 16 + r() * 16, prof: 14 + r() * 14, alt: 18 + Math.pow(r(), 2) * 60, giro: r() * Math.PI, cor: CORES_TORRE[Math.floor(r() * CORES_TORRE.length)] as number });
  }

  return { quadras, vias, predios, casas, arvores, postes, piscinas, muros, carros: carrosLivres, meioLado: lim };
}
