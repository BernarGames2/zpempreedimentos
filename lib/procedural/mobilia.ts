import { tipoPorId } from "../dados";
import type { TipoPlanta, Vec2 } from "../types";
import { PE_LIVRE, type Ret } from "./planta";

/** Materiais do interior (ver components/three/materiaisInterior.ts). Paleta dos renders oficiais do Liwo. */
export type MatInt =
  | "parede" | "teto" | "madeiraClara" | "madeiraNatural" | "marmore" | "marmoreVerde" | "pedraBranca"
  | "caramelo" | "veludo" | "tecidoBranco" | "tecidoCinza" | "palhinha" | "cromo" | "bronze" | "metalBranco"
  | "pretoFosco" | "vidro" | "vidroFosco" | "espelhoFume" | "tv" | "louca" | "eletro" | "inox" | "led" | "lampada"
  | "planta" | "folhagem" | "livros" | "quadroDegrade" | "quadroFormas" | "resinaAmbar" | "tapete" | "porta";

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
  /** Painéis de jardim vertical (não há no Liwo; mantido para outros empreendimentos). */
  jardins: { x: number; z0: number; z1: number; y1: number }[];
  /** Luzes pontuais reais (poucas): posição e intensidade relativa. */
  luzes: { pos: [number, number, number]; forca: number; alcance: number }[];
}

