import * as THREE from "three";
import { sorteio } from "./canvas";
import { P, meioD, meioW } from "./predio";
import { Construtor, type Face, type Pecas } from "./torre";

export interface PainelSitio {
  tipo: "vitrine" | "perfurado" | "letreiro" | "escuro";
  posicao: [number, number, number];
  tamanho: [number, number];
  rotY: number;
}

export interface Sitio {
  pecas: Pecas;
  paineis: PainelSitio[];
  arvores: { x: number; y: number; z: number; escala: number }[];
  vizinhos: { x: number; z: number; larg: number; prof: number; alt: number }[];
}

const { x0, x1, z0, z1 } = P.lote;
/** Faces do embasamento, no mesmo sistema (u ao longo, w para fora) das fachadas da torre. */
const PF: Face = { ponto: (u, w) => [u, z1 + w], rotY: 0 };
const PD: Face = { ponto: (u, w) => [x1 + w, -u], rotY: Math.PI / 2 };
const PT: Face = { ponto: (u, w) => [-u, z0 - w], rotY: Math.PI };
const PE: Face = { ponto: (u, w) => [x0 - w, u], rotY: -Math.PI / 2 };

/** Contorno do embasamento no plano x/z. */
export function contornoLote(): [number, number][] {
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
}

/**
 * Grade de concreto dos quatro pavimentos de salas comerciais (render "embasamento"):
 * quadros de concreto, vidro com cortina clara e floreiras com vegetação pendente.
 */
function working(c: Construtor, f: Face, u0: number, u1: number, r: () => number): void {
  const n = Math.max(2, Math.round((u1 - u0) / 5.7));
  const passo = (u1 - u0) / n;
  for (let p = 0; p < 4; p++) {
    const y0 = P.terreo + p * P.working;
    // laje com borda grossa e floreira corrida
    c.caixaF(f, "concretoClaro", u0, u1, y0 - 0.12, y0 + 0.45, 0, 0.75);
    for (let i = 0; i < n; i++) {
      const a = u0 + i * passo;
      const b = a + passo;
      c.planoF(f, r() < 0.55 ? "janelaAcesa" : "janelaApagada", (a + b) / 2, y0 + 0.45 + (P.working - 0.45) / 2, 0.1, passo - 0.5, P.working - 0.5);
      if (r() < 0.82) c.floreira(f, a + 0.4, b - 0.4, y0 + 0.45, 0.45, r, 0.9);
    }
  }
  for (let i = 0; i <= n; i++) {
    const u = u0 + i * passo;
    c.caixaF(f, "concreto", u - 0.22, u + 0.22, P.terreo, P.podio, 0, 0.75);
  }
  c.caixaF(f, "concretoClaro", u0, u1, P.podio - 0.12, P.podio + 0.35, 0, 0.75);
}

/** Borda do pavimento de lazer: gradil de bronze e floreira com árvores. */
function lazer(c: Construtor, f: Face, u0: number, u1: number, r: () => number, arvores: Sitio["arvores"]): void {
  const y = P.podio + 0.35;
  c.planoF(f, "grade", (u0 + u1) / 2, y + 0.55, 0.62, u1 - u0, 1.05);
  c.caixaF(f, "bronze", u0, u1, y + 1.06, y + 1.11, 0.58, 0.64);
  c.floreira(f, u0 + 0.3, u1 - 0.3, y, 0.3, r, 1.3);
  for (let u = u0 + 2.5; u < u1 - 1.5; u += 7 + r() * 4) {
    const [x, z] = f.ponto(u, 0.2);
    arvores.push({ x, y, z, escala: 0.55 + r() * 0.25 });
  }
}

