import type { Abertura, Comodo, TipoPlanta, Vec2 } from "../types";

/** Altura livre do apartamento e espessura das paredes (m). */
export const PE_LIVRE = 2.6;
export const ESPESSURA = 0.1;
/** Altura do corte das paredes no modo maquete. */
export const CORTE = 1.2;

export interface Ret {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface Bloco extends Ret {
  y0: number;
  y1: number;
}

interface Linha {
  eixo: "x" | "z"; // coordenada constante
  c: number;
  trechos: [number, number][];
}

const EPS = 1e-4;

function unir(trechos: [number, number][]): [number, number][] {
  const ord = [...trechos].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of ord) {
    const ult = out[out.length - 1];
    if (ult && a <= ult[1] + EPS) ult[1] = Math.max(ult[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Junta as arestas de todos os cômodos em linhas de parede, sem duplicar as paredes compartilhadas. */
function linhasDeParede(t: TipoPlanta): Linha[] {
  const mapa = new Map<string, Linha>();
  for (const c of t.comodos) {
    c.poligono.forEach((p, i) => {
      const q = c.poligono[(i + 1) % c.poligono.length] as Vec2;
      const vertical = Math.abs(p[0] - q[0]) < EPS;
      const horizontal = Math.abs(p[1] - q[1]) < EPS;
      if (!vertical && !horizontal) throw new Error(`Cômodo "${c.id}": só são aceitas paredes alinhadas aos eixos.`);
      const eixo = vertical ? "x" : "z";
      const cte = vertical ? p[0] : p[1];
      const a = vertical ? p[1] : p[0];
      const b = vertical ? q[1] : q[0];
      const chave = `${eixo}:${cte.toFixed(3)}`;
      const l = mapa.get(chave) ?? { eixo, c: cte, trechos: [] };
      l.trechos.push([Math.min(a, b), Math.max(a, b)]);
      mapa.set(chave, l);
    });
  }
  return [...mapa.values()].map((l) => ({ ...l, trechos: unir(l.trechos) }));
}

function naLinha(a: Abertura, l: Linha): [number, number] | null {
  const i = l.eixo === "x" ? 0 : 1;
  const j = 1 - i;
  const p1 = a.p1 as number[];
  const p2 = a.p2 as number[];
  if (Math.abs((p1[i] as number) - l.c) > EPS || Math.abs((p2[i] as number) - l.c) > EPS) return null;
  return [Math.min(p1[j] as number, p2[j] as number), Math.max(p1[j] as number, p2[j] as number)];
}

function bloco(l: Linha, a: number, b: number, y0: number, y1: number, esp = ESPESSURA): Bloco {
  return l.eixo === "x"
    ? { x0: l.c - esp / 2, x1: l.c + esp / 2, z0: a, z1: b, y0, y1 }
    : { x0: a, x1: b, z0: l.c - esp / 2, z1: l.c + esp / 2, y0, y1 };
}

export interface Planta {
  /** Blocos de parede (com vergas e peitoris). */
  paredes: Bloco[];
  /** Retângulos que barram a câmera: paredes, janelas, guarda-corpo e porta de entrada. */
  barreiras: Ret[];
  /** Vãos de guarda-corpo e janelas, para desenhar grades e vidros. */
  aberturas: Abertura[];
}

/** Paredes do apartamento a partir dos polígonos dos cômodos e das aberturas. */
export function montarPlanta(t: TipoPlanta): Planta {
  const aberturas = [...t.portas, ...t.janelas];
  const paredes: Bloco[] = [];
  const barreiras: Ret[] = [];
  for (const l of linhasDeParede(t)) {
    const vaos = aberturas
      .map((a) => ({ a, faixa: naLinha(a, l) }))
      .filter((v): v is { a: Abertura; faixa: [number, number] } => v.faixa !== null)
      .sort((p, q) => p.faixa[0] - q.faixa[0]);
    for (const [ini, fim] of l.trechos) {
      let cursor = ini;
      for (const { a, faixa } of vaos) {
        if (faixa[1] <= ini + EPS || faixa[0] >= fim - EPS) continue;
        const [va, vb] = [Math.max(faixa[0], ini), Math.min(faixa[1], fim)];
        if (va > cursor + EPS) {
          paredes.push(bloco(l, cursor, va, 0, PE_LIVRE));
          barreiras.push(bloco(l, cursor, va, 0, 0));
        }
        const topo = a.peitoril + a.altura;
        if (a.tipo !== "guarda-corpo") {
          if (a.peitoril > EPS) paredes.push(bloco(l, va, vb, 0, a.peitoril));
          if (topo < PE_LIVRE - EPS) paredes.push(bloco(l, va, vb, topo, PE_LIVRE));
        }
        const passavel = (a.tipo === "porta" || a.tipo === "porta-correr" || a.tipo === "vao") && !a.liga?.includes("hall");
        if (!passavel) barreiras.push(bloco(l, va, vb, 0, 0));
        cursor = vb;
      }
      if (fim > cursor + EPS) {
        paredes.push(bloco(l, cursor, fim, 0, PE_LIVRE));
        barreiras.push(bloco(l, cursor, fim, 0, 0));
      }
    }
  }
  return { paredes, barreiras, aberturas };
}

export function dentroDoPoligono(pol: Vec2[], x: number, z: number): boolean {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, zi] = pol[i] as Vec2;
    const [xj, zj] = pol[j] as Vec2;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function comodoEm(t: TipoPlanta, x: number, z: number): Comodo | undefined {
  return t.comodos.find((c) => dentroDoPoligono(c.poligono, x, z));
}

/**
 * Caminho entre dois pontos passando pelas portas (busca em largura no grafo de cômodos).
 * Devolve os pontos intermediários e o destino.
 */
export function caminho(t: TipoPlanta, de: Vec2, para: Vec2): Vec2[] {
  const a = comodoEm(t, de[0], de[1]);
  const b = comodoEm(t, para[0], para[1]);
  if (!a || !b || a.id === b.id) return [para];
  const portas = t.portas.filter((p) => p.liga && !p.liga.includes("hall") && !p.liga.includes("exterior"));
  const fila: string[] = [a.id];
  const veio = new Map<string, { de: string; porta: Abertura }>();
  const visto = new Set([a.id]);
  while (fila.length > 0) {
    const atual = fila.shift() as string;
    if (atual === b.id) break;
    for (const p of portas) {
      const [u, v] = p.liga as [string, string];
      const prox = u === atual ? v : v === atual ? u : null;
      if (!prox || visto.has(prox)) continue;
      visto.add(prox);
      veio.set(prox, { de: atual, porta: p });
      fila.push(prox);
    }
  }
  if (!veio.has(b.id)) return [para];
  const pontos: Vec2[] = [para];
  let atual = b.id;
  while (atual !== a.id) {
    const passo = veio.get(atual);
    if (!passo) break;
    const { porta } = passo;
    const meio: Vec2 = [(porta.p1[0] + porta.p2[0]) / 2, (porta.p1[1] + porta.p2[1]) / 2];
    // um ponto antes e outro depois da porta, perpendiculares à parede
    const vertical = Math.abs(porta.p1[0] - porta.p2[0]) < EPS;
    const n: Vec2 = vertical ? [1, 0] : [0, 1];
    const lado = (c: string): Vec2 => {
      const com = t.comodos.find((x) => x.id === c);
      const p: Vec2 = [meio[0] + n[0] * 0.4, meio[1] + n[1] * 0.4];
      return com && dentroDoPoligono(com.poligono, p[0], p[1]) ? p : [meio[0] - n[0] * 0.4, meio[1] - n[1] * 0.4];
    };
    pontos.unshift(lado(passo.de), meio, lado(atual));
    atual = passo.de;
  }
  return pontos;
}

/** Empurra um círculo (a câmera) para fora dos retângulos. Devolve a posição corrigida. */
export function resolverColisao(x: number, z: number, raio: number, barreiras: Ret[]): [number, number] {
  let px = x;
  let pz = z;
  for (let passada = 0; passada < 2; passada++) {
    for (const r of barreiras) {
      const cx = Math.max(r.x0, Math.min(px, r.x1));
      const cz = Math.max(r.z0, Math.min(pz, r.z1));
      const dx = px - cx;
      const dz = pz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= raio * raio) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * raio;
        pz = cz + (dz / d) * raio;
      } else {
        // centro dentro do retângulo: sai pelo lado mais próximo
        const saidas: [number, number, number][] = [
          [px - r.x0, -1, 0], [r.x1 - px, 1, 0], [pz - r.z0, 0, -1], [r.z1 - pz, 0, 1],
        ];
        saidas.sort((m, n) => m[0] - n[0]);
        const [dist, sx, sz] = saidas[0] as [number, number, number];
        px += sx * (dist + raio);
        pz += sz * (dist + raio);
      }
    }
  }
  return [px, pz];
}

export function livre(x: number, z: number, raio: number, barreiras: Ret[]): boolean {
  const [px, pz] = resolverColisao(x, z, raio, barreiras);
  return Math.hypot(px - x, pz - z) < 1e-3;
}

export interface Limites {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
}

/** Caixa envolvente da planta inteira. */
export function limitesPlanta(t: TipoPlanta): Limites {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const c of t.comodos) {
    for (const [x, z] of c.poligono) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  }
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

