import type { TipoPlanta, Vec2 } from "../types";
import { PE_LIVRE, type Ret } from "./planta";

/** Materiais do interior (ver components/three/materiaisInterior.ts). */
export type MatInt =
  | "parede" | "cimento" | "madeira" | "madeiraEscura" | "madeiraLisa" | "teto" | "pretoFosco" | "metalPreto"
  | "inox" | "granitoPreto" | "hex" | "vidroFume" | "vidro" | "espelho" | "linho" | "tecidoGrafite" | "amarelo"
  | "couro" | "patchwork" | "tapeteVerde" | "folhagem" | "led" | "lampada" | "dourado" | "louca" | "loucaPreta"
  | "cortina" | "quadro" | "tv" | "planta" | "flor" | "papel" | "porta";

/** Camada: decide o que some ou é cortado no modo maquete. */
export type Camada = "parede" | "teto" | "alto" | "movel";

export interface Prim {
  forma: "caixa" | "arred" | "cilindro" | "esfera";
  mat: MatInt;
  pos: [number, number, number];
  tam: [number, number, number];
  rot?: [number, number, number];
  camada: Camada;
  raio?: number;
}

export interface Mobilia {
  prims: Prim[];
  /** Pegadas dos móveis no piso, para a colisão da câmera. */
  obstaculos: Ret[];
  /** Painéis de jardim vertical (para os cartões de folhas). */
  jardins: { x: number; z0: number; z1: number; y1: number }[];
  /** Luzes pontuais reais (poucas): posição e intensidade relativa. */
  luzes: { pos: [number, number, number]; forca: number; alcance: number }[];
}

class M {
  prims: Prim[] = [];
  obstaculos: Ret[] = [];
  /** Caixa por limites. */
  cx(mat: MatInt, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, camada: Camada = "movel", forma: Prim["forma"] = "caixa", raio = 0.03): void {
    this.prims.push({ forma, mat, pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], tam: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], camada, raio });
  }
  ar(mat: MatInt, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, raio = 0.05, camada: Camada = "movel"): void {
    this.cx(mat, x0, x1, y0, y1, z0, z1, camada, "arred", raio);
  }
  /** Cilindro vertical (raio, altura) com a base em y0. */
  cil(mat: MatInt, x: number, y0: number, z: number, r: number, h: number, camada: Camada = "movel", rot?: [number, number, number]): void {
    this.prims.push({ forma: "cilindro", mat, pos: [x, y0 + h / 2, z], tam: [r * 2, h, r * 2], camada, rot });
  }
  esf(mat: MatInt, x: number, y: number, z: number, r: number, camada: Camada = "movel"): void {
    this.prims.push({ forma: "esfera", mat, pos: [x, y, z], tam: [r * 2, r * 2, r * 2], camada });
  }
  girada(mat: MatInt, pos: [number, number, number], tam: [number, number, number], rot: [number, number, number], forma: Prim["forma"] = "arred", raio = 0.04): void {
    this.prims.push({ forma, mat, pos, tam, rot, camada: "movel", raio });
  }
  obst(x0: number, x1: number, z0: number, z1: number): void {
    this.obstaculos.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
  }
  /** Banqueta alta industrial: assento de madeira e pés pretos. */
  banqueta(x: number, z: number, alt = 0.72): void {
    this.cil("madeiraLisa", x, alt, z, 0.17, 0.04);
    for (const [dx, dz] of [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]] as const) this.cil("metalPreto", x + dx * 1.25, 0, z + dz * 1.25, 0.012, alt);
    this.cil("metalPreto", x, alt * 0.38, z, 0.165, 0.012);
    this.obst(x - 0.17, x + 0.17, z - 0.17, z + 0.17);
  }
  /** Vaso com flor (prótea rosa dos renders). */
  vasoFlor(x: number, y: number, z: number): void {
    this.cil("louca", x, y, z, 0.045, 0.16);
    this.cil("planta", x, y + 0.16, z, 0.008, 0.12);
    this.esf("flor", x, y + 0.31, z, 0.055);
    this.esf("planta", x + 0.04, y + 0.22, z - 0.02, 0.04);
  }
  /** Spot de trilho apontado para baixo. */
  spotTrilho(x: number, z: number): void {
    this.cil("metalPreto", x, PE_LIVRE - 0.2, z, 0.035, 0.14, "alto");
    this.cil("lampada", x, PE_LIVRE - 0.212, z, 0.028, 0.012, "alto");
  }
  /** Spot embutido quadrado. */
  spotEmbutido(x: number, z: number, y = PE_LIVRE): void {
    this.cx("metalPreto", x - 0.06, x + 0.06, y - 0.012, y - 0.002, z - 0.06, z + 0.06, "alto");
    this.cil("lampada", x, y - 0.02, z, 0.03, 0.01, "alto");
  }
  /** Pendente de globo com haste dourada. */
  pendenteGlobo(x: number, y: number, z: number): void {
    this.cil("dourado", x, y, z, 0.006, PE_LIVRE - y, "alto");
    this.cil("dourado", x, PE_LIVRE - 0.04, z, 0.05, 0.04, "alto");
    this.esf("lampada", x, y - 0.1, z, 0.11, "alto");
  }
}

