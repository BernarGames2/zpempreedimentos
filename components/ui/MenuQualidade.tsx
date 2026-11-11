"use client";

import { useState } from "react";
import { useExp, type Qualidade } from "@/lib/store";
import { IcoAjustes } from "./Icones";

const NIVEIS: { id: Qualidade | "auto"; rotulo: string }[] = [
  { id: "auto", rotulo: "Automática" },
  { id: "alto", rotulo: "Alta" },
  { id: "medio", rotulo: "Média" },
  { id: "baixo", rotulo: "Baixa" },
];

/** Qualidade gráfica: automática (mede o desempenho) ou escolhida à mão. */
export function MenuQualidade() {
  const [aberto, setAberto] = useState(false);
  const qualidade = useExp((s) => s.qualidade);
  const auto = useExp((s) => s.qualidadeAuto);
  const set = useExp((s) => s.set);
  const atual = auto ? "auto" : qualidade;
  return (
    <div className="pointer-events-auto relative">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-haspopup="menu" aria-label="Qualidade gráfica" className="btn btn-linha !min-w-11 !px-0" data-testid="menu-qualidade">
        <IcoAjustes />
      </button>
      {aberto && (
        <div role="menu" aria-label="Qualidade gráfica" className="vidro absolute left-0 top-12 z-30 w-44 rounded-2xl p-1.5">
          <p className="rotulo px-2.5 pb-1 pt-1.5">Qualidade</p>
          {NIVEIS.map((n) => (
            <button
              key={n.id}
              type="button"
              role="menuitemradio"
              aria-checked={atual === n.id}
              onClick={() => {
                set(n.id === "auto" ? { qualidadeAuto: true } : { qualidade: n.id, qualidadeAuto: false });
                setAberto(false);
              }}
              data-testid={`qualidade-${n.id}`}
              className={`flex min-h-11 w-full items-center justify-between rounded-xl px-2.5 text-left text-sm ${atual === n.id ? "bg-ambar/15 text-ambar-claro" : "text-texto/90 hover:bg-white/5"}`}
            >
              {n.rotulo}
              {n.id === "auto" && <span className="text-[11px] text-cinza">{qualidade === "alto" ? "alta" : qualidade === "medio" ? "média" : "baixa"}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
