import * as THREE from "three";
import { sorteio } from "./canvas";
import { P } from "./predio";
import { Construtor, type Pecas } from "./torre";

export interface PainelSitio {
  tipo: "arcos" | "trelica" | "trelicaEscura" | "hall" | "letreiro";
  posicao: [number, number, number];
  tamanho: [number, number];
  rotY: number;
}

export interface Sitio {
  pecas: Pecas;
  paineis: PainelSitio[];
  /** Base das palmeiras e altura do estipe. */
  palmeiras: { x: number; z: number; altura: number }[];
  arvores: { x: number; z: number; escala: number }[];
  vasos: { x: number; z: number }[];
  vizinhos: { x: number; z: number; larg: number; prof: number; alt: number }[];
}

/** Contorno do embasamento (com a esquina chanfrada), no plano x/z. */
export function contornoLote(): [number, number][] {
  const { x0, x1, z0, z1, chanfro } = P.lote;
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1 - chanfro],
    [x1 - chanfro, z1],
    [x0, z1],
  ];
}

/** Embasamento, portaria (render 02), muro com painéis (render 01) e entorno. */
export function construirSitio(): Sitio {
  const c = new Construtor();
  const { x0, x1, z0, z1, chanfro } = P.lote;
  const B = P.podio;
  const paineis: PainelSitio[] = [];
  const palmeiras: Sitio["palmeiras"] = [];
  const vasos: Sitio["vasos"] = [];

  // Platibanda e piso do embasamento (o bloco em si é extrudado no componente)
  c.caixa("deck", x0 + 0.5, x1 - 0.5 - chanfro * 0.4, B, B + 0.06, z0 + 0.5, z1 - 0.5 - chanfro * 0.4);

  // ── Frente: hall de vidro com pé-direito duplo ────────────────
  const zf = z1;
  const hallX: [number, number] = [-9.7, -5.3];
  const hHall = 6.6;
  c.caixa("grafite", x0, hallX[0], 0, hHall + 0.5, zf - 1.2, zf + 0.25); // revestimento grafite à esquerda
  c.caixa("branco", hallX[0] - 0.35, hallX[1] + 3.6, hHall, hHall + 0.5, zf - 1.2, zf + 0.9); // marquise branca
  c.caixa("branco", hallX[0], hallX[1], 3.15, 3.42, zf + 0.02, zf + 0.5); // faixa intermediária
  paineis.push({ tipo: "hall", posicao: [(hallX[0] + hallX[1]) / 2, hHall / 2, zf + 0.03], tamanho: [hallX[1] - hallX[0], hHall], rotY: 0 });
  for (const u of [-8.9, -7.5, -6.1]) {
    c.plano("spot", u, hHall - 0.005, zf + 0.5, 0.16, 0.16, 0, Math.PI / 2);
    c.plano("spot", u, 3.145, zf + 0.28, 0.13, 0.13, 0, Math.PI / 2);
  }
  c.plano("brilho", -7.5, hHall - 0.01, zf + 0.45, 5.2, 1.5, 0, Math.PI / 2);
  vasos.push({ x: -9.2, z: zf + 0.75 }, { x: -5.85, z: zf + 0.75 });

  // painel de arcos iluminados ao lado do hall
  const arcosX: [number, number] = [hallX[1], hallX[1] + 3.3];
  c.caixa("muro", arcosX[0], arcosX[1], 0, hHall, zf - 0.5, zf + 0.12);
  paineis.push({ tipo: "arcos", posicao: [(arcosX[0] + arcosX[1]) / 2, hHall / 2, zf + 0.13], tamanho: [arcosX[1] - arcosX[0], hHall], rotY: 0 });
  for (const u of [arcosX[0] + 0.6, (arcosX[0] + arcosX[1]) / 2, arcosX[1] - 0.6]) {
    c.plano("cone", u, hHall - 1.3, zf + 0.15, 1.4, 2.6, 0, Math.PI); // luz de cima para baixo
  }

  // painel vazado angular, iluminado por trás
  const trX: [number, number] = [arcosX[1] + 0.5, x1 - chanfro - 0.6];
  c.caixa("branco", trX[0] - 0.15, trX[1] + 0.15, 0.25, 5.0, zf + 0.02, zf + 0.2);
  paineis.push({ tipo: "trelica", posicao: [(trX[0] + trX[1]) / 2, 2.62, zf + 0.21], tamanho: [trX[1] - trX[0], 4.5], rotY: 0 });

  // ── Esquina chanfrada: letreiro, uplights e porta ─────────────
  const cx = x1 - chanfro / 2;
  const cz = z1 - chanfro / 2;
  const rot = Math.PI / 4;
  const dir: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2]; // ao longo do muro
  const nor: [number, number] = [Math.SQRT1_2, Math.SQRT1_2]; // para fora
  const noChanfro = (u: number, w: number): [number, number] => [cx + dir[0] * u + nor[0] * w, cz + dir[1] * u + nor[1] * w];
  {
    const [lx, lz] = noChanfro(0.3, 0.05);
    paineis.push({ tipo: "letreiro", posicao: [lx, 3.25, lz], tamanho: [3.5, 1.31], rotY: rot });
    for (const u of [-3.0, -1.5, 0, 1.5, 3.0]) {
      const [ux, uz] = noChanfro(u, 0.04);
      c.plano("cone", ux, 1.75, uz, 1.5, 3.5, rot);
      const [bx, bz] = noChanfro(u, 0.3);
      c.plano("brilho", bx, 0.03, bz, 0.7, 0.7, 0, -Math.PI / 2);
    }
    const [px, pz] = noChanfro(-2.25, 0.03);
    c.caixaGirada("grafite", [px, 1.1, pz], [1.0, 2.2, 0.08], [0, rot, 0]);
    for (const u of [-3.6, 3.6]) {
      const [ax, az] = noChanfro(u, 1.5);
      palmeiras.push({ x: ax, z: az, altura: 4.6 });
    }
  }

  // ── Muro lateral (+X): faixa vazada no alto, uplights e portão ─
  const xl = x1;
  const zIni = z1 - chanfro;
  paineis.push({ tipo: "trelicaEscura", posicao: [xl + 0.03, 4.25, zIni - 5.4], tamanho: [8.2, 1.5], rotY: Math.PI / 2 });
  for (let z = zIni - 1.2; z > z0 + 4.5; z -= 2.1) {
    c.plano("cone", xl + 0.04, 1.6, z, 1.5, 3.2, Math.PI / 2);
    c.plano("brilho", xl + 0.3, 0.03, z, 0.7, 0.7, 0, -Math.PI / 2);
  }
  c.caixa("grafite", xl - 0.05, xl + 0.06, 0, 3.0, z0 + 0.5, z0 + 3.8); // portão da garagem
  for (const z of [zIni - 3.0, zIni - 8.4, zIni - 13.2]) palmeiras.push({ x: xl + 1.6, z, altura: 4.2 });
  // palmeiras da portaria (render 02) e do muro da frente
  palmeiras.push({ x: -10.6, z: zf + 2.3, altura: 5.2 }, { x: -2.2, z: zf + 2.2, altura: 4.4 }, { x: 2.8, z: zf + 2.0, altura: 4.0 });
  for (const u of [trX[0] + 0.8, (trX[0] + trX[1]) / 2, trX[1] - 0.8]) c.plano("brilho", u, 0.03, zf + 0.9, 0.9, 0.9, 0, -Math.PI / 2);

  // muros de divisa (fundos e esquerda), simples
  c.caixa("muro", x0 - 0.02, x0 + 0.1, 0, B, z0, z1 - 1.2);

  // ── Entorno: calçada, ruas, vizinhos e árvores ────────────────
  const r = sorteio(77);
  const arvores: Sitio["arvores"] = [];
  const vizinhos: Sitio["vizinhos"] = [];
  // Só há vizinhos e árvores atrás do prédio ou bem longe: a esquina dos renders fica livre.
  const atras = (x: number, z: number) => x < x0 - 8 || z < z0 - 8;
  for (let i = 0; i < 90; i++) {
    const ang = r() * Math.PI * 2;
    const d = 30 + r() * 190;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (!atras(x, z) && d < 150) continue;
    const alt = 3 + r() * 5 + (r() > 0.9 ? 8 + r() * 10 : 0);
    vizinhos.push({ x, z, larg: 8 + r() * 10, prof: 8 + r() * 10, alt });
  }
  for (let i = 0; i < 110; i++) {
    const ang = r() * Math.PI * 2;
    const d = 22 + r() * 170;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (!atras(x, z) && d < 135) continue;
    arvores.push({ x, z, escala: 0.8 + r() * 0.9 });
  }
  // árvores de calçada em primeiro plano, como no render 01
  arvores.push({ x: -19, z: z1 + 4.5, escala: 1.5 }, { x: x1 + 4.2, z: -18, escala: 1.4 }, { x: -30, z: z1 + 3.5, escala: 1.7 }, { x: x1 + 4.4, z: -30, escala: 1.6 });

  return { pecas: c.pecas, paineis, palmeiras, arvores, vasos, vizinhos };
}

/** Folhas de uma palmeira: matrizes de planos curvos distribuídos em coroa. */
export function folhasPalmeira(base: THREE.Vector3, semente: number): THREE.Matrix4[] {
  const r = sorteio(semente);
  const out: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const n = 13;
  for (let i = 0; i < n; i++) {
    const giro = (i / n) * Math.PI * 2 + r() * 0.4;
    const queda = i % 3 === 0 ? 0.35 + r() * 0.25 : 0.75 + r() * 0.55; // algumas eretas, outras caídas
    const comp = 2.5 + r() * 0.9;
    e.set(queda, giro, (r() - 0.5) * 0.5, "YXZ");
    q.setFromEuler(e);
    out.push(new THREE.Matrix4().compose(base, q, new THREE.Vector3(comp * 0.42, comp, comp * 0.42)));
  }
  return out;
}
