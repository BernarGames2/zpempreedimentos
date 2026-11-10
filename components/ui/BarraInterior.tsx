"use client";

import { useState } from "react";
import { emp, tipoDe } from "@/lib/dados";
import { linkWhatsApp, mensagemVisita } from "@/lib/formato";
import { registrar } from "@/lib/metricas";
import { useExp } from "@/lib/store";
import type { Unidade } from "@/lib/types";
import { ControleSol } from "./ControleSol";
import { IcoPlanta, IcoPorta, IcoPredio, IcoRegua, IcoSol, IcoVoltar, IcoWhats } from "./Icones";
import { Minimapa } from "./Minimapa";

function Agendar({ u, curto = false }: { u: Unidade; curto?: boolean }) {
  return (
    <a
      href={linkWhatsApp(emp, mensagemVisita(emp, u))}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrar("clicou_whatsapp", { unidade: u.numero, origem: "interior" })}
      className="btn btn-ambar"
      data-testid="agendar-visita"
    >
      <IcoWhats /> {curto ? "Agendar" : "Agendar visita"}
    </a>
  );
}

function Titulo({ u, modo }: { u: Unidade; modo: string }) {
  return (
    <div className="vidro pointer-events-none absolute left-4 top-[6.6rem] z-10 rounded-2xl px-3.5 py-2 sm:left-6 md:top-[7.4rem]">
      <p className="rotulo">{modo}</p>
      <p className="font-titulo text-lg font-light leading-tight">Unidade {u.numero} · {tipoDe(u).nome}</p>
    </div>
  );
}

/** Maquete: iniciar o passeio, medidas, estudo de sol e saída. */
export function BarraMaquete({ u }: { u: Unidade }) {
  const medidas = useExp((s) => s.medidas);
  const emVoo = useExp((s) => s.emVoo);
  const { set, passeio, voltarPredio, selecionar } = useExp.getState();
  const [sol, setSol] = useState(false);
  return (
    <>
      <Titulo u={u} modo="Maquete" />
      {sol && (
        <div className="vidro pointer-events-auto absolute bottom-36 left-1/2 z-10 w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl p-3 sm:bottom-24">
          <ControleSol compacto />
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:bottom-7" data-testid="barra-maquete">
        <button type="button" disabled={emVoo} onClick={() => passeio()} className="btn btn-ambar" data-testid="iniciar-passeio">
          <IcoPorta /> Passear pelo apartamento
        </button>
        <button type="button" onClick={() => set({ medidas: !medidas })} aria-pressed={medidas} className={`btn btn-linha ${medidas ? "btn-ativo" : ""}`} data-testid="mostrar-medidas">
          <IcoRegua /> Mostrar medidas
        </button>
        <button type="button" onClick={() => setSol((v) => !v)} aria-expanded={sol} className={`btn btn-linha ${sol ? "btn-ativo" : ""}`}>
          <IcoSol /> Sol
        </button>
        <button type="button" disabled={emVoo} onClick={() => selecionar(u.numero)} className="btn btn-linha" data-testid="voltar-unidade">
          <IcoVoltar /> Unidade
        </button>
        <button type="button" disabled={emVoo} onClick={voltarPredio} className="btn btn-linha" data-testid="voltar-predio">
          <IcoPredio /> Voltar ao prédio
        </button>
      </div>
    </>
  );
}

/** Passeio: abas dos cômodos, minimapa e botões fixos. */
export function BarraPasseio({ u, extras }: { u: Unidade; extras?: React.ReactNode }) {
  const tipo = tipoDe(u);
  const atual = useExp((s) => s.comodoAtual);
  const usandoSplat = useExp((s) => s.usandoSplat);
  const emVoo = useExp((s) => s.emVoo);
  const { irComodo, maquete, voltarPredio } = useExp.getState();
  return (
    <>
      <div className="absolute right-3 top-[4.25rem] z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-20">
        <Minimapa tipo={tipo} />
        {!usandoSplat && (
          <span className="vidro rounded-full px-3 py-1 text-[11px] text-cinza" data-testid="previa-simplificada">Prévia simplificada</span>
        )}
      </div>
      <div className="pointer-events-auto absolute left-3 top-[6.6rem] z-10 flex flex-col gap-2 sm:left-6 md:top-[7.4rem]" data-testid="botoes-passeio">
        <button type="button" disabled={emVoo} onClick={maquete} className="btn btn-linha justify-start" data-testid="ir-maquete">
          <IcoPlanta /> Maquete
        </button>
        <button type="button" disabled={emVoo} onClick={voltarPredio} className="btn btn-linha justify-start" data-testid="voltar-predio">
          <IcoPredio /> <span className="max-sm:sr-only">Voltar ao prédio</span><span className="sm:hidden">Prédio</span>
        </button>
        {extras}
      </div>
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
        <div className="sm:absolute sm:bottom-4 sm:right-6"><Agendar u={u} /></div>
        <nav aria-label="Cômodos" className="vidro flex max-w-full gap-1 overflow-x-auto rounded-full p-1" data-testid="abas-comodos">
          {tipo.comodos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => irComodo(c.id)}
              aria-current={atual === c.id ? "true" : undefined}
              data-testid={`aba-${c.id}`}
              className={`btn !min-h-11 shrink-0 !px-3.5 ${atual === c.id ? "bg-ambar text-[#1a1408]" : "text-texto/90 hover:text-ambar-claro"}`}
            >
              {c.nome}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

/** Vista da sacada: aviso de vista ilustrativa e volta. */
export function BarraVista({ u, ilustrativa }: { u: Unidade; ilustrativa: boolean }) {
  const { selecionar } = useExp.getState();
  const emVoo = useExp((s) => s.emVoo);
  return (
    <>
      <Titulo u={u} modo={`Vista do ${u.andar}º andar`} />
      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:bottom-7">
        {ilustrativa && <span className="vidro rounded-full px-3 py-2 text-xs text-cinza" data-testid="vista-ilustrativa">Vista ilustrativa · arraste para olhar em volta</span>}
        <button type="button" disabled={emVoo} onClick={() => selecionar(u.numero)} className="btn btn-linha" data-testid="voltar-unidade">
          <IcoVoltar /> Voltar à unidade
        </button>
      </div>
    </>
  );
}