class M {
  prims: Prim[] = [];
  obstaculos: Ret[] = [];
  luzes: Mobilia["luzes"] = [];
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
  luz(x: number, y: number, z: number, forca: number, alcance: number): void {
    this.luzes.push({ pos: [x, y, z], forca, alcance });
  }
  spot(x: number, z: number, y = PE_LIVRE): void {
    this.cil("metalBranco", x, y - 0.012, z, 0.045, 0.01, "alto");
    this.cil("lampada", x, y - 0.016, z, 0.03, 0.006, "alto");
  }
  /** Banqueta de madeira clara com assento de palhinha (renders do living). */
  banqueta(x: number, z: number, alt = 0.72): void {
    this.ar("palhinha", x - 0.2, x + 0.2, alt - 0.04, alt, z - 0.18, z + 0.18, 0.015);
    for (const [dx, dz] of [[0.16, 0.14], [-0.16, 0.14], [0.16, -0.14], [-0.16, -0.14]] as const) this.cx("madeiraNatural", x + dx - 0.015, x + dx + 0.015, 0, alt - 0.04, z + dz - 0.015, z + dz + 0.015);
    this.cx("madeiraNatural", x - 0.17, x + 0.17, alt * 0.35, alt * 0.35 + 0.02, z - 0.15, z - 0.13);
    this.cx("madeiraNatural", x - 0.16, x + 0.16, alt + 0.04, alt + 0.1, z + 0.15, z + 0.17); // aro do encosto baixo
    this.obst(x - 0.2, x + 0.2, z - 0.18, z + 0.18);
  }
  /** Cadeira de jantar estofada (cinza na varanda) ou de madeira com palhinha (living). `dir` aponta para a mesa. */
  cadeira(x: number, z: number, dir: number, mat: MatInt): void {
    const ca = Math.cos(dir);
    const sa = Math.sin(dir);
    this.girada(mat, [x, 0.46, z], [0.44, 0.06, 0.44], [0, dir, 0], "arred", 0.02);
    this.girada(mat, [x - sa * 0.21, 0.72, z - ca * 0.21], [0.42, 0.42, 0.05], [0, dir, 0], "arred", 0.02);
    for (const [u, w] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]] as const) {
      this.cx("madeiraNatural", x + u * ca + w * sa - 0.014, x + u * ca + w * sa + 0.014, 0, 0.44, z - u * sa + w * ca - 0.014, z - u * sa + w * ca + 0.014);
    }
    this.obst(x - 0.24, x + 0.24, z - 0.24, z + 0.24);
  }
  /** Bancada de banheiro com cuba de apoio, espelho e torneira. `parede` = lado da parede ("x0"|"x1"|"z0"|"z1"). */
  bancadaBanho(x0: number, x1: number, z0: number, z1: number, parede: "x0" | "x1" | "z1", y = 0.86): void {
    this.cx("madeiraClara", x0, x1, 0.3, y - 0.04, z0, z1);
    this.cx("marmore", x0 - 0.01, x1 + 0.01, y - 0.04, y, z0 - 0.01, z1 + 0.01);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    this.cil("louca", cx, y, cz, 0.19, 0.12);
    if (parede === "z1") {
      this.cx("espelhoFume", x0 + 0.05, x1 - 0.05, 1.15, 2.05, z1 - 0.02, z1, "alto");
      this.cil("cromo", cx, y, z1 - 0.07, 0.012, 0.3);
    } else {
      const xp = parede === "x0" ? x0 : x1 - 0.02;
      this.cx("espelhoFume", xp, xp + 0.02, 1.15, 2.05, z0 + 0.05, z1 - 0.05, "alto");
      this.cil("cromo", parede === "x0" ? x0 + 0.07 : x1 - 0.07, y, cz, 0.012, 0.3);
    }
    this.obst(x0, x1, z0, z1);
    this.luz(cx, 2.1, cz, 0.6, 3);
  }
  /** Bacia sanitária encostada na parede (`dir` aponta para fora da parede). */
  bacia(x: number, z: number, dir: number): void {
    const sa = Math.sin(dir);
    const ca = Math.cos(dir);
    this.girada("louca", [x - sa * 0.12, 0.6, z - ca * 0.12], [0.38, 0.4, 0.16], [0, dir, 0], "arred", 0.05);
    this.girada("louca", [x + sa * 0.12, 0.2, z + ca * 0.12], [0.36, 0.4, 0.52], [0, dir, 0], "arred", 0.12);
    this.obst(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
  }
  /** Box de vidro com chuveiro de teto. */
  box(x0: number, x1: number, z0: number, z1: number, vidro: "x" | "z", c: number): void {
    if (vidro === "x") this.cx("vidro", c - 0.005, c + 0.005, 0, 2.05, z0, z1, "parede");
    else this.cx("vidro", x0, x1, 0, 2.05, c - 0.005, c + 0.005, "parede");
    this.cil("cromo", (x0 + x1) / 2, PE_LIVRE - 0.04, (z0 + z1) / 2, 0.12, 0.012, "alto");
    this.cx("pedraBranca", x0, x1, 0, 0.012, z0, z1);
  }
  /** Cama: base estofada, colchão, edredom, travesseiros e cabeceira. Cabeceira em `zCab` (cresce em +z) ou em `xCab` (cresce em -x). */
  cama(x0: number, x1: number, z0: number, z1: number, cabeceira: "z0" | "x1", base: MatInt, cab: MatInt): void {
    this.ar(base, x0, x1, 0.04, 0.36, z0, z1, 0.06);
    this.ar("tecidoBranco", x0 + 0.03, x1 - 0.03, 0.36, 0.58, z0 + 0.03, z1 - 0.03, 0.06);
    if (cabeceira === "z0") {
      this.ar("tecidoBranco", x0 - 0.02, x1 + 0.02, 0.5, 0.62, z0 + 0.6, z1 + 0.02, 0.05);
      const n = Math.max(1, Math.round((x1 - x0) / 0.75));
      for (let i = 0; i < n; i++) {
        const a = x0 + ((x1 - x0) * i) / n;
        this.girada("tecidoBranco", [a + (x1 - x0) / n / 2, 0.72, z0 + 0.3], [(x1 - x0) / n - 0.06, 0.2, 0.36], [-0.35, 0, 0], "arred", 0.08);
      }
      this.ar(cab, x0 - 0.15, x1 + 0.15, 0, 1.15, z0 - 0.16, z0 + 0.02, 0.09);
    } else {
      this.ar("tecidoBranco", x0 - 0.02, x1 - 0.6, 0.5, 0.62, z0 - 0.02, z1 + 0.02, 0.05);
      this.girada("tecidoBranco", [x1 - 0.3, 0.72, (z0 + z1) / 2], [0.36, 0.2, z1 - z0 - 0.1], [0, 0, 0.35], "arred", 0.08);
      this.ar(cab, x1 - 0.02, x1 + 0.14, 0, 1.05, z0 - 0.08, z1 + 0.08, 0.06);
    }
    this.obst(x0, x1, z0, z1);
  }
}

