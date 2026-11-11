"use client";

import Image from "next/image";
import { useMemo } from "react";
import { emp, tipoDe } from "@/lib/dados";
import { COR_STATUS, ROTULO_STATUS, area, linkWhatsApp, mensagemUnidade, reais } from "@/lib/formato";
import { passaFiltro, useExp } from "@/lib/store";
import { Filtros } from "./Filtros";
import { SeloDemo } from "./Interface";

/** Versão sem WebGL: render da fachada, tabela de unidades com filtros e link para a galeria. */
export function Alternativa2D() {
  const filtros = useExp((s) => s.filtros);
  const lista = useMemo(() => emp.unidades.filter((u) => passaFiltro(u, filtros)).sort((a, b) => b.andar - a.andar || a.posicao - b.posicao), [filtros]);
  const vende = emp.modo !== "locacao";
  const aluga = emp.modo !== "venda";
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-20 sm:px-6 lg:grid-cols-[minmax(0,360px)_1fr]" data-testid="alternativa-2d">
      <div>
        <div className="overflow-hidden rounded-2xl">
          <Image src="/referencias/01-fachada-esquina.png" alt={`Fachada do ${emp.nome}`} width={1280} height={1600} priority sizes="(min-width: 1024px) 360px, 100vw" className="h-auto w-full" />
        </div>
        <p className="mt-3 text-xs text-cinza">Seu navegador não tem 3D (WebGL) disponível. Você vê aqui a versão simplificada, com as mesmas unidades e filtros. <a href="#decorado" className="text-ambar-claro underline">Ver a galeria do decorado</a>.</p>
      </div>
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-titulo text-2xl">Unidades</h2>
          <SeloDemo />
        </div>
        <details className="mb-4 rounded-2xl border border-white/10 bg-fundo-2 p-4" open>
          <summary className="cursor-pointer text-sm font-medium">Filtros</summary>
          <div className="mt-4"><Filtros /></div>
        </details>
        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Unidades do {emp.nome}</caption>
            <thead className="sticky top-0 bg-painel text-xs uppercase tracking-wider text-cinza">
              <tr>
                <th scope="col" className="px-3 py-3">Unidade</th>
                <th scope="col" className="px-3 py-3">Tipo</th>
                <th scope="col" className="px-3 py-3">Área</th>
                {vende && <th scope="col" className="px-3 py-3">Preço</th>}
                {aluga && <th scope="col" className="px-3 py-3">Aluguel</th>}
                <th scope="col" className="px-3 py-3">Status</th>
                <th scope="col" className="px-3 py-3"><span className="sr-only">Contato</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.numero} className="border-t border-white/[0.07]">
                  <th scope="row" className="px-3 py-2.5 font-medium">{u.numero}</th>
                  <td className="px-3 py-2.5">{tipoDe(u).nome}</td>
                  <td className="px-3 py-2.5">{area(u.areaPrivativa)}</td>
                  {vende && <td className="px-3 py-2.5">{reais(u.preco)}</td>}
                  {aluga && <td className="px-3 py-2.5">{u.aluguel === null ? "Consulte" : reais(u.aluguel)}</td>}
                  <td className="px-3 py-2.5"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: COR_STATUS[u.status] }} />{ROTULO_STATUS[u.status]}</td>
                  <td className="px-3 py-1"><a href={linkWhatsApp(emp, mensagemUnidade(emp, u))} target="_blank" rel="noopener noreferrer" className="btn btn-linha !min-h-11 !px-3 text-xs">WhatsApp</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
