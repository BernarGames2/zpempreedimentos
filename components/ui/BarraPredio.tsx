"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { COR_STATUS } from "@/lib/formato";
import { filtroAtivo, useExp } from "@/lib/store";
import { ControleSol } from "./ControleSol";
import { Filtros } from "./Filtros";
import { Gaveta } from "./Gaveta";
import { IcoCamadas, IcoFechar, IcoFiltro, IcoLazer, IcoSol } from "./Icones";

/** Controles da vista do prédio: filtros, camada de status, estudo de sol e lazer. */
export function BarraPredio() {
  const [filtros, setFiltros] = useState(false);
  const [sol, setSol] = useState(false);
  const mostrarStatus = useExp((s) => s.mostrarStatus);
  const ativo = useExp((s) => filtroAtivo(s.filtros));
  const set = useExp((s) => s.set);
  const abrirLazer = useExp((s) => s.abrirLazer);

  return (
    <>
      <div className={`pointer-events-auto absolute bottom-5 left-1/2 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:bottom-7 ${filtros ? "max-md:hidden" : ""}`} data-testid="barra-predio">
        <button type="button" onClick={() => { setFiltros((v) => !v); setSol(false); }} aria-expanded={filtros} className={`btn btn-linha ${filtros || ativo ? "btn-ativo" : ""}`} data-testid="abrir-filtros">
          <IcoFiltro /> Filtros
        </button>
        <button type="button" onClick={() => set({ mostrarStatus: !mostrarStatus })} aria-pressed={mostrarStatus} className={`btn btn-linha ${mostrarStatus ? "btn-ativo" : ""}`} data-testid="ver-status">
          <IcoCamadas /> Ver status
        </button>
        <button type="button" onClick={() => { setSol((v) => !v); setFiltros(false); }} aria-expanded={sol} className={`btn btn-linha ${sol ? "btn-ativo" : ""}`} data-testid="abrir-sol">
          <IcoSol /> Sol
        </button>
        <button type="button" onClick={() => abrirLazer(null)} className="btn btn-linha" data-testid="abrir-lazer">
          <IcoLazer /> Lazer
        </button>
      </div>

      {mostrarStatus && (
        <ul className="vidro pointer-events-none absolute left-4 top-[7.4rem] z-10 flex gap-3 rounded-full px-3 py-1.5 text-[11px] text-texto/90 md:left-auto md:right-6 md:top-20" aria-label="Legenda do status">
          {([["disponivel", "Disponível"], ["reservada", "Reservada"], ["vendida", "Vendida/alugada"]] as const).map(([k, r]) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: COR_STATUS[k] }} /> {r}
            </li>
          ))}
        </ul>
      )}

      {sol && (
        <div className="vidro pointer-events-auto absolute bottom-20 left-1/2 z-10 w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl p-3 sm:bottom-24">
          <ControleSol compacto />
        </div>
      )}

      <AnimatePresence>
        {filtros && (
          <Gaveta
            key="filtros"
            rotulo="Filtros de unidades"
            lado="esquerda"
            testId="gaveta-filtros"
            cabecalho={
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-titulo text-2xl font-light">Filtros</h2>
                <button type="button" onClick={() => setFiltros(false)} aria-label="Fechar filtros" className="btn btn-linha !min-w-11 !px-0">
                  <IcoFechar />
                </button>
              </div>
            }
          >
            <Filtros />
          </Gaveta>
        )}
      </AnimatePresence>
    </>
  );
}