function limites(pol: Vec2[]): Ret {
  const xs = pol.map((p) => p[0]);
  const zs = pol.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/**
 * Mobiliário e revestimentos dos cinco cômodos, na composição dos renders 03 a 07.
 * Tudo é posicionado a partir dos limites de cada cômodo, então serve aos dois tipos de planta.
 */
export function mobiliar(t: TipoPlanta): Mobilia {
  const m = new M();
  const jardins: Mobilia["jardins"] = [];
  const luzes: Mobilia["luzes"] = [];
  const H = PE_LIVRE;
  const de = (id: string): Ret => {
    const c = t.comodos.find((x) => x.id === id);
    if (!c) throw new Error(`A planta "${t.id}" precisa do cômodo "${id}".`);
    return limites(c.poligono);
  };
  const S = de("sala");
  const C = de("cozinha");
  const Q = de("quarto");
  const B = de("banheiro");
  const V = de("varanda");
  const e = 0.05; // meia espessura de parede
  const portaQuarto = t.portas.find((p) => p.id === "sala-quarto");
  const zPorta: [number, number] = portaQuarto ? [Math.min(portaQuarto.p1[1], portaQuarto.p2[1]), Math.max(portaQuarto.p1[1], portaQuarto.p2[1])] : [Q.z0 + 0.1, Q.z0 + 0.85];

  // ═══ SALA (render 03): parede do sofá em x = S.x0 ═══════════════
  {
    const x = S.x0 + e;
    const zPainel = zPorta[0];
    // painel de madeira ondulada até 2,15 m, fita de LED e cimento queimado acima
    m.cx("madeira", x, x + 0.035, 0, 2.15, S.z0 + e, zPainel, "parede");
    m.cx("madeira", x, x + 0.035, 2.1, 2.15, zPainel, zPorta[1], "parede");
    m.cx("led", x + 0.035, x + 0.05, 2.15, 2.165, S.z0 + e, zPorta[1], "alto");
    m.cx("cimento", x, x + 0.02, 2.165, H, S.z0 + e, S.z1 - e, "alto");
    // porta de correr em madeira, aberta sobre o painel
    m.cx("madeira", x + 0.04, x + 0.075, 0, 2.1, zPorta[0] - (zPorta[1] - zPorta[0]) + 0.02, zPorta[0] + 0.02, "parede");
    m.cx("metalPreto", x + 0.075, x + 0.085, 0.85, 1.35, zPorta[0] - 0.1, zPorta[0] - 0.08);
    // espelho embutido atrás do sofá
    const zSofa: [number, number] = [S.z0 + 0.28, Math.min(S.z0 + 2.38, zPainel - 0.12)];
    m.cx("espelho", x + 0.035, x + 0.045, 0.95, 2.0, zSofa[0] + 0.3, zSofa[1] - 0.25, "alto");
    // segundo painel de jardim vertical, ao lado da varanda
    jardins.push({ x: x, z0: zPorta[1] + 0.05, z1: S.z1 - 0.1, y1: 2.45 });
    // sofá cinza-claro de linho
    const sx0 = x + 0.06;
    m.ar("linho", sx0, sx0 + 0.95, 0.1, 0.4, zSofa[0], zSofa[1], 0.07);
    m.ar("linho", sx0, sx0 + 0.24, 0.3, 0.8, zSofa[0], zSofa[1], 0.07);
    m.ar("linho", sx0, sx0 + 0.95, 0.3, 0.62, zSofa[0], zSofa[0] + 0.2, 0.07);
    m.ar("linho", sx0, sx0 + 0.95, 0.3, 0.62, zSofa[1] - 0.2, zSofa[1], 0.07);
    const zm = (zSofa[0] + zSofa[1]) / 2;
    m.ar("linho", sx0 + 0.24, sx0 + 0.93, 0.4, 0.54, zSofa[0] + 0.21, zm - 0.01, 0.06);
    m.ar("linho", sx0 + 0.24, sx0 + 0.93, 0.4, 0.54, zm + 0.01, zSofa[1] - 0.21, 0.06);
    const larg = (zSofa[1] - zSofa[0] - 0.44) / 3;
    for (let i = 0; i < 3; i++) {
      const z = zSofa[0] + 0.22 + larg * (i + 0.5);
      m.girada(i === 2 ? "papel" : "linho", [sx0 + 0.36, 0.72, z], [0.16, 0.42, larg - 0.06], [0, 0, 0.22], "arred", 0.07);
    }
    for (const z of [zSofa[0] + 0.1, zSofa[1] - 0.1]) for (const dx of [0.08, 0.87]) m.cil("metalPreto", sx0 + dx, 0, z, 0.02, 0.1);
    m.obst(sx0, sx0 + 0.95, zSofa[0], zSofa[1]);
    // tapete patchwork de couro
    m.cx("patchwork", sx0 + 0.8, Math.min(sx0 + 2.5, C.x0 - 0.45), 0.004, 0.014, zSofa[0] - 0.05, zSofa[1] + 0.1);
    // mesa alta redonda com banquetas, em frente ao jardim
    const mx = x + 0.82;
    const mz = (zPorta[1] + S.z1) / 2 + 0.05;
    m.cil("madeiraEscura", mx, 1.03, mz, 0.33, 0.04);
    m.cil("metalPreto", mx, 0, mz, 0.02, 1.03);
    m.cil("metalPreto", mx, 0, mz, 0.22, 0.015);
    m.cil("metalPreto", mx, 0.45, mz, 0.2, 0.012);
    m.vasoFlor(mx + 0.05, 1.07, mz - 0.05);
    m.obst(mx - 0.3, mx + 0.3, mz - 0.3, mz + 0.3);
    m.banqueta(mx + 0.5, mz + 0.1);
    m.banqueta(mx + 0.12, mz - 0.44);
    // trilhos pretos de spots no teto
    const tx = S.x0 + (C.x0 - S.x0) * 0.55;
    m.cx("metalPreto", tx - 0.02, tx + 0.02, H - 0.06, H - 0.03, S.z0 + 0.5, S.z1 - 0.7, "alto");
    for (let z = S.z0 + 0.8; z < S.z1 - 0.7; z += 0.75) m.spotTrilho(tx, z);
    m.cx("metalPreto", S.x0 + 0.5, C.x0 - 0.2, H - 0.06, H - 0.03, S.z0 + 0.42, S.z0 + 0.46, "alto");
    luzes.push({ pos: [tx, 2.2, zm], forca: 1, alcance: 6 }, { pos: [S.x0 + 0.5, 2.0, zm], forca: 0.5, alcance: 3.5 });
  }

  // ═══ COZINHA e bar (render 07): parede em x = S.x1 ══════════════
  {
    const x1 = S.x1 - e;
    // bloco de madeira escura com a TV
    const zTV: [number, number] = [Math.max(S.z0 + 0.5, C.z0 - 1.25), C.z0];
    m.cx("madeiraEscura", x1 - 0.28, x1, 0, H, zTV[0], zTV[1], "parede");
    m.cx("metalPreto", x1 - 0.3, x1 - 0.28, 1.12, 1.76, (zTV[0] + zTV[1]) / 2 - 0.55, (zTV[0] + zTV[1]) / 2 + 0.55, "alto");
    m.cx("tv", x1 - 0.305, x1 - 0.3, 1.14, 1.74, (zTV[0] + zTV[1]) / 2 - 0.53, (zTV[0] + zTV[1]) / 2 + 0.53, "alto");
    m.obst(x1 - 0.3, S.x1, zTV[0], zTV[1]);
    // porta de entrada (fechada)
    const ent = t.portas.find((p) => p.id === "entrada");
    if (ent) {
      m.cx("porta", ent.p1[0] + 0.02, ent.p2[0] - 0.02, 0, 2.08, S.z0 + 0.02, S.z0 + 0.06, "parede");
      m.cx("inox", ent.p1[0] + 0.08, ent.p1[0] + 0.2, 1.0, 1.03, S.z0 + 0.06, S.z0 + 0.1);
    }
    // marcenaria preta fosca, bancada de granito e backsplash hexagonal
    const zg = S.z1 - 0.75; // onde começa a geladeira
    m.cx("pretoFosco", x1 - 0.58, x1, 0.1, 0.86, C.z0 + 0.02, zg, "movel");
    m.cx("metalPreto", x1 - 0.55, x1, 0, 0.1, C.z0 + 0.02, zg);
    m.cx("granitoPreto", x1 - 0.6, x1, 0.86, 0.9, C.z0 + 0.02, zg);
    m.cx("hex", x1 - 0.012, x1, 0.9, 1.5, C.z0 + 0.02, zg, "alto");
    m.cx("pretoFosco", x1 - 0.34, x1, 1.5, 2.2, C.z0 + 0.02, zg, "alto");
    m.cx("led", x1 - 0.3, x1 - 0.05, 1.49, 1.5, C.z0 + 0.1, zg - 0.1, "alto");
    m.cx("inox", x1 - 0.45, x1 - 0.12, 0.895, 0.905, C.z0 + 0.25, C.z0 + 0.75); // cuba
    m.cil("inox", x1 - 0.1, 0.9, C.z0 + 0.5, 0.012, 0.28);
    m.cx("vidroFume", x1 - 0.5, x1 - 0.1, 0.9, 0.908, zg - 0.75, zg - 0.15); // cooktop
    // geladeira inox em moldura de madeira
    m.ar("inox", x1 - 0.7, x1 - 0.03, 0.03, 1.8, zg + 0.05, S.z1 - 0.07, 0.02);
    m.cx("metalPreto", x1 - 0.71, x1 - 0.7, 1.05, 1.06, zg + 0.07, S.z1 - 0.09);
    m.cx("madeira", x1 - 0.72, x1, 1.82, 1.86, zg, S.z1 - 0.03, "alto");
    m.cx("madeira", x1 - 0.72, x1, 0, 1.86, zg, zg + 0.035);
    m.cx("pretoFosco", x1 - 0.6, x1, 1.86, H, zg, S.z1 - 0.03, "alto");
    m.obst(x1 - 0.72, S.x1, C.z0, S.z1);
    // prateleira longa de madeira no alto
    m.cx("madeiraEscura", C.x0 - 0.2, x1, 2.22, 2.27, zTV[0] - 0.3, zg, "alto");
    // balcão-bar em madeira, com banquetas do lado da sala
    const bx = C.x0;
    m.cx("madeiraEscura", bx - 0.32, bx + 0.04, 1.02, 1.07, zTV[1] - 0.1, zg - 0.25);
    m.cx("madeiraEscura", bx - 0.04, bx, 0, 1.02, zTV[1] - 0.1, zg - 0.25);
    m.obst(bx - 0.32, bx + 0.04, zTV[1] - 0.1, zg - 0.25);
    m.banqueta(bx - 0.55, C.z0 + 0.45, 0.74);
    m.banqueta(bx - 0.55, C.z0 + 1.15, 0.74);
    // pendentes industriais de gaiola com lâmpada de filamento
    for (const z of [C.z0 + 0.5, C.z0 + 1.2]) {
      const px = bx + 0.3;
      m.cil("metalPreto", px, 1.86, z, 0.004, H - 1.86, "alto");
      m.cil("metalPreto", px, 1.8, z, 0.03, 0.07, "alto");
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        m.girada("metalPreto", [px + Math.cos(a) * 0.055, 1.69, z + Math.sin(a) * 0.055], [0.006, 0.24, 0.006], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], "caixa");
      }
      m.esf("lampada", px, 1.7, z, 0.035, "alto");
    }
    const kx = C.x0 + 0.35;
    m.cx("metalPreto", kx - 0.02, kx + 0.02, H - 0.06, H - 0.03, C.z0 - 0.6, C.z0 + 0.9, "alto");
    for (const z of [C.z0 - 0.4, C.z0 + 0.15, C.z0 + 0.7]) m.spotTrilho(kx, z);
    luzes.push({ pos: [bx + 0.3, 1.7, C.z0 + 0.85], forca: 0.8, alcance: 4 });
  }

  // ═══ VARANDA (render 06) ════════════════════════════════════════
  {
    const x = V.x0 + e;
    jardins.push({ x, z0: V.z0 + 0.12, z1: V.z1 - 0.06, y1: 2.5 });
    // forro de madeira clara com sanca de LED
    m.cx("madeiraLisa", V.x0 + 0.25, V.x1 - e, H - 0.1, H - 0.06, V.z0 + 0.1, V.z1 - 0.3, "teto");
    m.cx("led", V.x0 + 0.25, V.x1 - e, H - 0.07, H - 0.055, V.z1 - 0.3, V.z1 - 0.27, "alto");
    m.spotEmbutido((V.x0 + V.x1) / 2, (V.z0 + V.z1) / 2, H - 0.1);
    m.spotEmbutido(V.x1 - 0.9, (V.z0 + V.z1) / 2, H - 0.1);
    // soleira preta entre sala e varanda
    m.cx("granitoPreto", V.x0 + 0.2, V.x1 - e, -0.03, 0.006, V.z0 - 0.06, V.z0 + 0.06);
    // guarda-corpo: mureta, moldura preta (a grade em si é desenhada à parte)
    m.cx("pretoFosco", V.x0, V.x1, -0.03, 0.14, V.z1 - 0.1, V.z1, "parede");
    m.cx("metalPreto", V.x0, V.x1, 1.08, 1.13, V.z1 - 0.08, V.z1 - 0.02, "parede");
    for (let px = V.x0 + 0.02; px <= V.x1; px += (V.x1 - V.x0 - 0.04) / 2) m.cx("metalPreto", px - 0.02, px + 0.02, 0.14, 1.08, V.z1 - 0.07, V.z1 - 0.03, "parede");
    // poltrona de couro caramelo com estrutura de madeira clara
    const ax = x + 0.95;
    const az = V.z0 + 0.72;
    m.girada("couro", [ax, 0.4, az], [0.6, 0.14, 0.62], [0, 0, -0.08], "arred", 0.06);
    m.girada("couro", [ax - 0.27, 0.68, az], [0.14, 0.58, 0.6], [0, 0, 0.32], "arred", 0.06);
    for (const dz of [-0.33, 0.33]) {
      m.girada("madeiraLisa", [ax + 0.02, 0.5, az + dz], [0.66, 0.035, 0.05], [0, 0, -0.05], "arred", 0.015);
      m.girada("madeiraLisa", [ax + 0.27, 0.24, az + dz], [0.045, 0.52, 0.045], [0, 0, 0.2], "arred", 0.015);
      m.girada("madeiraLisa", [ax - 0.28, 0.3, az + dz], [0.045, 0.64, 0.045], [0, 0, -0.3], "arred", 0.015);
    }
    m.obst(ax - 0.42, ax + 0.38, az - 0.36, az + 0.36);
    // mesa preta baixa com livros, caneca e flores
    const tx = ax + 0.9;
    const tz = az + 0.12;
    m.cil("pretoFosco", tx, 0.4, tz, 0.34, 0.025);
    for (const a of [0.5, 2.6, 4.7]) m.girada("metalPreto", [tx + Math.cos(a) * 0.2, 0.2, tz + Math.sin(a) * 0.2], [0.018, 0.42, 0.018], [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18], "caixa");
    m.cx("papel", tx - 0.2, tx + 0.04, 0.425, 0.455, tz - 0.12, tz + 0.06);
    m.cx("planta", tx - 0.18, tx + 0.03, 0.455, 0.475, tz - 0.1, tz + 0.05);
    m.cil("louca", tx + 0.14, 0.425, tz + 0.1, 0.04, 0.09);
    m.vasoFlor(tx - 0.05, 0.425, tz - 0.2);
    m.obst(tx - 0.34, tx + 0.34, tz - 0.34, tz + 0.34);
    m.pendenteGlobo(x + 0.5, 1.65, V.z0 + 1.02);
    // marcenaria preta no fundo da varanda (continuação da cozinha)
    const cx1 = V.x1 - e;
    m.cx("pretoFosco", cx1 - 0.48, cx1, 0, 0.9, V.z0 + 0.1, V.z1 - 0.14);
    m.cx("madeira", cx1 - 0.5, cx1, 0.9, 0.94, V.z0 + 0.1, V.z1 - 0.14);
    m.cx("madeira", cx1 - 0.4, cx1, 0.94, 1.5, V.z0 + 0.1, V.z0 + 0.13);
    m.cx("madeira", cx1 - 0.02, cx1, 0.94, 1.5, V.z0 + 0.1, V.z1 - 0.14, "alto");
    m.cx("pretoFosco", cx1 - 0.4, cx1, 1.5, H - 0.1, V.z0 + 0.1, V.z1 - 0.14, "alto");
    m.cx("led", cx1 - 0.36, cx1 - 0.04, 1.485, 1.5, V.z0 + 0.2, V.z1 - 0.24, "alto");
    m.obst(cx1 - 0.5, V.x1, V.z0 + 0.1, V.z1);
    luzes.push({ pos: [x + 0.55, 1.5, V.z0 + 1.0], forca: 0.8, alcance: 4 });
  }

  // ═══ QUARTO (render 05): cabeceira em x = Q.x0 ══════════════════
  {
    const x = Q.x0 + e;
    const zm = (Q.z0 + Q.z1) / 2;
    const zd = Q.z0 + e; // parede do armário (à direita na foto)
    // painel baixo de madeira com LED, na parede da cabeceira
    m.cx("madeira", x, x + 0.035, 0, 1.02, Q.z0 + e, Q.z1 - e, "parede");
    m.cx("led", x + 0.02, x + 0.045, 1.02, 1.035, Q.z0 + 1.0, Q.z1 - e, "parede");
    // painel de madeira que sobe pela parede e continua no teto, com frisos de LED
    const xp = Math.min(1.25, Q.x1 - 2.3);
    m.cx("madeira", x, xp, 0, H, zd, zd + 0.035, "parede");
    m.cx("madeira", x, Q.x1 - e, H - 0.035, H, zd, zd + 0.95, "teto");
    for (const [fx, y0] of [[0.32, 1.25], [0.62, 0.95], [0.92, 1.4]] as const) m.cx("led", x + fx, x + fx + 0.014, y0, H - 0.035, zd + 0.035, zd + 0.045, "alto");
    for (const [fz, comp] of [[0.25, 2.3], [0.5, 1.5], [0.75, 2.7]] as const) m.cx("led", x + 0.3, Math.min(x + 0.3 + comp, Q.x1 - 0.2), H - 0.045, H - 0.035, zd + fz, zd + fz + 0.014, "alto");
    // armário de vidro fumê
    const ax: [number, number] = [xp + 0.05, Math.min(xp + 1.65, Q.x1 - 0.95)];
    m.cx("pretoFosco", ax[0], ax[1], 0, 2.5, zd, zd + 0.56, "movel");
    m.cx("vidroFume", ax[0], ax[1], 0.03, 2.47, zd + 0.56, zd + 0.575, "movel");
    for (let px = ax[0]; px <= ax[1] + 0.01; px += (ax[1] - ax[0]) / 3) m.cx("dourado", px - 0.008, px + 0.008, 0, 2.5, zd + 0.575, zd + 0.585);
    m.obst(ax[0], ax[1], Q.z0, zd + 0.6);
    // cama baixa com LED sob a base
    const larg = Math.min(1.55, Q.z1 - Q.z0 - 1.45);
    const cz: [number, number] = [zm - larg / 2, zm + larg / 2];
    m.cx("led", x + 0.2, x + 2.0, 0.075, 0.09, cz[0] + 0.12, cz[1] - 0.12);
    m.ar("madeiraEscura", x + 0.04, x + 2.06, 0.1, 0.3, cz[0], cz[1], 0.02);
    m.ar("tecidoGrafite", x + 0.06, x + 2.12, 0.3, 0.56, cz[0] - 0.05, cz[1] + 0.05, 0.1);
    m.ar("tecidoGrafite", x + 0.9, x + 2.16, 0.24, 0.585, cz[0] - 0.09, cz[1] + 0.09, 0.1);
    for (const s of [-1, 1]) {
      m.girada("tecidoGrafite", [x + 0.2, 0.74, zm + s * larg * 0.25], [0.16, 0.4, larg * 0.44], [0, 0, 0.3], "arred", 0.07);
      m.girada("amarelo", [x + 0.42, 0.66, zm + s * larg * 0.2], [0.13, 0.26, larg * 0.3], [0, 0, 0.35], "arred", 0.06);
    }
    m.obst(x, x + 2.16, cz[0] - 0.09, cz[1] + 0.09);
    // criados-mudos de estrutura preta
    for (const s of [-1, 1]) {
      const nz = zm + s * (larg / 2 + 0.32);
      if (nz - 0.2 < zd + 0.6 && s < 0) continue;
      m.cx("madeiraEscura", x + 0.08, x + 0.46, 0.34, 0.5, nz - 0.2, nz + 0.2);
      m.cx("metalPreto", x + 0.06, x + 0.48, 0.5, 0.52, nz - 0.22, nz + 0.22);
      for (const [dx, dz] of [[0.07, -0.21], [0.47, -0.21], [0.07, 0.21], [0.47, 0.21]] as const) m.cx("metalPreto", x + dx - 0.01, x + dx + 0.01, 0, 0.5, nz + dz - 0.01, nz + dz + 0.01);
      if (s > 0) {
        m.cx("papel", x + 0.12, x + 0.38, 0.52, 0.56, nz - 0.12, nz + 0.06);
      } else m.vasoFlor(x + 0.26, 0.52, nz);
      m.obst(x, x + 0.48, nz - 0.22, nz + 0.22);
    }
    // pendente de globo dourado ao lado da cama (lado da janela)
    m.pendenteGlobo(x + 0.5, 1.45, Math.min(zm + larg / 2 + 0.32, Q.z1 - 0.3));
    // quadro preto e branco
    m.cx("metalPreto", x, x + 0.03, 1.3, 2.3, zm - 0.42, zm + 0.36, "alto");
    m.cx("quadro", x + 0.03, x + 0.035, 1.36, 2.24, zm - 0.36, zm + 0.3, "alto");
    // tapete felpudo verde-oliva
    m.ar("tapeteVerde", x + 1.0, Math.min(x + 3.3, Q.x1 - 0.15), 0.002, 0.03, cz[0] - 0.45, cz[1] + 0.45, 0.012);
    // cortina cinza nos dois lados da janela
    const jan = t.janelas.find((j) => j.id === "janela-quarto");
    if (jan) {
      const [ja, jb] = [Math.min(jan.p1[0], jan.p2[0]), Math.max(jan.p1[0], jan.p2[0])];
      m.cx("cortina", ja - 0.3, ja + 0.25, 0.03, 2.5, Q.z1 - 0.17, Q.z1 - 0.1, "parede");
      m.cx("cortina", jb - 0.25, jb + 0.3, 0.03, 2.5, Q.z1 - 0.17, Q.z1 - 0.1, "parede");
      m.cx("metalPreto", ja - 0.03, jb + 0.03, jan.peitoril - 0.03, jan.peitoril, Q.z1 - 0.06, Q.z1 + 0.02, "parede");
      m.cx("metalPreto", (ja + jb) / 2 - 0.015, (ja + jb) / 2 + 0.015, jan.peitoril, jan.peitoril + jan.altura, Q.z1 - 0.03, Q.z1, "alto");
    }
    m.spotEmbutido(x + 1.2, zm + 0.5);
    m.spotEmbutido(x + 2.4, zm + 0.5);
    luzes.push({ pos: [x + 0.6, 1.4, zm + larg / 2 + 0.3], forca: 0.9, alcance: 5 }, { pos: [x + 1.6, 2.3, zd + 0.6], forca: 0.6, alcance: 4 });
  }

  // ═══ BANHEIRO (render 04): bancada na parede z = B.z0 ═══════════
  {
    const z = B.z0 + e;
    const xm = (B.x0 + B.x1) / 2 + 0.35;
    const meia = Math.min(0.72, (B.x1 - xm) - 0.12);
    // nicho em madeira ondulada com spots
    m.cx("madeira", xm - meia, xm + meia, 0.22, 2.42, z, z + 0.03, "parede");
    m.cx("madeira", xm - meia - 0.05, xm - meia, 0.22, 2.42, z, z + 0.52, "parede");
    m.cx("madeira", xm + meia, xm + meia + 0.05, 0.22, 2.42, z, z + 0.52, "parede");
    m.cx("madeira", xm - meia - 0.05, xm + meia + 0.05, 2.37, 2.42, z, z + 0.52, "alto");
    m.spotEmbutido(xm - 0.3, z + 0.28, 2.37);
    m.spotEmbutido(xm + 0.3, z + 0.28, 2.37);
    // espelho redondo grande
    m.cil("espelho", xm, 1.62 - 0.01, z + 0.04, 0.42, 0.02, "alto", [Math.PI / 2, 0, 0]);
    // bancada e saia de granito preto, cuba quadrada preta
    m.cx("granitoPreto", xm - meia, xm + meia, 0.84, 0.9, z + 0.03, z + 0.52);
    m.cx("granitoPreto", xm - meia, xm + meia, 0.46, 0.84, z + 0.48, z + 0.52);
    m.ar("loucaPreta", xm - 0.2, xm + 0.2, 0.9, 1.02, z + 0.12, z + 0.44, 0.02);
    m.cil("metalPreto", xm, 0.9, z + 0.08, 0.012, 0.34);
    m.cx("metalPreto", xm - 0.01, xm + 0.01, 1.22, 1.24, z + 0.08, z + 0.22);
    // toalheiro com toalha grafite
    m.cx("metalPreto", xm - 0.32, xm + 0.32, 0.8, 0.815, z + 0.55, z + 0.565);
    m.ar("tecidoGrafite", xm - 0.2, xm + 0.2, 0.3, 0.81, z + 0.545, z + 0.585, 0.015);
    // prateleira de madeira com LED abaixo da bancada e toalhas dobradas
    m.cx("madeiraLisa", xm - meia, xm + meia, 0.22, 0.26, z + 0.03, z + 0.52);
    m.cx("led", xm - meia + 0.05, xm + meia - 0.05, 0.445, 0.46, z + 0.1, z + 0.4);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) m.ar("tecidoGrafite", xm + s * (meia - 0.14) - 0.11, xm + s * (meia - 0.14) + 0.11, 0.26 + k * 0.05, 0.305 + k * 0.05, z + 0.12, z + 0.42, 0.02);
    // objetos na bancada
    for (const dx of [-0.52, -0.38]) {
      m.girada("louca", [xm + dx, 0.99, z + 0.24], [0.07, 0.12, 0.07], [Math.PI, 0, 0], "cilindro");
      m.esf("planta", xm + dx, 1.09, z + 0.24, 0.05);
    }
    m.cx("pretoFosco", xm + 0.4, xm + 0.48, 0.9, 1.0, z + 0.2, z + 0.28);
    m.cx("madeiraLisa", xm + 0.52, xm + 0.6, 0.9, 0.98, z + 0.2, z + 0.28);
    m.obst(xm - meia - 0.05, xm + meia + 0.05, B.z0, z + 0.58);
    // painel/porta de correr em madeira na parede da direita
    m.cx("madeira", B.x1 - e - 0.035, B.x1 - e, 0, 2.2, z + 0.62, Math.min(z + 1.55, B.z1 - 0.9), "parede");
    m.cx("metalPreto", B.x1 - e - 0.045, B.x1 - e - 0.035, 0.8, 1.4, z + 0.72, z + 0.74);
    // box de vidro, chuveiro e bacia à esquerda
    const xbox = B.x0 + 0.95;
    m.cx("vidro", xbox - 0.006, xbox + 0.006, 0, 2.1, z, z + 1.15, "parede");
    m.cx("metalPreto", xbox - 0.01, xbox + 0.01, 2.1, 2.12, z, z + 1.15, "alto");
    m.cil("inox", B.x0 + 0.45, 2.05, z + 0.5, 0.11, 0.015, "alto");
    m.cil("inox", B.x0 + 0.45, 2.06, z + 0.5, 0.01, H - 2.06, "alto");
    m.ar("louca", B.x0 + e + 0.02, B.x0 + e + 0.56, 0, 0.4, B.z1 - 0.72, B.z1 - 0.34, 0.08);
    m.ar("louca", B.x0 + e + 0.02, B.x0 + e + 0.2, 0.4, 0.78, B.z1 - 0.74, B.z1 - 0.32, 0.04);
    m.obst(B.x0, B.x0 + 0.62, B.z1 - 0.76, B.z1 - 0.3);
    m.obst(xbox - 0.03, xbox + 0.03, B.z0, z + 1.15);
    m.spotEmbutido(xm, B.z1 - 0.7);
    luzes.push({ pos: [xm, 2.0, z + 0.7], forca: 0.9, alcance: 4 });
  }

  return { prims: m.prims, obstaculos: m.obstaculos, jardins, luzes };
}