/** Embasamento (térreo, Working e lazer), entorno e vegetação. */
export function construirSitio(): Sitio {
  const c = new Construtor();
  const paineis: PainelSitio[] = [];
  const arvores: Sitio["arvores"] = [];
  const r = sorteio(77);
  const V = P.vitrine;
  const T0 = P.terreo;

  // ── Térreo: fachada ativa (vitrine) e painel perfurado iluminado com o nome ──
  const ent: [number, number] = [x0, x0 + 4.2]; // entrada residencial, recuada e escura
  c.caixa("grafite", ent[0], ent[1], 0, T0, z1 - 2.2, z1 - 2.0);
  c.caixa("concreto", ent[1] - 0.25, ent[1] + 0.25, 0, T0, z1 - 2.2, z1); // pilar
  paineis.push({ tipo: "vitrine", posicao: [(ent[1] + x1) / 2, V / 2, z1 - 0.6], tamanho: [x1 - ent[1] - 0.6, V], rotY: 0 });
  paineis.push({ tipo: "perfurado", posicao: [(ent[1] + x1) / 2, V + (T0 - V) / 2, z1 + 0.02], tamanho: [x1 - ent[1] - 0.4, T0 - V - 0.1], rotY: 0 });
  paineis.push({ tipo: "letreiro", posicao: [x1 - 6.2, V + (T0 - V) / 2, z1 + 0.06], tamanho: [7.2, 2.2], rotY: 0 });
  c.caixa("concreto", ent[1], x1, V - 0.15, V + 0.05, z1 - 0.6, z1 + 0.1);
  for (const u of [ent[1] + 3, (ent[1] + x1) / 2, x1 - 3]) c.plano("spot", u, V - 0.16, z1 - 0.25, 0.16, 0.16, 0, Math.PI / 2);
  c.plano("brilho", (ent[1] + x1) / 2, 0.02, z1 + 1.2, x1 - ent[1], 2.2, 0, -Math.PI / 2);
  // lateral direita do térreo: vitrine; fundos e esquerda: muro e portões
  paineis.push({ tipo: "vitrine", posicao: [x1 - 0.6, V / 2, (z0 + z1) / 2 + 6], tamanho: [z1 - z0 - 14, V], rotY: Math.PI / 2 });
  paineis.push({ tipo: "escuro", posicao: [x1 + 0.02, V + (T0 - V) / 2, (z0 + z1) / 2], tamanho: [z1 - z0, T0 - V], rotY: Math.PI / 2 });
  c.caixa("muro", x0 - 0.02, x0 + 0.05, 0, T0, z0, z1 - 2.2);
  c.caixa("muro", x0, x1, 0, T0, z0 - 0.05, z0 + 0.02);
  c.caixa("grafite", x0 - 0.05, x0 + 0.06, 0, 3.2, z0 + 3, z0 + 9); // portão da garagem

  // ── Working e lazer nas quatro faces ──
  working(c, PF, x0, x1, r);
  working(c, PD, -z1, -z0, r);
  working(c, PT, -x1, -x0, r);
  working(c, PE, z0, z1, r);
  lazer(c, PF, x0, x1, r, arvores);
  lazer(c, PD, -z1, -z0, r, arvores);
  lazer(c, PT, -x1, -x0, r, arvores);
  lazer(c, PE, z0, z1, r, arvores);
  // piso do lazer (deck) e pano de vidro dos ambientes fechados, sob a torre
  c.caixa("deck", x0 + 0.3, x1 - 0.3, P.podio + 0.3, P.podio + 0.36, z0 + 0.3, z1 - 0.3);
  const yv = P.podio + 0.36;
  const hv = P.base - 0.45 - yv;
  const rx = meioW - 0.5;
  const rz = meioD - 0.5;
  c.plano("janelaAcesa", 0, yv + hv / 2, rz, 2 * rx, hv, 0);
  c.plano("janelaAcesa", 0, yv + hv / 2, -rz, 2 * rx, hv, Math.PI);
  c.plano("janelaAcesa", rx, yv + hv / 2, 0, 2 * rz, hv, Math.PI / 2);
  c.plano("janelaAcesa", -rx, yv + hv / 2, 0, 2 * rz, hv, -Math.PI / 2);
  for (const [px, pz] of [[-rx, -rz], [rx, -rz], [-rx, rz], [rx, rz]] as const) c.caixa("concreto", px - 0.25, px + 0.25, yv, P.base, pz - 0.25, pz + 0.25);

  // ── Entorno: muros vizinhos, casas baixas, prédios distantes e muita mata (Parque Sul Karaíba) ──
  const vizinhos: Sitio["vizinhos"] = [];
  for (let i = 0; i < 70; i++) {
    const ang = r() * Math.PI * 2;
    const d = 45 + r() * 230;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (z > 20 && Math.abs(x) < 70) continue; // a rua da frente fica livre
    const alto = d > 160 && r() > 0.7;
    vizinhos.push({ x, z, larg: 8 + r() * 10, prof: 8 + r() * 10, alt: alto ? 20 + r() * 35 : 3 + r() * 4 });
  }
  // mata do entorno: mais densa ao longe, rala perto da torre para não esconder o prédio
  for (let i = 0; i < 260; i++) {
    const ang = r() * Math.PI * 2;
    const d = 40 + Math.pow(r(), 0.6) * 260;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (z > 18 && z < 34 && Math.abs(x) < 160) continue; // leito da rua
    if (d < 120 && r() < 0.6) continue;
    arvores.push({ x, y: 0, z, escala: 0.55 + r() * 0.5 });
  }
  // árvores de calçada, como nos renders
  for (const x of [-16, -4, 8, 22]) arvores.push({ x, y: 0, z: z1 + 3.2, escala: 0.55 });

  return { pecas: c.pecas, paineis, arvores, vizinhos };
}

/** Folhas pendentes das floreiras: plano com a base na origem, curvado para fora. */
export function geoFolhaPendente(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1, 1, 3);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, -p.getY(i) * p.getY(i) * 0.5 + Math.abs(p.getX(i)) * 0.2);
  g.computeVertexNormals();
  return g;
}
