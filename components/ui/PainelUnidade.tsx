"use client";

import { useState } from "react";
import { emp, tipoDe, vizinha } from "@/lib/dados";
import { COR_STATUS, ROTULO_STATUS, area, linkWhatsApp, mensagemUnidade, reais } from "@/lib/formato";
import { registrar } from "@/lib/metricas";
import { useExp } from "@/lib/store";
import type { Unidade } from "@/lib/types";
import { ControleSol } from "./ControleSol";
import { Gaveta } from "./Gaveta";
import { IcoBaixo, IcoCheck, IcoCima, IcoCompartilhar, IcoDir, IcoEsq, IcoFechar, IcoOlho, IcoPorta, IcoWhats } from "./Icones";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.07] py-2 text-sm">
      <dt className="text-cinza">{rotulo}</dt>
      <dd className="text-right font-medium text-texto">{valor}</dd>
    </div>
  );
}

/** Painel da unidade: dados, estudo de sol, entrar, vista, WhatsApp, compartilhar e vizinhas. */
export function PainelUnidade({ u }: { u: Unidade }) {
  const { selecionar, entrar, verVista, voltarPredio } = useExp.getState();
  const emVoo = useExp((s) => s.emVoo);
  const [copiado, setCopiado] = useState(false);
  const t = tipoDe(u);
  const vende = emp.modo !== "locacao";
  const aluga = emp.modo !== "venda";

  const compartilhar = async () => {
    const link = `${window.location.origin}/?unidade=${u.numero}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copie o link da unidade:", link);
    }
    setCopiado(true);
    registrar("compartilhou", { unidade: u.numero });
    window.setTimeout(() => setCopiado(false), 2200);
  };

  const setas: { dir: "cima" | "baixo" | "esquerda" | "direita"; rotulo: string; icone: React.ReactNode }[] = [
    { dir: "esquerda", rotulo: "Unidade ao lado (esquerda)", icone: <IcoEsq /> },
    { dir: "baixo", rotulo: "Unidade de baixo", icone: <IcoBaixo /> },
    { dir: "cima", rotulo: "Unidade de cima", icone: <IcoCima /> },
    { dir: "direita", rotulo: "Unidade ao lado (direita)", icone: <IcoDir /> },
  ];

  return (
    <Gaveta
      rotulo={`Unidade ${u.numero}`}
      testId="painel-unidade"
      cabecalho={
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <p className="rotulo">{u.andar}º andar · {t.nome}</p>
            <h2 className="font-titulo text-4xl font-light leading-tight" data-testid="numero-unidade">{u.numero}</h2>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full" style={{ background: COR_STATUS[u.status] }} />
              {ROTULO_STATUS[u.status]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {setas.map((s) => {
              const v = vizinha(u, s.dir);
              return (
                <button key={s.dir} type="button" disabled={!v || emVoo} onClick={() => v && selecionar(v.numero)} aria-label={v ? `${s.rotulo}: ${v.numero}` : s.rotulo} className="btn btn-linha !min-h-11 !min-w-11 !px-0" data-testid={`seta-${s.dir}`}>
                  {s.icone}
                </button>
              );
            })}
            <button type="button" onClick={voltarPredio} aria-label="Fechar e voltar ao prédio" className="btn btn-linha ml-1 !min-h-11 !min-w-11 !px-0">
              <IcoFechar />
            </button>
          </div>
        </div>
      }
    >
      <dl>
        <Linha rotulo="Área privativa" valor={area(u.areaPrivativa)} />
        <Linha rotulo="Mobiliado" valor={t.mobiliado ? "Sim" : "Não"} />
        <Linha rotulo="Vagas" valor={String(t.vagas)} />
        {vende && <Linha rotulo="Preço" valor={reais(u.preco)} />}
        {aluga && <Linha rotulo="Aluguel" valor={u.aluguel === null ? "Consulte" : `${reais(u.aluguel)}/mês`} />}
        {u.vista && <Linha rotulo="Vista" valor={u.vista} />}
      </dl>
      <div className="mt-3"><ControleSol /></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={entrar} disabled={emVoo} className="btn btn-ambar col-span-2" data-testid="entrar">
          <IcoPorta /> Entrar no apartamento
        </button>
        <button type="button" onClick={verVista} disabled={emVoo} className="btn btn-linha" data-testid="ver-vista">
          <IcoOlho /> Ver a vista
        </button>
        <button type="button" onClick={compartilhar} className="btn btn-linha" data-testid="compartilhar">
          {copiado ? <IcoCheck /> : <IcoCompartilhar />} {copiado ? "Link copiado" : "Compartilhar"}
        </button>
        <a
          href={linkWhatsApp(emp, mensagemUnidade(emp, u))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => registrar("clicou_whatsapp", { unidade: u.numero, origem: "painel" })}
          className="btn col-span-2 bg-[#1fa855] text-white hover:bg-[#25c466]"
          data-testid="whatsapp-unidade"
        >
          <IcoWhats /> Falar no WhatsApp
        </a>
      </div>
    </Gaveta>
  );
}
