"use client";

import { useMemo } from "react";
import { GRUPOS, PRIMEIRO_ANDAR, emp } from "@/lib/dados";
import { reais } from "@/lib/formato";
import { filtroAtivo, passaFiltro, useExp } from "@/lib/store";

/** Limites da faixa de valor para o tipo de negócio escolhido. */
function faixa(negocio: "venda" | "locacao"): [number, number] {
  const vs = emp.unidades.map((u) => (negocio === "venda" ? u.preco : u.aluguel)).filter((v): v is number => v !== null);
  if (vs.length === 0) return [0, 0];
  return [Math.min(...vs), Math.max(...vs)];
}

/** Filtros: tipo, faixa de andar, faixa de preço/aluguel e "só disponíveis", com contador. */
export function Filtros() {
  const f = useExp((s) => s.filtros);
  const setFiltros = useExp((s) => s.setFiltros);
  const limpar = useExp((s) => s.limparFiltros);
  const [min, max] = useMemo(() => faixa(f.negocio), [f.negocio]);
  const passo = f.negocio === "venda" ? 5000 : 50;
  const n = useMemo(() => emp.unidades.filter((u) => passaFiltro(u, f)).length, [f]);
  const andares = Array.from({ length: emp.andares }, (_, i) => i + PRIMEIRO_ANDAR);
  const temValores = max > 0;

  return (
    <div className="space-y-5" data-testid="filtros">
      <fieldset>
        <legend className="rotulo mb-2">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {GRUPOS.map((g) => {
            const t = { id: g, nome: g };
            const on = f.tipos.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltros({ tipos: on ? f.tipos.filter((x) => x !== t.id) : [...f.tipos, t.id] })}
                className={`btn btn-linha ${on ? "btn-ativo" : ""}`}
              >
                {t.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="rotulo mb-2">Andar</legend>
        <div className="flex items-center gap-2 text-sm">
          <label className="sr-only" htmlFor="andar-min">Andar mínimo</label>
          <select id="andar-min" value={f.andarMin} onChange={(e) => setFiltros({ andarMin: Number(e.target.value), andarMax: Math.max(f.andarMax, Number(e.target.value)) })} className="h-11 flex-1 rounded-xl border border-white/15 bg-fundo-2 px-3">
            {andares.map((a) => <option key={a} value={a}>{a}º</option>)}
          </select>
          <span className="text-cinza">até</span>
          <label className="sr-only" htmlFor="andar-max">Andar máximo</label>
          <select id="andar-max" value={f.andarMax} onChange={(e) => setFiltros({ andarMax: Number(e.target.value), andarMin: Math.min(f.andarMin, Number(e.target.value)) })} className="h-11 flex-1 rounded-xl border border-white/15 bg-fundo-2 px-3">
            {andares.map((a) => <option key={a} value={a}>{a}º</option>)}
          </select>
        </div>
      </fieldset>

      {temValores && <fieldset>
        <legend className="rotulo mb-2">{f.negocio === "venda" ? "Preço até" : "Aluguel até"}</legend>
        {emp.modo === "ambos" && (
          <div className="mb-2 flex gap-2" role="group" aria-label="Tipo de negócio">
            {(["venda", "locacao"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={f.negocio === k} onClick={() => setFiltros({ negocio: k, valorMax: null })} className={`btn btn-linha flex-1 ${f.negocio === k ? "btn-ativo" : ""}`}>
                {k === "venda" ? "Comprar" : "Alugar"}
              </button>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="valor-max">{f.negocio === "venda" ? "Preço máximo" : "Aluguel máximo"}</label>
        <input id="valor-max" type="range" min={min} max={max} step={passo} value={f.valorMax ?? max} onChange={(e) => setFiltros({ valorMax: Number(e.target.value) >= max ? null : Number(e.target.value) })} />
        <div className="flex justify-between text-xs text-cinza">
          <span>{reais(min)}</span>
          <span className="text-texto">{f.valorMax === null ? "Sem limite" : reais(f.valorMax)}</span>
        </div>
      </fieldset>}

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
        Só disponíveis
        <input type="checkbox" checked={f.soDisponiveis} onChange={(e) => setFiltros({ soDisponiveis: e.target.checked })} className="peer sr-only" />
        <span className="relative h-6 w-11 rounded-full bg-white/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-esmeralda peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ambar" />
      </label>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span data-testid="contador-filtro" aria-live="polite">
          <strong className="text-ambar-claro">{n}</strong> de {emp.unidades.length} unidades
        </span>
        <button type="button" onClick={limpar} disabled={!filtroAtivo(f)} className="btn btn-linha !min-h-11">Limpar</button>
      </div>
    </div>
  );
}
