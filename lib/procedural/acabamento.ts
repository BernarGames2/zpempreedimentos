/**
 * Acabamentos arquitetônicos gerados a partir da planta: guarnições e folhas de porta, esquadrias
 * e peitoris de janela e corrimão do guarda-corpo. Nada aqui muda a planta: só veste os vãos
 * que ela já define. A folha de cada porta interna abre para o lado em que não bate em móvel,
 * parede ou outra porta (as plantas oficiais não trazem o sentido de abertura de forma legível).
 */
import type { TipoPlanta } from "../types";
import type { MatInt, Mobilia, Prim } from "./mobilia";
import { ESPESSURA, comodoEm, type Planta, type Ret } from "./planta";

const cruza = (a: Ret, b: Ret, folga = 0.005) => a.x0 < b.x1 - folga && a.x1 > b.x0 + folga && a.z0 < b.z1 - folga && a.z1 > b.z0 + folga;

export function acabamentos(t: TipoPlanta, planta: Planta, mob: Mobilia): Prim[] {
  const out: Prim[] = [];
  const meia = ESPESSURA / 2;
  const paredes = planta.paredes.filter((b) => b.y0 < 1 && b.y1 > 0.3);
  const folhas: Ret[] = [];

  for (const ab of [...t.portas, ...t.janelas]) {
    const emX = Math.abs(ab.p1[0] - ab.p2[0]) < 1e-4; // vão numa parede de x constante
    const c = emX ? ab.p1[0] : ab.p1[1];
    const a0 = emX ? Math.min(ab.p1[1], ab.p2[1]) : Math.min(ab.p1[0], ab.p2[0]);
    const a1 = emX ? Math.max(ab.p1[1], ab.p2[1]) : Math.max(ab.p1[0], ab.p2[0]);
    /** Caixa em coordenadas do vão: `a` ao longo da parede, `p` perpendicular a ela. */
    const cx = (mat: MatInt, al0: number, al1: number, y0: number, y1: number, p0: number, p1: number, camada: Prim["camada"] = "parede") => {
      const [x0, x1, z0, z1] = emX ? [p0, p1, al0, al1] : [al0, al1, p0, p1];
      out.push({ forma: "caixa", mat, camada, pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], tam: [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)] });
    };
    const ret = (al0: number, al1: number, p0: number, p1: number): Ret =>
      emX ? { x0: Math.min(p0, p1), x1: Math.max(p0, p1), z0: al0, z1: al1 } : { x0: al0, x1: al1, z0: Math.min(p0, p1), z1: Math.max(p0, p1) };

    if (ab.tipo === "porta") {
      const h = ab.altura;
      const g = meia + 0.016; // a guarnição salta 1,6 cm da parede
      cx("porta", a0 - 0.05, a0 + 0.03, 0, h + 0.05, c - g, c + g);
      cx("porta", a1 - 0.03, a1 + 0.05, 0, h + 0.05, c - g, c + g);
      cx("porta", a0 - 0.05, a1 + 0.05, h - 0.03, h + 0.05, c - g, c + g, "alto");
      const esp = 0.035;
      const larg = a1 - a0 - 0.07;
      const fechada = ab.liga?.includes("hall") || ab.liga?.includes("exterior");
      if (fechada) {
        // porta de entrada: folha de madeira fechada (do outro lado fica o hall do andar, que não é modelado)
        cx("madeiraNatural", a0 + 0.035, a1 - 0.035, 0.01, h - 0.03, c - esp / 2, c + esp / 2);
        for (const s of [-1, 1]) {
          cx("cromo", a1 - 0.2, a1 - 0.08, 0.99, 1.012, c + s * (esp / 2 + 0.03), c + s * (esp / 2 + 0.05));
          cx("cromo", a1 - 0.11, a1 - 0.08, 0.985, 1.017, c + s * (esp / 2), c + s * (esp / 2 + 0.05));
          cx("cromo", a1 - 0.115, a1 - 0.075, 0.86, 0.9, c + s * (esp / 2), c + s * (esp / 2 + 0.008));
        }
        continue;
      }
      // porta interna aberta a 90°: escolhe dobradiça e lado que não batem em nada
      let melhor: { nota: number; ha: number; s: number } | null = null;
      for (const ha of [a0 + 0.035, a1 - 0.035 - esp]) {
        for (const s of [1, -1]) {
          const r = ret(ha, ha + esp, c + s * meia, c + s * (meia + larg));
          const meioA = ha + esp / 2;
          const ponta = emX ? comodoEm(t, c + s * (meia + larg - 0.02), meioA) : comodoEm(t, meioA, c + s * (meia + larg - 0.02));
          if (!ponta) continue;
          if (paredes.some((b) => cruza(r, b)) || mob.obstaculos.some((o) => cruza(r, o, 0.01)) || folhas.some((f) => cruza(r, f))) continue;
          // não pode ficar na frente de outro vão
          const tapa = [...t.portas].some((o) => {
            if (o.id === ab.id || o.tipo === "janela") return false;
            const oX = Math.abs(o.p1[0] - o.p2[0]) < 1e-4;
            const zona: Ret = oX
              ? { x0: o.p1[0] - 0.5, x1: o.p1[0] + 0.5, z0: Math.min(o.p1[1], o.p2[1]), z1: Math.max(o.p1[1], o.p2[1]) }
              : { x0: Math.min(o.p1[0], o.p2[0]), x1: Math.max(o.p1[0], o.p2[0]), z0: o.p1[1] - 0.5, z1: o.p1[1] + 0.5 };
            return cruza(r, zona);
          });
          if (tapa) continue;
          const fora = ha < (a0 + a1) / 2 ? -0.18 : 0.18; // folha encostada numa parede é o melhor lugar
          const viz = ret(ha + fora, ha + esp + fora, c + s * (meia + 0.1), c + s * (meia + larg));
          let nota = paredes.some((b) => cruza(viz, b)) || mob.obstaculos.some((o) => cruza(viz, o)) ? 2 : 0;
          if (!/^circ|^living|^sala/.test(ponta.id)) nota += 1; // de preferência abre para dentro do cômodo
          if (!melhor || nota > melhor.nota) melhor = { nota, ha, s };
        }
      }
      if (!melhor) continue; // sem lugar livre: fica só a guarnição
      const { ha, s } = melhor;
      const p0 = c + s * meia;
      const p1 = c + s * (meia + larg);
      folhas.push(ret(ha, ha + esp, p0, p1));
      cx("porta", ha, ha + esp, 0.01, h - 0.03, p0, p1);
      for (const [l0, l1] of [[ha - 0.045, ha], [ha + esp, ha + esp + 0.045]] as const) {
        cx("cromo", l0, l1, 0.985, 1.015, p1 - s * 0.09, p1 - s * 0.06);
        cx("cromo", l0 < ha ? l0 : l1 - 0.015, l0 < ha ? l0 + 0.015 : l1, 0.99, 1.01, p1 - s * 0.2, p1 - s * 0.06);
      }
    } else if (ab.tipo === "janela") {
      const y0 = ab.peitoril;
      const y1 = ab.peitoril + ab.altura;
      const b = 0.04;
      const d = 0.035;
      cx("bronze", a0, a1, y0, y0 + b, c - d, c + d);
      cx("bronze", a0, a1, y1 - b, y1, c - d, c + d, "alto");
      cx("bronze", a0, a0 + b, y0, y1, c - d, c + d);
      cx("bronze", a1 - b, a1, y0, y1, c - d, c + d);
      if (a1 - a0 > 0.9) cx("bronze", (a0 + a1) / 2 - 0.025, (a0 + a1) / 2 + 0.025, y0, y1, c - d - 0.004, c + d + 0.004);
      if (y0 > 0.3) cx("pedraBranca", a0 - 0.03, a1 + 0.03, y0 - 0.025, y0, c - meia - 0.03, c + meia + 0.03);
    } else if (ab.tipo === "guarda-corpo") {
      cx("bronze", a0, a1, 1.08, 1.12, c - 0.035, c + 0.035);
      cx("bronze", a0, a1, 0, 0.05, c - 0.02, c + 0.02);
      for (const a of [a0 + 0.02, a1 - 0.02]) cx("bronze", a - 0.02, a + 0.02, 0, 1.08, c - 0.02, c + 0.02);
    }
  }
  // Revestimento dos banhos (ESTIMADO): placas de 6 mm sobre cada trecho de parede voltado para o banho.
  for (const c of t.comodos) {
    if (!/banho|bmaster|lavabo/.test(c.id)) continue;
    const cxm = c.poligono.reduce((s, p) => s + p[0], 0) / c.poligono.length;
    const czm = c.poligono.reduce((s, p) => s + p[1], 0) / c.poligono.length;
    c.poligono.forEach((p, i) => {
      const q = c.poligono[(i + 1) % c.poligono.length] as [number, number];
      const emX = Math.abs(p[0] - q[0]) < 1e-4;
      const linha = emX ? p[0] : p[1];
      const [e0, e1] = emX ? [Math.min(p[1], q[1]), Math.max(p[1], q[1])] : [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
      // lado de dentro: o do centro do cômodo (para polígonos em L, o ponto logo ao lado da aresta decide)
      const meio = (e0 + e1) / 2;
      const dentro = (s: number) => (emX ? comodoEm(t, linha + s * 0.2, meio) : comodoEm(t, meio, linha + s * 0.2))?.id === c.id;
      const s = dentro(1) ? 1 : dentro(-1) ? -1 : Math.sign((emX ? cxm : czm) - linha) || 1;
      for (const b of paredes) {
        const [bl0, bl1, ba0, ba1] = emX ? [b.x0, b.x1, b.z0, b.z1] : [b.z0, b.z1, b.x0, b.x1];
        if (linha < bl0 - 0.01 || linha > bl1 + 0.01) continue;
        const [a0, a1] = [Math.max(ba0, e0 + meia), Math.min(ba1, e1 - meia)];
        if (a1 - a0 < 0.05) continue;
        const face = s > 0 ? bl1 : bl0;
        const [x0, x1, z0, z1] = emX ? [face, face + s * 0.006, a0, a1] : [a0, a1, face, face + s * 0.006];
        out.push({ forma: "caixa", mat: "azulejo", camada: "parede", pos: [(x0 + x1) / 2, (b.y0 + b.y1) / 2, (z0 + z1) / 2], tam: [Math.abs(x1 - x0), b.y1 - b.y0, Math.abs(z1 - z0)] });
      }
    });
  }
  return out;
}
