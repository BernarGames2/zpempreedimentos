"use client";

import { PRIMEIRO_ANDAR, ULTIMO_ANDAR, emp, temInterior, tipoDe } from "@/lib/dados";
import { COR_STATUS, ROTULO_STATUS, area } from "@/lib/formato";
import { useExp } from "@/lib/store";
import { IcoFechar } from "./Icones";

const ANDARES = Array.from({ length: ULTIMO_ANDAR - PRIMEIRO_ANDAR + 1 }, (_, i) => ULTIMO_ANDAR - i);

/**
 * Escolha por andar: destaca o pavimento na fachada (os outros ficam velados) e lista as unidades dele;
 * tocar numa unidade leva a câmera até ela, de onde se entra no apartamento.
 */
export function SeletorAndar({ fechar }: { fechar: () => void }) {
  const f = useExp((s) => s.filtros);
  const setFiltros = useExp((s) => s.setFiltros);
  const selecionar = useExp((s) => s.selecionar);
  const andar = f.andarMin === f.andarMax ? f.andarMin : null;
  const unidades = andar === null ? [] : emp.unidades.filter((u) => u.andar === andar).sort((a, b) => a.posicao - b.posicao);
  const escolher = (n: number) => setFiltros({ andarMin: n, andarMax: n });
  const todos = () => setFiltros({ andarMin: PRIMEIRO_ANDAR, andarMax: ULTIMO_ANDAR });

  return (
    <div className="flex flex-col gap-4" data-testid="seletor-andar">
      <div className="flex items-center justify-between">
        <h2 className="font-titulo text-2xl font-light">Andares</h2>
        <button type="button" onClick={() => { todos(); fechar(); }} aria-label="Fechar andares" className="btn btn-linha !min-w-11 !px-0">
          <IcoFechar />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Escolha o andar">
        {ANDARES.map((n) => {
          const livres = emp.unidades.filter((u) => u.andar === n && u.status === "disponivel").length;
          const ativo = andar === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => escolher(n)}
              aria-pressed={ativo}
              data-testid={`andar-${n}`}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1 text-sm transition-colors ${ativo ? "border-ambar bg-ambar text-[#1a1408]" : "border-white/10 bg-white/5 text-texto hover:border-ambar/60"}`}
            >
              <span className="font-medium leading-none">{n}º</span>
              <span className={`mt-0.5 text-[10px] leading-none ${ativo ? "text-[#1a1408]/70" : "text-cinza"}`}>{livres} disp.</span>
            </button>
          );
        })}
      </div>
      {andar !== null ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="rotulo">{andar}º andar · {unidades.length} unidades</p>
            <button type="button" onClick={todos} className="text-xs text-cinza underline-offset-2 hover:underline">Todos os andares</button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {unidades.map((u) => (
              <li key={u.numero}>
                <button
                  type="button"
                  onClick={() => selecionar(u.numero)}
                  data-testid={`escolher-${u.numero}`}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:border-ambar/60"
                >
                  <span className="font-titulo text-lg font-light">{u.numero}</span>
                  <span className="flex-1 text-xs text-cinza">
                    {tipoDe(u).nome} · {area(u.areaPrivativa)} · {u.fachada}
                    {temInterior(tipoDe(u)) ? " · 3D por dentro" : ""}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-texto/90">
                    <span className="h-2 w-2 rounded-full" style={{ background: COR_STATUS[u.status] }} />
                    {ROTULO_STATUS[u.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-cinza">Toque num andar para destacá-lo no prédio e ver as unidades.</p>
      )}
    </div>
  );
}
