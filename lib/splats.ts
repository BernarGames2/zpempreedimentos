import type { Comodo, Manifesto, TipoPlanta } from "./types";

const EXT = [".spz", ".ply", ".splat", ".ksplat", ".sog"];

export interface SplatResolvido {
  url: string;
  colisor: string | null;
  /** Veio de /public/splats/real (captura do apartamento de verdade). */
  real: boolean;
}

function base(caminho: string): string {
  return (caminho.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
}

function achar(m: Manifesto, pasta: string, nome: string): string | undefined {
  return m.splats.find((f) => EXT.some((e) => f.toLowerCase() === `${pasta}/${nome}${e}`.toLowerCase()));
}

/**
 * Escolhe o arquivo de splat de um cômodo, sempre a melhor camada disponível:
 * 1) captura real em /splats/real, 2) mundo gerado a partir dos renders em /splats.
 * Devolve null quando não há arquivo: o site usa então o interior procedural.
 */
export function resolverSplat(c: Comodo, m: Manifesto, leve: boolean): SplatResolvido | null {
  if (!c.splat) return null;
  const nome = base(c.splat.desktop);
  const nomeLeve = base(c.splat.mobile);
  const colisorJson = m.splats.includes(c.splat.collider) ? c.splat.collider : null;
  for (const [pasta, real] of [["/splats/real", true], ["/splats", false]] as const) {
    const cheio = achar(m, pasta, nome);
    const menor = achar(m, pasta, nomeLeve) ?? achar(m, pasta, `${nome}-500k`);
    const url = leve ? (menor ?? cheio) : (cheio ?? menor);
    if (url) {
      const colisor = m.splats.find((f) => f.toLowerCase() === `${pasta}/${nome}-collider.glb`) ?? colisorJson;
      return { url, colisor, real };
    }
  }
  return null;
}

/** Splats disponíveis por cômodo para a planta atual (preenchido pela cena, lido pelo passeio). */
export const splatsDoTipo: { atual: Record<string, SplatResolvido | undefined> } = { atual: {} };

export function resolverTodos(t: TipoPlanta, m: Manifesto, leve: boolean): Record<string, SplatResolvido | undefined> {
  const out: Record<string, SplatResolvido | undefined> = {};
  for (const c of t.comodos) out[c.id] = resolverSplat(c, m, leve) ?? undefined;
  return out;
}