function limites(pol: Vec2[]): Ret {
  const xs = pol.map((p) => p[0]);
  const zs = pol.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** Espelha a mobília no eixo x (plantas espelhadas, como o final 04 em relação ao 02). */
function espelhar(m: Mobilia, soma: number): Mobilia {
  const mx = (x: number) => soma - x;
  return {
    prims: m.prims.map((p) => ({ ...p, pos: [mx(p.pos[0]), p.pos[1], p.pos[2]], rot: p.rot ? [p.rot[0], -p.rot[1], -p.rot[2]] : undefined })),
    obstaculos: m.obstaculos.map((o) => ({ x0: mx(o.x1), x1: mx(o.x0), z0: o.z0, z1: o.z1 })),
    jardins: [],
    luzes: m.luzes.map((l) => ({ ...l, pos: [mx(l.pos[0]), l.pos[1], l.pos[2]] })),
  };
}

/**
 * Mobília do apartamento de 102 m² (3 suítes) do Liwo, posicionada pela planta oficial do final 02.
 * Living, cozinha e suíte master seguem os três renders oficiais de interiores (materiais e peças);
 * varanda, banhos e suítes 1 e 2 seguem só a planta ilustrada (sem render oficial: peças neutras).
 */
export function mobiliar(t: TipoPlanta): Mobilia {
  if (t.espelhoDe) {
    const base = tipoPorId(t.espelhoDe);
    if (base) {
      const l = t.comodos.flatMap((c) => c.poligono.map((p) => p[0]));
      const lb = base.comodos.flatMap((c) => c.poligono.map((p) => p[0]));
      return espelhar(mobiliar(base), Math.min(...lb) + Math.max(...lb) + (Math.min(...l) - Math.min(...lb)));
    }
  }
  const m = new M();
  const H = PE_LIVRE;
  const de = (id: string): Ret => {
    const c = t.comodos.find((x) => x.id === id);
    if (!c) throw new Error(`A planta "${t.id}" precisa do cômodo "${id}".`);
    return limites(c.poligono);
  };
  const e = 0.05; // meia espessura de parede
  const S = de("sala");
  const C = de("cozinha");
  const V = de("varanda");
  const Q = de("quarto");

  // ═══ COZINHA (renders "sala 01" e "sala 02"): bancada corrida na parede x = C.x0 ═══
  {
    const x = C.x0 + e;
    const zi = S.z0 + 1.3;
    const zg = C.z1 - 0.9; // geladeira na ponta da varanda (planta)
    m.cx("madeiraClara", x, x + 0.6, 0.1, 0.86, zi, zg, "movel");
    m.cx("pretoFosco", x, x + 0.56, 0, 0.1, zi, zg);
    m.cx("marmore", x, x + 0.63, 0.86, 0.9, zi, zg);
    m.cx("marmore", x, x + 0.02, 0.9, 1.48, zi, zg, "alto");
    m.cx("marmore", x, x + 0.3, 1.48, 1.52, zi + 0.3, zg - 0.1, "alto"); // prateleira
    m.cx("led", x + 0.04, x + 0.28, 1.475, 1.48, zi + 0.4, zg - 0.2, "alto");
    // tanque, máquina de lavar, cooktop com forno embutido e cuba (ordem da planta, da entrada para a varanda)
    m.cx("inox", x + 0.12, x + 0.5, 0.86, 0.91, zi + 0.12, zi + 0.55);
    m.cx("eletro", x + 0.02, x + 0.6, 0.12, 0.84, zi + 0.85, zi + 1.45);
    m.cil("vidroFosco", x + 0.61, 0.48, zi + 1.15, 0.2, 0.01, "movel", [0, 0, Math.PI / 2]);
    m.cx("pretoFosco", x + 0.06, x + 0.58, 0.905, 0.91, zi + 2.0, zi + 2.6); // cooktop
    m.cx("pretoFosco", x + 0.58, x + 0.605, 0.22, 0.78, zi + 2.0, zi + 2.6); // forno
    m.cx("inox", x + 0.605, x + 0.615, 0.68, 0.7, zi + 2.05, zi + 2.55);
    m.cx("inox", x + 0.12, x + 0.5, 0.88, 0.905, zi + 3.2, zi + 3.7); // cuba
    m.cil("cromo", x + 0.06, 0.9, zi + 3.45, 0.012, 0.32);
    // objetos da prateleira (tábuas, vasos)
    m.cil("madeiraNatural", x + 0.12, 1.52, zi + 1.0, 0.16, 0.02, "alto", [0, 0, Math.PI / 2]);
    m.cil("louca", x + 0.15, 1.52, zi + 1.6, 0.04, 0.2, "alto");
    m.cil("louca", x + 0.15, 1.52, zi + 1.8, 0.035, 0.14, "alto");
    // geladeira retrô branca de cantos arredondados
    m.ar("eletro", x + 0.02, x + 0.68, 0.02, 1.55, zg + 0.08, zg + 0.68, 0.08);
    m.cx("cromo", x + 0.69, x + 0.7, 0.95, 1.45, zg + 0.6, zg + 0.62);
    m.obst(C.x0, x + 0.68, zi, zg + 0.7);
    // arandelas de braço com cúpula branca
    for (const z of [zi + 1.2, zi + 3.0]) {
      m.cx("metalBranco", x, x + 0.04, 2.05, 2.1, z - 0.05, z + 0.05, "alto");
      m.girada("metalBranco", [x + 0.4, 2.15, z], [0.8, 0.012, 0.012], [0, 0, 0.12], "caixa");
      m.girada("metalBranco", [x + 0.82, 2.12, z], [0.14, 0.16, 0.14], [0, 0, 0.5], "cilindro");
    }
    m.luz(x + 0.5, 1.9, (zi + zg) / 2, 0.8, 4.5);
  }

  // ═══ LIVING (renders "sala 01" e "sala 02") ═══
  {
    // divisória com a TV e o balcão-bar branco, com banquetas de palhinha
    const xd = C.x1;
    const zb: [number, number] = [S.z0 + 1.3, S.z0 + 2.85];
    m.cx("tv", xd + e, xd + e + 0.02, 1.25, 1.95, zb[0] + 0.15, zb[1] - 0.15, "alto");
    m.cx("pedraBranca", xd + e, xd + 0.65, 0.98, 1.03, zb[0], zb[1]);
    m.cx("pedraBranca", xd + 0.6, xd + 0.65, 0, 0.98, zb[1] - 0.2, zb[1]);
    m.obst(xd, xd + 0.65, zb[0], zb[1]);
    for (const z of [zb[0] + 0.3, zb[0] + 0.8, zb[0] + 1.3]) m.banqueta(xd + 0.95, z, 0.72);
    // sofá modular bouclé caramelo, encostado na parede das suítes (x = S.x1)
    const xs = S.x1 - e;
    const zs: [number, number] = [S.z0 + 0.95, S.z0 + 3.6];
    m.ar("caramelo", xs - 0.95, xs, 0.06, 0.44, zs[0], zs[1], 0.16);
    m.ar("caramelo", xs - 0.3, xs, 0.3, 0.82, zs[0], zs[1], 0.15);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = zs[0] + ((zs[1] - zs[0]) * i) / n;
      m.ar("caramelo", xs - 0.92, xs - 0.28, 0.4, 0.58, a + 0.03, a + (zs[1] - zs[0]) / n - 0.03, 0.12);
    }
    m.obst(xs - 0.95, S.x1, zs[0], zs[1]);
    // tapete bege, poltrona branca e mesa lateral de mármore com a luminária de globo
    m.cx("tapete", S.x1 - 2.3, S.x1 - 0.1, 0.004, 0.016, S.z0 + 0.3, S.z0 + 3.9);
    m.ar("tecidoBranco", xs - 1.95, xs - 1.25, 0.18, 0.45, S.z0 + 0.25, S.z0 + 0.95, 0.12);
    m.girada("tecidoBranco", [xs - 1.6, 0.68, S.z0 + 0.3], [0.7, 0.55, 0.12], [-0.25, 0, 0], "arred", 0.06);
    m.obst(xs - 1.95, xs - 1.25, S.z0 + 0.2, S.z0 + 0.95);
    const lz = zs[1] + 0.32;
    m.cx("marmore", xs - 0.5, xs - 0.05, 0, 0.45, lz - 0.22, lz + 0.22);
    m.cil("pretoFosco", xs - 0.28, 0.45, lz, 0.07, 0.32);
    m.cil("cromo", xs - 0.28, 0.77, lz, 0.2, 0.08);
    m.esf("lampada", xs - 0.28, 0.92, lz, 0.17);
    m.obst(xs - 0.5, S.x1, lz - 0.22, lz + 0.22);
    // quadro de formas orgânicas na parede da entrada
    m.cx("quadroFormas", S.x1 - 1.6, S.x1 - 0.7, 1.15, 2.25, S.z0 + e, S.z0 + e + 0.03, "alto");
    // mesa de jantar redonda de madeira com seis cadeiras (planta)
    const mx = C.x1 + 0.62;
    const mz = S.z0 + 4.6;
    m.cil("madeiraNatural", mx, 0.73, mz, 0.6, 0.04);
    m.cil("madeiraNatural", mx, 0, mz, 0.08, 0.73);
    m.cil("madeiraNatural", mx, 0, mz, 0.3, 0.03);
    m.cil("louca", mx, 0.77, mz, 0.06, 0.18);
    m.esf("planta", mx, 1.0, mz, 0.12);
    m.obst(mx - 0.6, mx + 0.6, mz - 0.6, mz + 0.6);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const cxx = mx + Math.sin(a) * 0.85;
      const czz = mz + Math.cos(a) * 0.85;
      if (cxx < C.x1 + 0.15) continue; // do lado da cozinha a planta não tem cadeira
      m.cadeira(cxx, czz, a + Math.PI, "palhinha");
    }
    // estante metálica branca com livros, ao lado das portas da varanda (render "sala 01")
    const ze: [number, number] = [S.z1 - 0.95, S.z1 - 0.15];
    for (const z of ze) for (const xx of [S.x1 - 0.36, S.x1 - e - 0.02]) m.cx("metalBranco", xx - 0.012, xx + 0.012, 0, 2.3, z - 0.012, z + 0.012, "alto");
    for (const y of [0.45, 0.85, 1.25, 1.65, 2.05]) {
      m.cx("metalBranco", S.x1 - 0.37, S.x1 - e, y, y + 0.02, ze[0], ze[1]);
      m.cx("livros", S.x1 - 0.3, S.x1 - 0.12, y + 0.02, y + 0.26, ze[0] + 0.05, ze[0] + 0.05 + (y > 1 ? 0.35 : 0.55));
    }
    m.obst(S.x1 - 0.37, S.x1, ze[0], ze[1]);
    // porta de entrada
    const ent = t.portas.find((p) => p.id === "entrada");
    if (ent) m.cx("porta", Math.min(ent.p1[0], ent.p2[0]) + 0.02, Math.max(ent.p1[0], ent.p2[0]) - 0.02, 0, 2.08, S.z0 + 0.02, S.z0 + 0.06, "parede");
    // spots embutidos no forro bege
    for (const [sx, sz] of [[S.x1 - 1.2, S.z0 + 1.2], [S.x1 - 1.2, S.z0 + 2.9], [C.x1 + 0.7, S.z0 + 3.3], [C.x1 + 0.7, S.z0 + 4.8], [C.x1 + 1.9, S.z0 + 4.8], [C.x0 + 0.9, S.z0 + 0.6]] as const) m.spot(sx, sz);
    m.luz(S.x1 - 1.3, 2.2, S.z0 + 2.2, 1, 5.5);
    m.luz(mx, 2.2, mz, 0.8, 4.5);
  }

  // ═══ PORTAS DE VIDRO DE CORRER (perfis bronze), entre o living e a varanda ═══
  {
    const z = V.z0;
    const folha = (x0: number, x1: number, dz: number) => {
      m.cx("vidro", x0, x1, 0.02, 2.36, z + dz - 0.006, z + dz + 0.006, "parede");
      m.cx("bronze", x0, x1, 2.34, 2.4, z + dz - 0.02, z + dz + 0.02, "alto");
      m.cx("bronze", x0, x1, 0, 0.03, z + dz - 0.02, z + dz + 0.02, "parede");
      for (const xx of [x0, x1]) m.cx("bronze", xx - 0.02, xx + 0.02, 0, 2.4, z + dz - 0.02, z + dz + 0.02, "parede");
    };
    const a = C.x1;
    const b = S.x1 - 0.3;
    const meio = (a + b) / 2;
    folha(a, meio, -0.03);
    folha(a + 0.15, meio + 0.1, 0.03); // folha de correr aberta sobre a fixa
    folha(C.x0 + 0.85, C.x1, 0);
  }

  // ═══ VARANDA GOURMET (planta): churrasqueira na parede x = V.x0, mesa oval de pedra e seis cadeiras ═══
  {
    const x = V.x0 + e;
    m.cx("madeiraClara", x, x + 0.6, 0.1, 0.86, V.z0 + 0.1, V.z1 - 0.55);
    m.cx("marmore", x, x + 0.63, 0.86, 0.9, V.z0 + 0.1, V.z1 - 0.55);
    m.cx("pretoFosco", x + 0.08, x + 0.52, 0.9, 0.915, V.z0 + 0.3, V.z0 + 0.85); // grelha embutida (planta)
    m.cx("inox", x + 0.12, x + 0.5, 0.88, 0.905, V.z0 + 1.25, V.z0 + 1.65);
    m.obst(V.x0, x + 0.63, V.z0 + 0.1, V.z1 - 0.55);
    const tx = (V.x0 + V.x1) / 2 + 0.05;
    const tz = (V.z0 + V.z1) / 2 - 0.1;
    m.girada("pedraBranca", [tx, 0.74, tz], [0.85, 0.04, 1.35], [0, 0, 0], "arred", 0.02);
    m.cil("pedraBranca", tx, 0, tz, 0.12, 0.72);
    m.cil("pedraBranca", tx, 0, tz, 0.3, 0.03);
    m.obst(tx - 0.45, tx + 0.45, tz - 0.7, tz + 0.7);
    for (const s of [-1, 1]) for (const dz of [-0.45, 0, 0.45]) m.cadeira(tx + s * 0.75, tz + dz, s > 0 ? -Math.PI / 2 : Math.PI / 2, "tecidoCinza");
    // banco e vaso com planta junto à parede da suíte
    m.cx("marmoreVerde", V.x1 - 0.5, V.x1 - e, 0, 0.45, V.z0 + 0.25, V.z1 - 0.9);
    m.obst(V.x1 - 0.5, V.x1, V.z0 + 0.25, V.z1 - 0.9);
    m.cil("louca", V.x1 - 0.45, 0, V.z1 - 0.45, 0.24, 0.55);
    m.esf("planta", V.x1 - 0.45, 0.95, V.z1 - 0.45, 0.42);
    m.obst(V.x1 - 0.72, V.x1, V.z1 - 0.72, V.z1);
    for (const [sx, sz] of [[tx, tz - 0.5], [tx, tz + 0.5], [x + 0.9, V.z0 + 0.6]] as const) m.spot(sx, sz);
    m.luz(tx, 2.2, tz, 0.8, 4.5);
  }

  // ═══ SUÍTE MASTER (render "suíte") ═══
  {
    // a suíte é um retângulo até z = zq, mais o vestíbulo de entrada (planta)
    const zq = Q.z0 + 2.86;
    // closet com portas de vidro fosco, arara cromada e base de mármore verde
    const xc = Q.x0 + e;
    const zc: [number, number] = [Q.z0 + 0.1, zq - 0.72];
    m.cx("marmoreVerde", xc, xc + 0.58, 0, 0.42, zc[0], zc[1]);
    m.cx("cromo", xc + 0.28, xc + 0.3, 1.75, 1.77, zc[0] + 0.05, zc[1] - 0.05, "alto");
    for (let k = 0; k < 9; k++) {
      const z = zc[0] + 0.25 + k * ((zc[1] - zc[0] - 0.5) / 8);
      m.cx(k % 3 === 0 ? "tecidoCinza" : "tecidoBranco", xc + 0.2, xc + 0.38, 0.85, 1.72, z - 0.05, z + 0.05, "alto");
    }
    for (const [z0, z1] of [[zc[0], (zc[0] + zc[1]) / 2 + 0.05], [(zc[0] + zc[1]) / 2 - 0.05, zc[1]]] as const) {
      m.cx("vidroFosco", xc + 0.6, xc + 0.615, 0.02, 2.48, z0, z1, "parede");
      m.cx("cromo", xc + 0.598, xc + 0.618, 0, 2.5, z1 - 0.02, z1, "parede");
    }
    m.cx("led", xc + 0.05, xc + 1.15, H - 0.012, H - 0.004, zc[0], zc[1], "alto"); // forro iluminado sobre o closet
    m.obst(Q.x0, xc + 0.62, zc[0], zc[1]);
    // penteadeira branca com pufe caramelo (planta e render)
    m.cx("pedraBranca", xc + 0.05, xc + 1.35, 0.72, 0.76, zq - 0.55, zq - e);
    m.cx("pedraBranca", xc + 1.3, xc + 1.35, 0, 0.72, zq - 0.55, zq - e);
    m.cil("caramelo", xc + 0.65, 0, zq - 0.85, 0.22, 0.42);
    m.obst(xc, xc + 1.35, zq - 0.55, zq);
    // cama com cabeceira de veludo caramelo, encostada na parede z = Q.z0 (planta)
    const bx: [number, number] = [6.9 + (Q.x0 - 4.8), 8.45 + (Q.x0 - 4.8)];
    m.cama(bx[0], bx[1], Q.z0 + 0.18, Q.z0 + 2.25, "z0", "veludo", "veludo");
    m.cx("tecidoBranco", bx[0] - 0.03, bx[1] + 0.03, 0.6, 0.63, Q.z0 + 1.6, Q.z0 + 2.1); // manta nos pés
    // banco tubular cromado aos pés da cama
    for (let k = 0; k < 8; k++) m.cil("cromo", bx[0] + 0.1 + k * 0.17, 0.42, Q.z0 + 2.55, 0.012, 0.36, "movel", [Math.PI / 2, 0, 0]);
    for (const xx of [bx[0] + 0.1, bx[1] - 0.15]) m.cx("cromo", xx - 0.01, xx + 0.01, 0, 0.42, Q.z0 + 2.37, Q.z0 + 2.73);
    m.obst(bx[0], bx[1], Q.z0 + 2.35, Q.z0 + 2.75);
    // criados: mesa de resina âmbar e mesa redonda com luminária globo
    m.cil("resinaAmbar", bx[1] + 0.3, 0, Q.z0 + 0.42, 0.21, 0.55);
    m.cil("resinaAmbar", bx[1] + 0.3, 0.55, Q.z0 + 0.42, 0.25, 0.02);
    m.obst(bx[1] + 0.08, bx[1] + 0.52, Q.z0 + 0.2, Q.z0 + 0.65);
    m.cil("madeiraClara", bx[0] - 0.3, 0, Q.z0 + 0.42, 0.2, 0.5);
    m.esf("lampada", bx[0] - 0.3, 0.68, Q.z0 + 0.42, 0.13);
    m.obst(bx[0] - 0.52, bx[0] - 0.08, Q.z0 + 0.2, Q.z0 + 0.65);
    // painel de espelho fumê com a TV e quadro em degradê laranja
    const xv = Q.x0 + 2.65; // fim do vão do vestíbulo
    m.cx("espelhoFume", xv, Q.x1 - 0.05, 0.4, 2.45, zq - e - 0.02, zq - e, "alto");
    m.cx("tv", xv + 0.1, Q.x1 - 0.15, 1.05, 1.7, zq - e - 0.05, zq - e - 0.02, "alto");
    m.cx("bronze", xc + 0.75, xc + 1.5, 1.25, 2.15, Q.z0 + e, Q.z0 + e + 0.03, "alto");
    m.cx("quadroDegrade", xc + 0.78, xc + 1.47, 1.28, 2.12, Q.z0 + e + 0.03, Q.z0 + e + 0.035, "alto");
    m.cx("tapete", bx[0] - 0.4, Q.x1 - 0.1, 0.004, 0.016, Q.z0 + 0.35, zq - 0.15);
    m.spot((bx[0] + bx[1]) / 2, Q.z0 + 2.4);
    m.spot(bx[1] + 0.2, zq - 0.4);
    m.luz(bx[0] - 0.3, 1.0, Q.z0 + 0.5, 0.7, 4);
    m.luz(xc + 0.6, 2.3, (zc[0] + zc[1]) / 2, 0.7, 3.5);
  }

  // ═══ BANHOS E LAVABO (planta ilustrada; sem render oficial) ═══
  const banho = (id: string, bancada: [number, number, number, number], parede: "x0" | "x1" | "z1", bacia: [number, number, number], box?: [number, number, number, number, "x" | "z", number]) => {
    if (!t.comodos.some((c) => c.id === id)) return;
    m.bancadaBanho(...bancada, parede);
    m.bacia(...bacia);
    if (box) m.box(...box);
  };
  {
    const B = de("banheiro");
    banho("banheiro", [B.x0 + 0.15, B.x0 + 1.3, B.z1 - 0.55, B.z1 - e], "z1", [B.x0 + 1.85, B.z1 - 0.35, Math.PI], [B.x1 - 1.0, B.x1 - e, B.z0 + e, B.z1 - e, "x", B.x1 - 1.0]);
    const L = de("lavabo");
    banho("lavabo", [L.x0 + e, L.x0 + 0.5, L.z0 + 0.35, L.z0 + 1.0], "x0", [L.x1 - 0.4, L.z0 + 0.3, 0]);
    const B1 = de("banho1");
    banho("banho1", [B1.x0 + e, B1.x0 + 0.55, B1.z0 + 0.2, B1.z0 + 1.0], "x0", [B1.x1 - 0.35, B1.z0 + 0.35, 0], [B1.x0 + e, B1.x1 - e, B1.z1 - 1.0, B1.z1 - e, "z", B1.z1 - 1.0]);
    const B2 = de("banho2");
    banho("banho2", [B2.x1 - 0.55, B2.x1 - e, B2.z0 + 0.2, B2.z0 + 1.0], "x1", [B2.x0 + 0.35, B2.z0 + 0.35, 0], [B2.x0 + e, B2.x1 - e, B2.z1 - 1.0, B2.z1 - e, "z", B2.z1 - 1.0]);
  }

  // ═══ SUÍTES 1 E 2 (planta ilustrada; sem render oficial) ═══
  {
    const S1 = de("suite1");
    m.cama(S1.x0 + e + 0.02, S1.x0 + 1.0, S1.z0 + 0.8, S1.z0 + 3.0, "z0", "tecidoBranco", "tecidoBranco");
    m.cx("madeiraClara", S1.x0 + e + 0.05, S1.x0 + 1.6, 0, 2.3, S1.z0 + e, S1.z0 + 0.58);
    m.obst(S1.x0, S1.x0 + 1.6, S1.z0, S1.z0 + 0.6);
    m.cil("tapete", S1.x0 + 1.95, 0, S1.z0 + 1.85, 0.6, 0.012);
    m.cil("madeiraClara", S1.x1 - 0.4, 0, S1.z0 + 1.6, 0.25, 0.7);
    m.obst(S1.x1 - 0.65, S1.x1 - 0.15, S1.z0 + 1.35, S1.z0 + 1.85);
    m.spot((S1.x0 + S1.x1) / 2, (S1.z0 + S1.z1) / 2);
    m.luz((S1.x0 + S1.x1) / 2, 2.2, (S1.z0 + S1.z1) / 2, 0.7, 4);
    const S2 = de("suite2");
    m.cama(S2.x1 - 2.25, S2.x1 - e - 0.02, S2.z0 + 0.15, S2.z0 + 1.05, "x1", "tecidoBranco", "tecidoBranco");
    m.cx("marmoreVerde", S2.x0 + 0.25, S2.x0 + 2.1, 0.72, 0.76, S2.z1 - 0.6, S2.z1 - e);
    for (const xx of [S2.x0 + 0.3, S2.x0 + 2.05]) m.cx("marmoreVerde", xx - 0.03, xx + 0.03, 0, 0.72, S2.z1 - 0.6, S2.z1 - e);
    m.cadeira(S2.x0 + 1.15, S2.z1 - 0.85, 0, "tecidoCinza");
    m.obst(S2.x0 + 0.25, S2.x0 + 2.1, S2.z1 - 0.6, S2.z1);
    m.spot((S2.x0 + S2.x1) / 2, (S2.z0 + S2.z1) / 2);
    m.luz((S2.x0 + S2.x1) / 2, 2.2, (S2.z0 + S2.z1) / 2, 0.7, 4);
  }

  return { prims: m.prims, obstaculos: m.obstaculos, jardins: [], luzes: m.luzes };
}
