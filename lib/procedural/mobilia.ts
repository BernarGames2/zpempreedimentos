import { tipoPorId } from "../dados";
import type { TipoPlanta, Vec2 } from "../types";
import { PE_LIVRE, type Ret } from "./planta";

/** Materiais do interior (ver components/three/materiaisInterior.ts). Paleta dos renders oficiais do Liwo. */
export type MatInt =
  | "parede" | "teto" | "madeiraClara" | "madeiraNatural" | "marmore" | "marmoreVerde" | "pedraBranca"
  | "caramelo" | "veludo" | "tecidoBranco" | "tecidoCinza" | "palhinha" | "cromo" | "bronze" | "metalBranco"
  | "pretoFosco" | "tecidoVerde" | "laqueado" | "vidro" | "vidroFosco" | "espelhoFume" | "tv" | "louca" | "eletro" | "inox" | "led" | "lampada"
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

/** Móvel com modelo 3D de terceiros (arquivo em /public/modelos; licenças em CREDITOS.md). */
export interface Modelo {
  id: "bacia" | "geladeira" | "lavadora" | "sofa-l" | "cama-casal" | "cama-solteiro" | "cadeira" | "mesa-jantar" | "luminaria" | "mesa-centro" | "mesa-lateral" | "aparador" | "planta-grande" | "planta-pequena" | "vaso-a" | "vaso-b";
  pos: [number, number, number];
  rotY?: number;
  escala?: [number, number, number];
}

export interface Mobilia {
  /** Modelos GLB que substituem peças geradas por código (só nas plantas já convertidas). */
  modelos?: Modelo[];
  prims: Prim[];
  /** Pegadas dos móveis no piso, para a colisão da câmera. */
  obstaculos: Ret[];
  /** Painéis de jardim vertical (não há no Liwo; mantido para outros empreendimentos). */
  jardins: { x: number; z0: number; z1: number; y1: number }[];
  /** Luzes pontuais reais (poucas): posição e intensidade relativa. */
  luzes: { pos: [number, number, number]; forca: number; alcance: number }[];
}

