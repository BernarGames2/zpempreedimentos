"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { emp, lazeres } from "@/lib/dados";
import { linkWhatsApp } from "@/lib/formato";
import { registrar } from "@/lib/metricas";
import { useExp } from "@/lib/store";
import { IcoCheck, IcoPredio, IcoWhats } from "./Icones";

/** Barra e cartão escuro do lazer: etiqueta, título, três destaques, descrição, itens e ações. */
export function CartaoLazer() {
  const sel = useExp((s) => s.lazerSel);
  const { voltarPredio, abrirLazer } = useExp.getState();
  const todos = lazeres();
  const l = todos.find((x) => x.id === sel);

  return (
    <>
      <nav aria-label="Espaços de lazer" className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full sm:bottom-7 vidro p-1">
        <button type="button" onClick={voltarPredio} className="btn !min-h-11 shrink-0 !px-3.5 text-texto/90" data-testid="lazer-voltar">
          <IcoPredio /> Prédio
        </button>
        {todos.filter((x) => !x.sem3d).map((x) => (
          <button key={x.id} type="button" onClick={() => abrirLazer(x.id)} aria-current={sel === x.id ? "true" : undefined} className={`btn !min-h-11 shrink-0 !px-3.5 ${sel === x.id ? "bg-ambar text-[#1a1408]" : "text-texto/90 hover:text-ambar-claro"}`}>
            {x.nome}
          </button>
        ))}
      </nav>
      {l && (
        <motion.article
          key={l.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="pointer-events-auto absolute inset-x-3 bottom-20 z-20 max-h-[60%] overflow-y-auto rounded-3xl border border-white/10 bg-[#10131d]/95 p-5 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-6 md:top-24 md:w-[380px]"
          data-testid="cartao-lazer"
          aria-label={l.nome}
        >
          {l.imagem && (
            <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-3xl">
              <Image src={l.imagem} alt={`${l.nome} do ${emp.nome} (imagem oficial)`} width={1080} height={692} sizes="380px" className="h-auto w-full" />
            </div>
          )}
          <p className="rotulo !text-ambar-claro">{l.etiqueta}</p>
          <h2 className="mt-1 font-titulo text-3xl font-light">{l.nome}</h2>
          <ul className={`mt-3 flex flex-wrap gap-1.5 ${l.destaques.length ? "" : "hidden"}`}>
            {l.destaques.map((d) => (
              <li key={d} className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-xs">{d}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-cinza">{l.descricao}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {l.itens.map((i) => (
              <li key={i} className="flex items-start gap-2"><IcoCheck width={16} height={16} className="mt-0.5 shrink-0 text-ambar" /> {i}</li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-cinza" data-testid="lazer-ilustrativo">{l.imagem ? "Imagem oficial de divulgação. No 3D, a posição segue a planta do pavimento de lazer." : "Imagem ilustrativa"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={voltarPredio} className="btn btn-linha"><IcoPredio /> Voltar ao prédio</button>
            <a href={linkWhatsApp(emp, `Olá! Gostaria de agendar uma visita ao ${emp.nome} e conhecer o espaço ${l.nome}.`)} target="_blank" rel="noopener noreferrer" onClick={() => registrar("clicou_whatsapp", { origem: "lazer", lazer: l.id })} className="btn btn-ambar">
              <IcoWhats /> Agendar visita
            </a>
          </div>
        </motion.article>
      )}
    </>
  );
}
