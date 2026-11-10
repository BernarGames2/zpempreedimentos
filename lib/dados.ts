import bruto from "@/data/empreendimento.json";
import type { Comodo, Empreendimento, Lazer, TipoPlanta, Unidade } from "./types";
import { validarEmpreendimento } from "./validate";

/** Dados do empreendimento, validados uma única vez na inicialização. */
export const emp: Empreendimento = validarEmpreendimento(bruto);

const porNumero = new Map(emp.unidades.map((u) => [u.numero, u]));
const porTipo = new Map(emp.tipos.map((t) => [t.id, t]));

export function unidade(numero: string | null | undefined): Unidade | undefined {
  return numero ? porNumero.get(numero) : undefined;
}

export function tipoDe(u: Unidade): TipoPlanta {
  const t = porTipo.get(u.tipo);
  if (!t) throw new Error(`Tipo de planta "${u.tipo}" não existe.`);
  return t;
}

export function comodoDe(t: TipoPlanta, id: string | null | undefined): Comodo | undefined {
  return t.comodos.find((c) => c.id === id);
}

export function lazeres(): (Lazer & { local: "terreo" | "cobertura" })[] {
  return [
    ...emp.terreo.map((l) => ({ ...l, local: "terreo" as const })),
    ...emp.cobertura.map((l) => ({ ...l, local: "cobertura" as const })),
  ];
}

/** Vizinha em uma direção do pavimento (cima, baixo, lados), ou undefined na borda. */
export function vizinha(u: Unidade, dir: "cima" | "baixo" | "esquerda" | "direita"): Unidade | undefined {
  if (dir === "cima" || dir === "baixo") {
    const andar = u.andar + (dir === "cima" ? 1 : -1);
    return emp.unidades.find((x) => x.andar === andar && x.posicao === u.posicao);
  }
  const porAndar = emp.unidades.filter((x) => x.andar === u.andar).sort((a, b) => a.posicao - b.posicao);
  const i = porAndar.findIndex((x) => x.numero === u.numero);
  const n = porAndar.length;
  // Visto de fora, a posição seguinte fica à direita (o prédio é percorrido no sentido anti-horário).
  return porAndar[(i + (dir === "direita" ? 1 : -1) + n) % n];
}