class M {
  /** Com `gl`, as peças que têm modelo 3D entram como GLB; sem ele, a versão gerada por código. */
  gl = false;
  modelos: Modelo[] = [];
  troca(codigo: () => void, ...ms: Modelo[]): void {
    if (this.gl) this.modelos.push(...ms);
    else codigo();
  }
  prims: Prim[] = [];
  obstaculos: Ret[] = [];
  luzes: Mobilia["luzes"] = [];
  cx(mat: MatInt, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, camada: Camada = "movel", forma: Prim["forma"] = "caixa", raio = 0.03): void {
    this.prims.push({ forma, mat, pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], tam: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], camada, raio });
    if (mat === "laqueado" && forma === "caixa" && camada === "movel") this.portasDeArmario(x0, x1, y0, y1, z0, z1);
  }
  /** Marcenaria laqueada: juntas entre as portas e puxadores de bronze nas duas faces compridas (a de trás fica contra a parede). */
  private portasDeArmario(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): void {
    const [xa, xb, ya, yb, za, zb] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1), Math.min(z0, z1), Math.max(z0, z1)];
    const h = yb - ya;
    const alto = h >= 1.8;
    if (!alto && (h < 0.55 || h > 0.95)) return;
    const emX = xb - xa >= zb - za;
    const [l0, l1, d0, d1] = emX ? [xa, xb, za, zb] : [za, zb, xa, xb];
    if (l1 - l0 < 0.5) return;
    const n = Math.max(1, Math.round((l1 - l0) / (alto ? 0.5 : 0.55)));
    const w = (l1 - l0) / n;
    const caixa = (mat: MatInt, a0: number, a1: number, b0: number, b1: number, p0: number, p1: number) => {
      const [X0, X1, Z0, Z1] = emX ? [a0, a1, p0, p1] : [p0, p1, a0, a1];
      this.prims.push({ forma: "caixa", mat, pos: [(X0 + X1) / 2, (b0 + b1) / 2, (Z0 + Z1) / 2], tam: [X1 - X0, b1 - b0, Z1 - Z0], camada: "movel" });
    };
    for (let i = 1; i < n; i++) caixa("pretoFosco", l0 + i * w - 0.003, l0 + i * w + 0.003, ya + 0.01, yb - 0.01, d0 - 0.002, d1 + 0.002);
    if (alto) caixa("pretoFosco", l0 + 0.005, l1 - 0.005, yb - 0.42, yb - 0.414, d0 - 0.002, d1 + 0.002); // maleiro
    for (let i = 0; i < n; i++) {
      const a = l0 + i * w;
      for (const [p0, p1] of [[d0 - 0.028, d0], [d1, d1 + 0.028]] as const) {
        if (alto) {
          const al = a + (i % 2 === 0 ? w - 0.05 : 0.05);
          caixa("bronze", al - 0.007, al + 0.007, ya + 0.95, ya + 1.25, p0, p1);
        } else caixa("bronze", a + w / 2 - 0.08, a + w / 2 + 0.08, yb - 0.1, yb - 0.086, p0, p1);
      }
    }
  }
  ar(mat: MatInt, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, raio = 0.05, camada: Camada = "movel"): void {
    this.cx(mat, x0, x1, y0, y1, z0, z1, camada, "arred", raio);
  }
  /** Cilindro vertical (raio, altura) com a base em y0. */
  cil(mat: MatInt, x: number, y0: number, z: number, r: number, h: number, camada: Camada = "movel", rot?: [number, number, number]): void {
    this.prims.push({ forma: "cilindro", mat, pos: [x, y0 + h / 2, z], tam: [r * 2, h, r * 2], camada, rot });
  }
  esf(mat: MatInt, x: number, y: number, z: number, r: number, camada: Camada = "movel"): void {
    if (mat === "planta" && r >= 0.1) {
      // folhagem em tufos de dois verdes: uma esfera lisa não lê como planta
      this.prims.push({ forma: "esfera", mat, pos: [x, y - r * 0.1, z], tam: [r * 1.25, r * 1.05, r * 1.25], camada });
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39996;
        const h = ((i % 3) - 1) * 0.42 * r;
        const d = r * (0.5 + (i % 2) * 0.18);
        const rr = r * (0.42 + ((i * 37) % 10) / 45);
        this.prims.push({ forma: "esfera", mat: i % 2 ? "folhagem" : "planta", pos: [x + Math.cos(a) * d, y + h, z + Math.sin(a) * d], tam: [rr * 2, rr * 1.6, rr * 2], camada });
      }
      return;
    }
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
    if (this.gl) {
      // cadeira de madeira com encosto de palhinha (modelo de 0,61 m de largura, estreitado para 0,52 m)
      this.modelos.push({ id: "cadeira", pos: [x, 0, z], rotY: dir, escala: [0.85, 1, 0.85] });
      this.obst(x - 0.24, x + 0.24, z - 0.24, z + 0.24);
      return;
    }
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
  bancadaBanho(x0: number, x1: number, z0: number, z1: number, parede: "x0" | "x1" | "z0" | "z1", y = 0.86): void {
    this.cx("madeiraClara", x0, x1, 0.3, y - 0.04, z0, z1);
    this.cx("marmore", x0 - 0.01, x1 + 0.01, y - 0.04, y, z0 - 0.01, z1 + 0.01);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    this.cil("louca", cx, y, cz, 0.19, 0.12);
    if (parede === "z1") {
      this.cx("espelhoFume", x0 + 0.05, x1 - 0.05, 1.15, 2.05, z1 - 0.02, z1, "alto");
      this.cil("cromo", cx, y, z1 - 0.07, 0.012, 0.3);
    } else if (parede === "z0") {
      this.cx("espelhoFume", x0 + 0.05, x1 - 0.05, 1.15, 2.05, z0, z0 + 0.02, "alto");
      this.cil("cromo", cx, y, z0 + 0.07, 0.012, 0.3);
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
    if (this.gl) {
      // bacia com caixa acoplada (o modelo tem o fundo em z = 0 e avança 0,60 m)
      this.modelos.push({ id: "bacia", pos: [x - sa * 0.22, 0, z - ca * 0.22], rotY: dir });
      this.obst(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
      return;
    }
    this.girada("louca", [x - sa * 0.12, 0.6, z - ca * 0.12], [0.38, 0.4, 0.16], [0, dir, 0], "arred", 0.05);
    this.girada("louca", [x + sa * 0.12, 0.2, z + ca * 0.12], [0.36, 0.4, 0.52], [0, dir, 0], "arred", 0.12);
    this.obst(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
  }
  /** Geladeira ou lavadora: modelo 3D ajustado à pegada da planta, com a frente voltada para `frente`; sem modelos, `codigo`. */
  eletro(id: "geladeira" | "lavadora", x0: number, x1: number, z0: number, z1: number, frente: "x0" | "x1" | "z0" | "z1", codigo: () => void): void {
    if (!this.gl) return codigo();
    // medidas do modelo (largura, profundidade, altura, base em y) e altura real da peça
    const [w, d, h, base, real] = id === "geladeira" ? [3.957, 3.417, 7.953, 0, 1.85] : [23.62, 21.96, 33.46, 16.732, 0.85];
    const emZ = frente === "z0" || frente === "z1";
    const sx = (emZ ? x1 - x0 : z1 - z0) / w;
    const sz = (emZ ? z1 - z0 : x1 - x0) / d;
    const sy = real / h;
    const rotY = frente === "z1" ? 0 : frente === "z0" ? Math.PI : frente === "x1" ? Math.PI / 2 : -Math.PI / 2;
    this.modelos.push({ id, pos: [(x0 + x1) / 2, base * sy, (z0 + z1) / 2], rotY, escala: [sx, sy, sz] });
  }
  /** Box de vidro com chuveiro de teto. */
  box(x0: number, x1: number, z0: number, z1: number, vidro: "x" | "z", c: number): void {
    if (vidro === "x") this.cx("vidro", c - 0.005, c + 0.005, 0, 2.05, z0, z1, "parede");
    else this.cx("vidro", x0, x1, 0, 2.05, c - 0.005, c + 0.005, "parede");
    this.cil("cromo", (x0 + x1) / 2, PE_LIVRE - 0.04, (z0 + z1) / 2, 0.12, 0.012, "alto");
    this.cx("pedraBranca", x0, x1, 0, 0.012, z0, z1);
  }
  /** Cama: base estofada, colchão, edredom, travesseiros e cabeceira, no lado `cabeceira` da pegada. */
  cama(x0: number, x1: number, z0: number, z1: number, cabeceira: "z0" | "z1" | "x0" | "x1", base: MatInt, cab: MatInt): void {
    if (this.gl && base !== "veludo") {
      // modelo 3D ajustado à pegada da cama na planta; a cabeceira do modelo fica em -z
      const emZ = cabeceira === "z0" || cabeceira === "z1";
      const [larg, comp] = emZ ? [x1 - x0, z1 - z0] : [z1 - z0, x1 - x0];
      const casal = larg >= 1.25;
      // medidas do modelo: largura, comprimento, distância da origem à cabeceira, unidade (o de solteiro está em cm)
      const [mw, ml, mh, un] = casal ? [1.974, 2.271, 1.065, 1] : [1.0, 2.107, 1.0535, 0.01];
      const folga = casal ? 0.12 : 0.06;
      const sx = larg / mw;
      const sz = (comp + folga) / ml;
      const d = mh * sz - folga; // da borda da cabeceira (na planta) até a origem do modelo
      const pos: [number, number, number] =
        cabeceira === "z0" ? [(x0 + x1) / 2, 0, z0 + d] : cabeceira === "z1" ? [(x0 + x1) / 2, 0, z1 - d] : cabeceira === "x0" ? [x0 + d, 0, (z0 + z1) / 2] : [x1 - d, 0, (z0 + z1) / 2];
      const rotY = cabeceira === "z0" ? 0 : cabeceira === "z1" ? Math.PI : cabeceira === "x0" ? Math.PI / 2 : -Math.PI / 2;
      this.modelos.push({ id: casal ? "cama-casal" : "cama-solteiro", pos, rotY, escala: [sx * un, ((sx + sz) / 2) * un, sz * un] });
      this.obst(x0, x1, z0, z1);
      return;
    }
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
    } else if (cabeceira === "z1") {
      this.ar("tecidoBranco", x0 - 0.02, x1 + 0.02, 0.5, 0.62, z0 - 0.02, z1 - 0.6, 0.05);
      const n = Math.max(1, Math.round((x1 - x0) / 0.75));
      for (let i = 0; i < n; i++) {
        const a = x0 + ((x1 - x0) * i) / n;
        this.girada("tecidoBranco", [a + (x1 - x0) / n / 2, 0.72, z1 - 0.3], [(x1 - x0) / n - 0.06, 0.2, 0.36], [0.35, 0, 0], "arred", 0.08);
      }
      this.ar(cab, x0 - 0.15, x1 + 0.15, 0, 1.15, z1 - 0.02, z1 + 0.16, 0.09);
    } else if (cabeceira === "x0") {
      this.ar("tecidoBranco", x0 + 0.6, x1 + 0.02, 0.5, 0.62, z0 - 0.02, z1 + 0.02, 0.05);
      this.girada("tecidoBranco", [x0 + 0.3, 0.72, (z0 + z1) / 2], [0.36, 0.2, z1 - z0 - 0.1], [0, 0, -0.35], "arred", 0.08);
      this.ar(cab, x0 - 0.14, x0 + 0.02, 0, 1.05, z0 - 0.08, z1 + 0.08, 0.06);
    } else {
      this.ar("tecidoBranco", x0 - 0.02, x1 - 0.6, 0.5, 0.62, z0 - 0.02, z1 + 0.02, 0.05);
      this.girada("tecidoBranco", [x1 - 0.3, 0.72, (z0 + z1) / 2], [0.36, 0.2, z1 - z0 - 0.1], [0, 0, 0.35], "arred", 0.08);
      this.ar(cab, x1 - 0.02, x1 + 0.14, 0, 1.05, z0 - 0.08, z1 + 0.08, 0.06);
    }
    this.obst(x0, x1, z0, z1);
    if (base === "veludo") return; // a cama da suíte master do final 02 segue o render oficial
    // manta dobrada no pé da cama e almofada junto aos travesseiros (as plantas mostram roupa de cama em dois tons)
    const emZ = cabeceira === "z0" || cabeceira === "z1";
    const s = cabeceira === "z0" || cabeceira === "x0" ? 1 : -1;
    const ini = emZ ? (s > 0 ? z0 : z1) : s > 0 ? x0 : x1;
    const comp = emZ ? z1 - z0 : x1 - x0;
    const [a, b] = [ini + s * comp * 0.66, ini + s * comp * 0.9].sort((p, q) => p - q) as [number, number];
    const c = ini + s * 0.62;
    if (emZ) {
      this.ar("tecidoCinza", x0 - 0.035, x1 + 0.035, 0.44, 0.645, a, b, 0.04);
      this.girada("tecidoVerde", [(x0 + x1) / 2, 0.76, c], [0.44, 0.3, 0.12], [-s * 0.3, 0, 0], "arred", 0.05);
    } else {
      this.ar("tecidoCinza", a, b, 0.44, 0.645, z0 - 0.035, z1 + 0.035, 0.04);
      this.girada("tecidoVerde", [c, 0.76, (z0 + z1) / 2], [0.12, 0.3, 0.44], [0, 0, s * 0.3], "arred", 0.05);
    }
  }
}

function limites(pol: Vec2[]): Ret {
  const xs = pol.map((p) => p[0]);
  const zs = pol.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/**
 * Mobília do apartamento de 91 m² (final 01; o 05 é o espelho), posicionada pelo desenho da planta
 * oficial ilustrada (medidas convertidas de pixels a 82,4 px/m). Não há render oficial deste final:
 * as peças seguem só o que a planta mostra, com os materiais neutros da paleta do Liwo.
 */
function mobiliaFinal01(m: M): void {
  const e = 0.05;
  const H = PE_LIVRE;
  // ═══ LIVING: sofá em L com almofadas verdes, tapete, mesa de centro redonda, aparador e mesa de jantar redonda ═══
  m.cx("tapete", 5.12, 8.5, 0.004, 0.016, 5.83, 8.05);
  m.troca(
    () => {
      m.ar("tecidoCinza", 5.97, 8.58 - e, 0.06, 0.44, 5.6 + e, 6.55, 0.14); // assento
      m.ar("tecidoCinza", 5.97, 8.58 - e, 0.3, 0.84, 5.6 + e, 5.88, 0.12); // encosto
      m.ar("tecidoCinza", 7.65, 8.58 - e, 0.06, 0.44, 6.4, 7.08, 0.14); // chaise
      for (const x of [6.0, 7.05]) m.ar("tecidoCinza", x, x + 1.0, 0.4, 0.58, 5.92, 6.5, 0.12);
      for (const [x, z] of [[6.25, 5.98], [6.95, 5.98], [7.85, 5.98], [8.3, 6.15]] as const) m.girada("tecidoVerde", [x, 0.72, z], [0.42, 0.38, 0.12], [-0.25, 0, 0], "arred", 0.06);
      m.ar("tecidoCinza", 5.97, 6.12, 0.3, 0.62, 5.65, 6.55, 0.06); // braço
    },
    // sofá cinza em L com chaise, como na planta (2,61 m de frente; chaise até z = 7,08, no lado da entrada)
    { id: "sofa-l", pos: [7.275, 0, 6.36], escala: [-1.16, 1.04, 0.97] },
  );
  m.obst(5.97, 8.63, 5.6, 6.55);
  m.obst(7.65, 8.63, 6.4, 7.08);
  m.troca(
    () => {
      m.cil("madeiraClara", 6.7, 0, 7.32, 0.34, 0.36);
      m.cil("louca", 6.62, 0.36, 7.25, 0.08, 0.14);
      m.esf("planta", 6.62, 0.58, 7.25, 0.13);
    },
    { id: "mesa-centro", pos: [6.7, 0, 7.32], escala: [0.56, 0.8, 0.56] },
    { id: "planta-pequena", pos: [6.62, 0.392, 7.27], escala: [1.3, 1.3, 1.3] },
  );
  m.obst(6.36, 7.04, 6.98, 7.66);
  m.troca(
    () => {
      m.cx("madeiraClara", 5.45, 5.8, 0, 0.55, 5.72, 6.08); // mesa lateral com luminária
      m.cil("metalBranco", 5.62, 0.55, 5.9, 0.012, 0.35);
      m.cil("tecidoBranco", 5.62, 0.86, 5.9, 0.13, 0.2);
    },
    { id: "mesa-lateral", pos: [5.625, 0, 5.9], escala: [0.7, 0.95, 0.8] },
    { id: "luminaria", pos: [5.625, 0.52, 5.9] },
  );
  m.obst(5.45, 5.8, 5.72, 6.08);
  m.troca(
    () => m.cx("madeiraNatural", 5.73, 7.36, 0, 0.78, 8.17, 8.5 - e), // aparador junto à mureta da lavanderia
    { id: "aparador", pos: [6.545, 0, 8.31], rotY: Math.PI, escala: [0.668, 1.1, 0.58] },
    { id: "vaso-a", pos: [6.1, 0.748, 8.31], escala: [0.8, 0.8, 0.8] },
    { id: "vaso-b", pos: [6.34, 0.748, 8.33], escala: [0.8, 0.8, 0.8] },
  );
  // portas de vidro de correr entre o living e a varanda (linha clara na planta, de z = 6,01 a 9,49)
  {
    const x = 2.4;
    const folha = (z0: number, z1: number, dx: number) => {
      m.cx("vidro", x + dx - 0.006, x + dx + 0.006, 0.02, 2.36, z0, z1, "parede");
      m.cx("bronze", x + dx - 0.02, x + dx + 0.02, 2.34, 2.4, z0, z1, "alto");
      m.cx("bronze", x + dx - 0.02, x + dx + 0.02, 0, 0.03, z0, z1, "parede");
      for (const zz of [z0, z1]) m.cx("bronze", x + dx - 0.02, x + dx + 0.02, 0, 2.4, zz - 0.02, zz + 0.02, "parede");
    };
    folha(6.01, 6.9, -0.03); // fixa
    folha(6.75, 7.65, 0.03); // de correr, aberta sobre a fixa
    folha(8.6, 9.49, -0.03); // fixa junto à cozinha
  }
  m.obst(5.73, 7.36, 8.17, 8.55);
  // mesa de jantar redonda (Ø 1,38 m) com seis cadeiras de madeira e palhinha
  m.troca(
    () => {
      m.cil("madeiraClara", 3.9, 0.72, 7.14, 0.69, 0.04);
      m.cil("madeiraNatural", 3.9, 0, 7.14, 0.09, 0.72);
      m.cil("madeiraNatural", 3.9, 0, 7.14, 0.32, 0.03);
    },
    // mesa redonda de madeira clara (modelo de Ø 1,20 m ampliado para os 1,38 m da planta)
    { id: "mesa-jantar", pos: [3.9, 0.01, 7.14], escala: [1.15, 1.03, 1.15] },
  );
  m.troca(
    () => {
      m.cil("louca", 3.9, 0.76, 7.14, 0.1, 0.16);
      m.esf("planta", 3.9, 1.0, 7.14, 0.16);
    },
    { id: "planta-pequena", pos: [3.9, 0.76, 7.14], rotY: 1.2, escala: [1.7, 1.7, 1.7] },
  );
  m.obst(3.21, 4.59, 6.45, 7.83);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = 3.9 + Math.sin(a) * 0.98;
    const z = 7.14 + Math.cos(a) * 0.98;
    m.cadeira(x, z, a + Math.PI, "palhinha");
  }
  for (const [x, z] of [[3.9, 7.14], [6.7, 7.3], [7.9, 9.4], [5.2, 6.4]] as const) m.spot(x, z);
  m.luz(3.9, 2.2, 7.14, 0.9, 5);
  m.luz(6.9, 2.2, 7.0, 0.9, 5);
  m.luz(8.0, 2.2, 9.4, 0.5, 3);

  // ═══ COZINHA (integrada ao living): geladeira, bancada com cuba e cooktop, lavadora e tanque, na parede de baixo ═══
  {
    const z1 = 10.15 - e;
    m.eletro("geladeira", 2.51, 3.2, z1 - 0.68, z1, "z0", () => {
      m.cx("pretoFosco", 2.51, 3.2, 0, 1.85, z1 - 0.68, z1); // geladeira (escura na planta)
      m.cx("cromo", 3.18, 3.2, 0.95, 1.6, z1 - 0.7, z1 - 0.66);
    });
    m.obst(2.46, 3.24, z1 - 0.7, z1 + e);
    m.cx("laqueado", 3.28, 5.7, 0.1, 0.86, z1 - 0.6, z1);
    m.cx("pretoFosco", 3.28, 5.7, 0, 0.1, z1 - 0.56, z1);
    m.cx("pedraBranca", 3.26, 5.72, 0.86, 0.9, z1 - 0.62, z1);
    m.cx("inox", 3.68, 4.14, 0.88, 0.905, z1 - 0.5, z1 - 0.12); // cuba
    m.cil("cromo", 3.91, 0.9, z1 - 0.06, 0.012, 0.32);
    m.cx("pretoFosco", 4.72, 5.3, 0.9, 0.912, z1 - 0.54, z1 - 0.06); // cooktop de 4 bocas
    for (const [dx, dz] of [[0.14, 0.14], [0.44, 0.14], [0.14, 0.34], [0.44, 0.34]] as const) m.cil("inox", 4.72 + dx, 0.912, z1 - 0.54 + dz, 0.06, 0.006);
    m.cx("pedraBranca", 3.28, 5.7, 0.9, 1.5, z1 - 0.02, z1, "alto"); // frontão
    m.eletro("lavadora", 5.78, 6.38, z1 - 0.6, z1, "z0", () => {
      m.ar("eletro", 5.76, 6.4, 0, 0.85, z1 - 0.6, z1, 0.03); // lavadora
      m.cil("vidroFosco", 6.08, 0.5, z1 - 0.61, 0.18, 0.01, "movel", [Math.PI / 2, 0, 0]);
    });
    m.cx("louca", 6.61, 7.28, 0.62, 0.86, z1 - 0.55, z1); // tanque
    m.cx("metalBranco", 6.64, 7.25, 0, 0.62, z1 - 0.5, z1 - 0.02);
    m.cil("cromo", 6.95, 0.86, z1 - 0.06, 0.012, 0.3);
    m.obst(3.28, 7.33, z1 - 0.62, z1 + e);
    for (const x of [3.9, 5.0, 6.6]) m.spot(x, 9.45);
    m.luz(4.8, 2.2, 9.4, 0.8, 4.5);
  }

  // ═══ VARANDA GOURMET: bancada com churrasqueira e cuba, mesa de madeira com quatro cadeiras, banco e vaso ═══
  {
    const z1 = 10.15 - e;
    m.cx("laqueado", 0.05, 2.15, 0.1, 0.86, z1 - 0.58, z1);
    m.cx("pedraBranca", 0.03, 2.17, 0.86, 0.9, z1 - 0.6, z1);
    m.cx("pretoFosco", 0.15, 0.75, 0.86, 1.02, z1 - 0.52, z1 - 0.06); // churrasqueira (grelha na planta)
    for (let i = 0; i < 7; i++) m.cx("inox", 0.19 + i * 0.075, 0.2 + i * 0.075, 1.02, 1.03, z1 - 0.5, z1 - 0.08);
    m.cx("inox", 1.25, 1.65, 0.88, 0.905, z1 - 0.48, z1 - 0.12); // cuba
    m.cil("cromo", 1.45, 0.9, z1 - 0.06, 0.012, 0.3);
    m.cx("parede", 2.18, 2.4, 0, H, 9.49, 10.15, "parede"); // shaft no canto (X na planta)
    m.obst(0, 2.4, z1 - 0.6, 10.15);
    m.cx("madeiraNatural", 0.69, 1.58, 0.72, 0.76, 7.05, 8.53);
    for (const [x, z] of [[0.75, 7.11], [1.52, 7.11], [0.75, 8.47], [1.52, 8.47]] as const) m.cx("madeiraNatural", x - 0.03, x + 0.03, 0, 0.72, z - 0.03, z + 0.03);
    m.obst(0.69, 1.58, 7.05, 8.53);
    for (const z of [7.38, 8.17]) {
      m.cadeira(0.48, z, Math.PI / 2, "palhinha");
      m.cadeira(1.79, z, -Math.PI / 2, "palhinha");
    }
    m.cx("madeiraNatural", 0.72, 2.24, 0, 0.45, 5.6 + e + 0.18, 6.29); // banco ripado junto à parede
    m.obst(0.69, 2.25, 5.6, 6.29);
    m.troca(
      () => {
        m.cil("louca", 0.33, 0, 6.04, 0.2, 0.5);
        m.esf("planta", 0.33, 0.9, 6.04, 0.36);
      },
      { id: "planta-grande", pos: [0.36, 0, 6.08], rotY: 0.6, escala: [1.2, 1.2, 1.2] },
    );
    m.obst(0.05, 0.6, 5.7, 6.4);
    for (const z of [7.0, 8.6]) m.spot(1.2, z);
    m.luz(1.2, 2.2, 7.8, 0.8, 4.5);
  }

  // ═══ DORM. 1: armário na parede de cima, cama de solteiro, criado-mudo, tapete redondo e escrivaninha ═══
  m.cx("laqueado", 0.83, 3.22, 0, 2.3, 3.04 + e, 3.7);
  m.obst(0.78, 3.22, 3.04, 3.72);
  m.cil("tapete", 1.94, 0, 4.47, 0.67, 0.012);
  m.cama(0.98, 2.73, 4.65, 5.5, "x0", "tecidoCinza", "madeiraClara");
  m.troca(
    () => {
      m.cil("madeiraClara", 1.12, 0, 4.4, 0.18, 0.5);
      m.cil("tecidoBranco", 1.12, 0.5, 4.4, 0.08, 0.22);
    },
    { id: "mesa-lateral", pos: [1.12, 0, 4.4], rotY: Math.PI / 2, escala: [0.66, 0.9, 0.78] },
    { id: "luminaria", pos: [1.12, 0.493, 4.4], escala: [0.8, 0.8, 0.8] },
  );
  m.obst(0.9, 1.34, 4.18, 4.62);
  m.cx("madeiraClara", 2.85, 3.98, 0.72, 0.76, 5.0, 5.55);
  for (const x of [2.9, 3.93]) m.cx("madeiraClara", x - 0.02, x + 0.02, 0, 0.72, 5.02, 5.53);
  m.obst(2.85, 3.98, 5.0, 5.6);
  m.cadeira(3.42, 4.72, 0, "tecidoCinza");
  m.spot(2.4, 4.3);
  m.luz(2.4, 2.2, 4.3, 0.7, 4);

  // ═══ DORM. 2: cama encostada nas paredes de cima e da esquerda, criado-mudo com vaso, tapete e armário embaixo ═══
  m.cx("tapete", 1.52, 3.03, 0.004, 0.016, 0.46, 2.04);
  m.cama(0.98, 2.79, 0.08, 1.18, "x0", "tecidoCinza", "madeiraClara");
  m.troca(
    () => {
      m.cil("madeiraClara", 1.15, 0, 1.42, 0.18, 0.5);
      m.cil("louca", 1.15, 0.5, 1.42, 0.06, 0.12);
      m.esf("planta", 1.15, 0.72, 1.42, 0.12);
    },
    { id: "mesa-lateral", pos: [1.15, 0, 1.42], rotY: Math.PI / 2, escala: [0.66, 0.9, 0.78] },
    { id: "planta-pequena", pos: [1.15, 0.493, 1.42], escala: [1.2, 1.2, 1.2] },
  );
  m.obst(0.93, 1.37, 1.2, 1.64);
  m.cx("laqueado", 0.91, 2.43, 0, 2.3, 2.4, 3.04 - e);
  m.obst(0.88, 2.45, 2.38, 3.04);
  m.spot(2.0, 1.5);
  m.luz(2.0, 2.2, 1.5, 0.7, 4);

  // ═══ BANHO: box no canto de cima (vidro em x = 4,27), bacia na parede de cima, bancada na parede da esquerda ═══
  m.box(3.38, 4.27, 0.05, 0.9, "x", 4.27);
  m.bacia(4.67, 0.32, 0);
  m.bancadaBanho(3.38, 3.86, 1.01, 1.83, "x0");

  // ═══ BANHO MASTER: box em cima (vidro em z = 0,85), bacia e bancada na parede da esquerda ═══
  m.box(5.46, 6.49, 0.05, 0.85, "z", 0.85);
  m.bacia(5.4, 1.25, Math.PI / 2);
  m.bancadaBanho(5.165, 5.62, 1.7, 2.62, "x0");

  // ═══ SUÍTE MASTER: closet aberto na parede da direita, cama queen com cabeceira embaixo, escrivaninha no recanto ═══
  m.cx("parede", 6.54, 7.12, 0, H, 2.71, 2.83, "parede"); // trecho de parede que separa o recanto (planta)
  m.obst(6.54, 7.12, 2.71, 2.83);
  m.cx("laqueado", 7.95, 8.63 - e, 0, 2.4, 0.79 + e, 5.44);
  m.cx("madeiraNatural", 7.97, 8.0, 0.1, 2.3, 0.9, 5.35); // frente aberta com cabideiro
  m.cil("metalBranco", 8.3, 1.85, 0.85, 0.012, 4.55, "movel", [Math.PI / 2, 0, 0]);
  m.obst(7.92, 8.63, 0.79, 5.6);
  m.cx("tapete", 5.28, 7.89, 0.004, 0.016, 3.19, 5.25);
  m.cama(5.74, 7.28, 3.45, 5.44, "z1", "tecidoCinza", "madeiraClara");
  m.troca(
    () => {
      m.cil("madeiraClara", 5.48, 0, 5.2, 0.2, 0.5);
      m.cil("tecidoBranco", 5.48, 0.5, 5.2, 0.09, 0.24);
    },
    { id: "mesa-lateral", pos: [5.48, 0, 5.2], escala: [0.7, 0.92, 0.84] },
    { id: "luminaria", pos: [5.48, 0.504, 5.2], escala: [0.85, 0.85, 0.85] },
  );
  m.obst(5.26, 5.7, 4.98, 5.42);
  m.cx("madeiraNatural", 6.67, 7.1, 0.72, 0.76, 0.83, 1.86);
  for (const z of [0.88, 1.81]) m.cx("madeiraNatural", 6.69, 7.08, 0, 0.72, z - 0.02, z + 0.02);
  m.troca(
    () => {
      m.cil("louca", 6.82, 0.76, 1.62, 0.06, 0.12);
      m.esf("planta", 6.82, 0.98, 1.62, 0.12);
    },
    { id: "vaso-b", pos: [6.84, 0.76, 1.62] },
  );
  m.obst(6.63, 7.12, 0.79, 1.9);
  m.cadeira(7.3, 1.33, -Math.PI / 2, "tecidoBranco");
  m.spot(6.5, 4.3);
  m.spot(7.4, 1.8);
  m.luz(6.5, 2.2, 4.3, 0.8, 4.5);
  m.luz(7.3, 2.2, 1.8, 0.5, 3);
}

/** Mobília do apartamento de 77 m² (final 03, 2 suítes), pelo desenho da planta oficial ilustrada (82,4 px/m). */
function mobiliaFinal03(m: M): void {
  const e = 0.05;
  const H = PE_LIVRE;
  // ═══ LIVING: mesa de jantar junto à parede de cima, sofá de couro, tapete, mesa de centro e painel com TV ═══
  m.cx("madeiraNatural", 8.58, 9.55, 0.72, 0.76, e + 0.02, 1.41);
  for (const [x, z] of [[8.62, 0.12], [9.51, 0.12], [8.62, 1.37], [9.51, 1.37]] as const) m.cx("madeiraNatural", x - 0.03, x + 0.03, 0, 0.72, z - 0.03, z + 0.03);
  m.cil("louca", 9.06, 0.76, 0.75, 0.07, 0.12);
  m.esf("planta", 9.06, 0.98, 0.75, 0.12);
  m.obst(8.58, 9.55, 0, 1.41);
  for (const z of [0.4, 1.05]) {
    m.cadeira(8.3, z, Math.PI / 2, "tecidoVerde");
    m.cadeira(9.85, z, -Math.PI / 2, "tecidoVerde");
  }
  m.cx("tapete", 7.49, 9.49, 0.004, 0.016, 1.95, 4.26);
  m.ar("caramelo", 7.15, 8.0, 0.06, 0.44, 2.08, 4.14, 0.14); // sofá de couro, encosto à esquerda
  m.ar("caramelo", 7.15, 7.42, 0.3, 0.84, 2.08, 4.14, 0.12);
  for (const z of [2.12, 3.13]) m.ar("caramelo", 7.4, 7.98, 0.4, 0.58, z, z + 0.98, 0.12);
  m.obst(7.1, 8.0, 2.05, 4.17);
  m.cil("madeiraClara", 8.88, 0, 3.05, 0.3, 0.38);
  m.esf("planta", 8.88, 0.6, 3.05, 0.13);
  m.cil("madeiraNatural", 8.55, 0, 3.45, 0.16, 0.48);
  m.obst(8.5, 9.2, 2.72, 3.65);
  m.cx("madeiraNatural", 9.61, 9.98, 0, 2.3, 2.17, 4.26); // painel ripado com a TV (traço preto na planta)
  m.cx("tv", 9.59, 9.61, 1.0, 1.7, 2.6, 3.8, "alto");
  m.obst(9.6, 10.0, 2.17, 4.26);
  // cozinha na parede da direita: geladeira, bancada com cuba e cooktop; tanque e lavadora na área de serviço
  {
    const x1 = 11.55 - e;
    m.eletro("geladeira", x1 - 0.66, x1, 1.26, 1.94, "x0", () => m.cx("pretoFosco", x1 - 0.66, x1, 0, 1.85, 1.3, 1.92));
    m.obst(x1 - 0.7, 11.55, 1.28, 1.95);
    m.cx("laqueado", x1 - 0.6, x1, 0.1, 0.86, 1.95, 4.3);
    m.cx("pedraBranca", x1 - 0.62, x1, 0.86, 0.9, 1.95, 4.3);
    m.cx("pedraBranca", x1 - 0.02, x1, 0.9, 1.5, 1.95, 4.3, "alto");
    m.cx("inox", x1 - 0.5, x1 - 0.12, 0.88, 0.905, 2.55, 3.05); // cuba
    m.cil("cromo", x1 - 0.06, 0.9, 2.8, 0.012, 0.32);
    m.cx("pretoFosco", x1 - 0.54, x1 - 0.06, 0.9, 0.912, 3.45, 4.0); // cooktop
    m.obst(x1 - 0.62, 11.55, 1.95, 4.3);
    m.cx("parede", 11.32, 11.55, 0, H, 4.31, 5.17, "parede"); // shaft da área de serviço (X na planta)
    m.cx("louca", 10.9, 11.3, 0.62, 0.86, 4.45, 5.05); // tanque
    m.cx("metalBranco", 10.93, 11.27, 0, 0.62, 4.48, 5.02);
    m.eletro("lavadora", 10.9, 11.5, 5.32, 5.92, "x0", () => m.ar("eletro", 10.9, 11.5, 0, 0.85, 5.3, 5.95, 0.03)); // lavadora
    m.obst(10.85, 11.55, 4.31, 6.14);
  }
  for (const [x, z] of [[9.06, 0.75], [8.6, 3.1], [10.8, 2.9], [10.6, 5.0]] as const) m.spot(x, z);
  m.luz(9.0, 2.2, 0.9, 0.8, 4.5);
  m.luz(8.6, 2.2, 3.1, 0.9, 5);
  m.luz(10.8, 2.2, 3.0, 0.6, 3.5);
  // portas de vidro de correr entre o living e a varanda (z = 4,38)
  {
    const z = 4.38;
    const folha = (x0: number, x1: number, dz: number) => {
      m.cx("vidro", x0, x1, 0.02, 2.36, z + dz - 0.006, z + dz + 0.006, "parede");
      m.cx("bronze", x0, x1, 2.34, 2.4, z + dz - 0.02, z + dz + 0.02, "alto");
      m.cx("bronze", x0, x1, 0, 0.03, z + dz - 0.02, z + dz + 0.02, "parede");
      for (const xx of [x0, x1]) m.cx("bronze", xx - 0.02, xx + 0.02, 0, 2.4, z + dz - 0.02, z + dz + 0.02, "parede");
    };
    folha(7.05, 8.0, -0.03);
    folha(7.85, 8.8, 0.03);
    folha(8.9, 9.83, -0.03);
  }

  // ═══ VARANDA GOURMET: bancada de madeira com três banquetas, bancada com cuba e churrasqueira ═══
  m.cx("parede", 7.01, 7.3, 0, H, 5.0, 6.14, "parede"); // shaft no canto (X na planta)
  m.cx("madeiraNatural", 7.3, 7.79, 0, 1.0, 4.5, 6.02);
  m.obst(7.0, 7.8, 4.5, 6.14);
  for (const z of [4.87, 5.24, 5.6]) m.banqueta(8.0, z, 0.72);
  m.cx("laqueado", 9.19, 9.82, 0.1, 0.86, 4.5, 6.02);
  m.cx("pedraBranca", 9.17, 9.84, 0.86, 0.9, 4.48, 6.04);
  m.cx("inox", 9.3, 9.7, 0.88, 0.905, 4.7, 5.1);
  m.cx("pretoFosco", 9.25, 9.78, 0.86, 1.02, 5.35, 5.9); // churrasqueira
  for (let i = 0; i < 6; i++) m.cx("inox", 9.27, 9.76, 1.02, 1.03, 5.38 + i * 0.09, 5.39 + i * 0.09);
  m.obst(9.15, 9.87, 4.48, 6.14);
  m.spot(8.5, 5.2);
  m.luz(8.5, 2.2, 5.2, 0.8, 4);

  // ═══ SUÍTE MASTER: closet em L, cama queen com cabeceira na parede da esquerda, criados-mudos e tapete ═══
  m.cx("laqueado", e, 0.63, 0, 2.3, e, 2.5);
  m.cx("laqueado", 0.63, 1.9, 0, 2.3, e, 0.56);
  m.obst(0, 0.65, 0, 2.52);
  m.obst(0.6, 1.92, 0, 0.58);
  m.cx("tapete", 0.63, 2.45, 0.004, 0.016, 2.62, 5.11);
  m.cama(0.2, 2.1, 3.11, 4.71, "x0", "tecidoCinza", "madeiraClara");
  for (const z of [2.8, 5.0]) {
    m.cx("madeiraNatural", e + 0.02, 0.42, 0, 0.5, z - 0.18, z + 0.18);
    m.cil("tecidoBranco", 0.24, 0.5, z, 0.08, 0.22);
    m.obst(0, 0.45, z - 0.2, z + 0.2);
  }
  m.spot(1.4, 3.9);
  m.spot(3.4, 0.5);
  m.luz(1.4, 2.2, 3.9, 0.8, 4.5);

  // ═══ BANHO MASTER: bancada e bacia na parede da direita, box embaixo (vidro em z = 5,25) ═══
  m.bancadaBanho(3.75, 4.2, 3.68, 4.2, "x1");
  m.bacia(4.0, 4.82, -Math.PI / 2);
  m.box(2.79, 3.81, 5.27, 6.09, "z", 5.25);
  // ═══ BANHO 1: bancada na parede de cima, bacia na da esquerda, box embaixo ao lado do shaft ═══
  m.bancadaBanho(2.82, 3.6, 1.09, 1.55, "z0");
  m.bacia(3.08, 2.2, Math.PI / 2);
  m.cx("parede", 2.79, 3.24, 0, H, 2.74, 3.55, "parede"); // shaft (X na planta)
  m.obst(2.74, 3.26, 2.72, 3.6);
  m.box(3.26, 4.2, 2.62, 3.55, "z", 2.62);
  // ═══ LAVABO: bacia na parede de baixo, cuba no canto ═══
  m.bacia(5.79, 2.12, Math.PI);
  m.bancadaBanho(6.42, 6.96, 1.95, 2.46, "z1");

  // ═══ SUÍTE 1: armário na parede de cima, duas camas de solteiro, criado-mudo entre elas, tapete redondo ═══
  m.cx("laqueado", 5.37 + e, 6.96, 0, 2.3, 2.56, 3.18);
  m.obst(5.37, 7.01, 2.51, 3.2);
  m.cil("tapete", 5.67, 0, 4.32, 0.97, 0.012);
  m.cama(4.39, 5.18, 4.14, 5.84, "z1", "tecidoCinza", "madeiraClara");
  m.cama(6.03, 6.88, 4.14, 5.84, "z1", "tecidoCinza", "madeiraClara");
  m.cx("madeiraNatural", 5.3, 5.92, 0, 0.5, 5.7, 6.04);
  m.cil("louca", 5.6, 0.5, 5.86, 0.07, 0.12);
  m.obst(5.25, 5.95, 5.66, 6.14);
  m.spot(5.6, 4.6);
  m.spot(4.8, 1.6);
  m.luz(5.6, 2.2, 4.6, 0.8, 4.5);
}

/** Mobília do apartamento de 76 m² (final 06, 2 suítes), pelo desenho da planta oficial ilustrada (82,4 px/m). */
function mobiliaFinal06(m: M): void {
  const e = 0.05;
  const H = PE_LIVRE;
  // ═══ COZINHA E SERVIÇO na parede da esquerda: lavadora, tanque, shaft, cooktop, cuba e geladeira ═══
  m.eletro("lavadora", e, 0.66, e + 0.04, 0.64, "x1", () => m.ar("eletro", e, 0.68, 0, 0.85, e + 0.02, 0.66, 0.03));
  m.cx("louca", e, 0.48, 0.62, 0.86, 1.05, 1.52);
  m.cx("metalBranco", e + 0.02, 0.46, 0, 0.62, 1.08, 1.5);
  m.obst(0, 0.7, 0, 1.55);
  m.cx("parede", 0, 0.23, 0, H, 0.87, 1.77, "parede"); // shaft (X na planta)
  m.cx("laqueado", e, 0.65, 0.1, 0.86, 1.8, 4.08);
  m.cx("pedraBranca", e, 0.67, 0.86, 0.9, 1.8, 4.08);
  m.cx("pedraBranca", e, e + 0.02, 0.9, 1.5, 1.8, 4.08, "alto");
  m.cx("pretoFosco", e + 0.06, 0.6, 0.9, 0.912, 2.16, 2.72); // cooktop
  m.cx("inox", e + 0.12, 0.5, 0.88, 0.905, 3.05, 3.53); // cuba
  m.cil("cromo", e + 0.06, 0.9, 3.29, 0.012, 0.32);
  m.eletro("geladeira", e, 0.68, 4.12, 4.8, "x1", () => m.cx("pretoFosco", e, 0.68, 0, 1.85, 4.12, 4.8)); // geladeira
  m.obst(0, 0.7, 1.8, 4.82);
  // ═══ LIVING: painel com TV e mesa de mármore com quatro cadeiras; sofá encostado na suíte 1, tapete e mesa de centro ═══
  m.cx("madeiraNatural", 1.6, 1.97, 0, 2.2, 2.38, 3.65);
  m.cx("tv", 1.97, 1.99, 1.0, 1.65, 2.55, 3.5, "alto");
  m.obst(1.58, 2.0, 2.38, 3.65);
  m.cx("pedraBranca", 1.6, 2.51, 0.74, 0.78, 3.65, 4.99);
  m.cx("pedraBranca", 1.95, 2.15, 0, 0.74, 3.9, 4.75);
  m.esf("planta", 2.05, 0.92, 4.3, 0.12);
  m.obst(1.58, 2.53, 3.63, 5.0);
  for (const z of [3.96, 4.6]) {
    m.cadeira(1.36, z, Math.PI / 2, "madeiraNatural");
    m.cadeira(2.76, z, -Math.PI / 2, "madeiraNatural");
  }
  m.cx("tapete", 2.21, 4.21, 0.004, 0.016, 1.89, 5.0);
  m.ar("tecidoCinza", 3.54, 4.54 - e, 0.06, 0.44, 1.95, 4.32, 0.14);
  m.ar("tecidoCinza", 4.2, 4.54 - e, 0.3, 0.84, 1.95, 4.32, 0.12);
  for (const z of [1.98, 3.17]) m.ar("tecidoCinza", 3.57, 4.22, 0.4, 0.58, z, z + 1.12, 0.12);
  m.obst(3.5, 4.54, 1.93, 4.34);
  m.cil("madeiraClara", 2.88, 0, 2.68, 0.35, 0.36);
  m.esf("planta", 2.88, 0.58, 2.68, 0.12);
  m.obst(2.5, 3.26, 2.3, 3.06);
  for (const [x, z] of [[0.6, 3.0], [2.1, 4.3], [3.2, 3.0], [1.5, 5.5]] as const) m.spot(x, z);
  m.luz(2.1, 2.2, 4.3, 0.9, 5);
  m.luz(3.2, 2.2, 3.0, 0.8, 4.5);
  m.luz(0.8, 2.2, 1.0, 0.5, 3);
  // portas de vidro de correr entre o living e a varanda (z = 1,77)
  {
    const z = 1.77;
    const folha = (x0: number, x1: number, dz: number) => {
      m.cx("vidro", x0, x1, 0.02, 2.36, z + dz - 0.006, z + dz + 0.006, "parede");
      m.cx("bronze", x0, x1, 2.34, 2.4, z + dz - 0.02, z + dz + 0.02, "alto");
      m.cx("bronze", x0, x1, 0, 0.03, z + dz - 0.02, z + dz + 0.02, "parede");
      for (const xx of [x0, x1]) m.cx("bronze", xx - 0.02, xx + 0.02, 0, 2.4, z + dz - 0.02, z + dz + 0.02, "parede");
    };
    folha(1.73, 2.7, 0.03);
    folha(2.55, 3.5, -0.03);
    folha(3.55, 4.5, 0.03);
  }

  // ═══ VARANDA GOURMET: bancada com churrasqueira e cuba na parede da esquerda, mesa de madeira e cadeiras ═══
  m.cx("laqueado", 1.69 + e, 2.37, 0.1, 0.86, 0.07, 1.41);
  m.cx("pedraBranca", 1.69 + e, 2.39, 0.86, 0.9, 0.05, 1.43);
  m.cx("pretoFosco", 1.8, 2.32, 0.86, 1.02, 0.15, 0.62);
  for (let i = 0; i < 6; i++) m.cx("inox", 1.82, 2.3, 1.02, 1.03, 0.18 + i * 0.08, 0.19 + i * 0.08);
  m.cx("inox", 1.86, 2.26, 0.88, 0.905, 0.84, 1.24);
  m.obst(1.69, 2.4, 0, 1.45);
  m.cx("madeiraNatural", 3.91, 4.45, 0.72, 0.76, 0.32, 1.59);
  for (const [x, z] of [[3.95, 0.36], [4.41, 0.36], [3.95, 1.55], [4.41, 1.55]] as const) m.cx("madeiraNatural", x - 0.03, x + 0.03, 0, 0.72, z - 0.03, z + 0.03);
  m.obst(3.9, 4.54, 0.3, 1.6);
  for (const z of [0.55, 0.95, 1.35]) m.cadeira(3.66, z, Math.PI / 2, "tecidoVerde");
  m.spot(3.0, 0.9);
  m.luz(3.0, 2.2, 0.9, 0.8, 4);

  // ═══ SUÍTE 1: cama de solteiro com cabeceira na parede da esquerda, criado-mudo, mesinha, tapete e armário ═══
  m.cx("tapete", 5.24, 6.88, 0.004, 0.016, 0.13, 2.26);
  m.cama(4.72, 6.52, 0.68, 1.53, "x0", "tecidoCinza", "madeiraClara");
  m.cx("madeiraNatural", 4.62, 5.05, 0, 0.55, e, 0.45);
  m.cil("louca", 4.84, 0.55, 0.25, 0.06, 0.14);
  m.obst(4.58, 5.08, 0, 0.48);
  m.cil("madeiraClara", 4.84, 0, 1.83, 0.2, 0.5);
  m.esf("planta", 4.84, 0.68, 1.83, 0.12);
  m.obst(4.6, 5.08, 1.6, 2.06);
  m.cx("laqueado", 4.54 + e, 6.26, 0, 2.3, 2.85, 3.57 - e);
  m.obst(4.54, 6.28, 2.8, 3.6);
  m.spot(5.9, 1.2);
  m.spot(6.7, 4.3);
  m.luz(5.9, 2.2, 1.4, 0.8, 4.5);
  // ═══ LAVABO: cuba e bacia na parede de cima ═══
  m.bancadaBanho(4.62, 5.3, 3.62, 4.1, "z0");
  m.bacia(5.73, 3.9, 0);
  // ═══ BANHO MASTER: box em cima (vidro em z = 0,9) e bancada na parede da esquerda (o que a planta mostra) ═══
  m.box(7.8, 8.77, 0.05, 0.9, "z", 0.9);
  m.bancadaBanho(7.35, 7.92, 1.6, 2.25, "x0");
  // ═══ BANHO 1: box em cima ao lado do shaft, bancada na parede da direita ═══
  m.cx("parede", 8.37, 8.82, 0, H, 2.5, 3.42, "parede");
  m.obst(8.35, 8.82, 2.48, 3.44);
  m.box(7.35, 8.33, 2.53, 3.41, "z", 3.41);
  m.bancadaBanho(8.27, 8.77, 4.1, 4.8, "x1");

  // ═══ SUÍTE MASTER: cama queen com cabeceira na parede da direita, criados-mudos, tapete e closet em L ═══
  m.cx("tapete", 9.13, 11.19, 0.004, 0.016, 0.92, 3.53);
  m.cama(9.49, 11.4, 1.29, 3.05, "x1", "tecidoCinza", "madeiraClara");
  for (const z of [1.0, 3.3]) {
    m.cx("madeiraNatural", 11.08, 11.5, 0, 0.5, z - 0.2, z + 0.2);
    m.obst(11.05, 11.55, z - 0.22, z + 0.22);
  }
  m.esf("planta", 11.29, 0.68, 1.0, 0.12);
  m.cil("tecidoBranco", 11.29, 0.5, 3.3, 0.08, 0.22);
  m.cx("laqueado", 10.89, 11.55 - e, 0, 2.3, 3.59, 6.08 - e);
  m.cx("laqueado", 9.67, 10.89, 0, 2.3, 5.53, 6.08 - e);
  m.obst(10.87, 11.55, 3.55, 6.08);
  m.obst(9.65, 10.9, 5.5, 6.08);
  m.spot(10.2, 2.2);
  m.spot(8.1, 5.6);
  m.luz(10.2, 2.2, 2.4, 0.8, 4.5);
}

/** Espelha a mobília no eixo x (plantas espelhadas, como o final 04 em relação ao 02). */
function espelhar(m: Mobilia, soma: number): Mobilia {
  const mx = (x: number) => soma - x;
  return {
    prims: m.prims.map((p) => ({ ...p, pos: [mx(p.pos[0]), p.pos[1], p.pos[2]], rot: p.rot ? [p.rot[0], -p.rot[1], -p.rot[2]] : undefined })),
    obstaculos: m.obstaculos.map((o) => ({ x0: mx(o.x1), x1: mx(o.x0), z0: o.z0, z1: o.z1 })),
    jardins: [],
    luzes: m.luzes.map((l) => ({ ...l, pos: [mx(l.pos[0]), l.pos[1], l.pos[2]] })),
    // modelos espelhados: escala x negativa (o sofá em L troca a chaise de lado, como a planta espelhada)
    modelos: m.modelos?.map((o) => ({ ...o, pos: [mx(o.pos[0]), o.pos[1], o.pos[2]], rotY: -(o.rotY ?? 0), escala: [-(o.escala?.[0] ?? 1), o.escala?.[1] ?? 1, o.escala?.[2] ?? 1] })),
  };
}

/**
 * Mobília do apartamento de 102 m² (3 suítes) do Liwo, posicionada pela planta oficial do final 02.
 * Living, cozinha e suíte master seguem os três renders oficiais de interiores (materiais e peças);
 * varanda, banhos e suítes 1 e 2 seguem só a planta ilustrada (sem render oficial: peças neutras).
 */
export function mobiliar(t: TipoPlanta, glb = false): Mobilia {
  if (t.espelhoDe) {
    const base = tipoPorId(t.espelhoDe);
    if (base) {
      const l = t.comodos.flatMap((c) => c.poligono.map((p) => p[0]));
      const lb = base.comodos.flatMap((c) => c.poligono.map((p) => p[0]));
      return espelhar(mobiliar(base, glb), Math.min(...lb) + Math.max(...lb) + (Math.min(...l) - Math.min(...lb)));
    }
  }
  const m = new M();
  const H = PE_LIVRE;
  const de = (id: string): Ret => {
    const c = t.comodos.find((x) => x.id === id);
    if (!c) throw new Error(`A planta "${t.id}" precisa do cômodo "${id}".`);
    return limites(c.poligono);
  };
  if (t.id === "final-01") {
    m.gl = glb;
    mobiliaFinal01(m);
    return { prims: m.prims, obstaculos: m.obstaculos, jardins: [], luzes: m.luzes, modelos: m.modelos };
  }
  if (t.id === "final-06") {
    m.gl = glb;
    mobiliaFinal06(m);
    return { prims: m.prims, obstaculos: m.obstaculos, jardins: [], luzes: m.luzes, modelos: m.modelos };
  }
  if (t.id === "final-03") {
    m.gl = glb;
    mobiliaFinal03(m);
    return { prims: m.prims, obstaculos: m.obstaculos, jardins: [], luzes: m.luzes, modelos: m.modelos };
  }
  // plantas sem interior modelado (só a vista do andar): nada a mobiliar
  if (t.id !== "final-02") return { prims: [], obstaculos: [], jardins: [], luzes: [] };
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
