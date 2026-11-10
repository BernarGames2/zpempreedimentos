"use client";

import { diaAtual } from "@/lib/ambiente";
import { emp } from "@/lib/dados";
import { geoUnidade } from "@/lib/procedural/predio";
import { cardeal, posicaoSol, resumoSol, rumoDaNormal, solNaFachada } from "@/lib/sol";
import { useExp, useUnidadeSel } from "@/lib/store";
import { IcoLua, IcoSol } from "./Icones";

function horaTexto(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm ? String(mm).padStart(2, "0") : ""}`;
}

/** Estudo de sol: controle de 6h às 18h, botão Noite e frase automática. */
export function ControleSol({ compacto = false }: { compacto?: boolean }) {
  const hora = useExp((s) => s.hora);
  const noite = useExp((s) => s.noite);
  const set = useExp((s) => s.set);
  const u = useUnidadeSel();

  let frase = "Mova o controle para ver o sol em cada horário";
  if (u) {
    const g = geoUnidade(u, emp);
    const rumo = rumoDaNormal(g.normal[0], g.normal[2], emp.orientacaoNorteGraus);
    const resumo = resumoSol(rumo, emp.latitude, emp.longitude, diaAtual());
    const agora = solNaFachada(posicaoSol(hora, emp.latitude, emp.longitude, diaAtual()), rumo);
    frase = noite ? `${resumo} · face ${cardeal(rumo)}` : `${resumo} · às ${horaTexto(hora)}: ${agora ? "sol direto" : "sombra"}`;
  } else if (noite) frase = "Noite: iluminação artificial acesa, como nos renders";

  return (
    <div className={compacto ? "" : "rounded-2xl border border-white/10 bg-white/[0.04] p-3"} data-testid="controle-sol">
      <div className="flex items-center gap-3">
        <IcoSol className="shrink-0 text-ambar" />
        <label className="sr-only" htmlFor="hora-sol">Hora do dia</label>
        <input
          id="hora-sol"
          type="range"
          min={6}
          max={18}
          step={0.5}
          value={hora}
          onChange={(e) => set({ hora: Number(e.target.value), noite: false })}
          aria-valuetext={horaTexto(hora)}
          className={noite ? "opacity-50" : ""}
        />
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-texto">{noite ? "—" : horaTexto(hora)}</span>
        <button type="button" onClick={() => set({ noite: !noite })} aria-pressed={noite} className={`btn btn-linha !min-h-11 !px-3 ${noite ? "btn-ativo" : ""}`}>
          <IcoLua width={16} height={16} />
          Noite
        </button>
      </div>
      <p className="mt-1 text-xs text-cinza" data-testid="frase-sol">{frase}</p>
    </div>
  );
}
