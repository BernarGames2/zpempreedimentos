"use client";

import { AnimatePresence } from "framer-motion";
import { emp } from "@/lib/dados";
import { useExp, useUnidadeSel } from "@/lib/store";
import { useUrl } from "@/lib/useUrl";
import { BarraMaquete, BarraPasseio, BarraVista } from "./BarraInterior";
import { BarraPredio } from "./BarraPredio";
import { Carregador } from "./Carregador";
import { CartaoLazer } from "./CartaoLazer";
import { BotaoFoto, FotoDecorado } from "./FotoDecorado";
import { BotaoSom } from "./Som";
import { MenuQualidade } from "./MenuQualidade";
import { PainelUnidade } from "./PainelUnidade";

/** Selo exibido enquanto houver qualquer dado de exemplo no JSON. */
export function SeloDemo({ className = "" }: { className?: string }) {
  if (!emp.demonstracao.ativo) return null;
  return (
    <span
      className={`vidro inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-ambar-claro ${className}`}
      title={`Campos de exemplo: ${emp.demonstracao.campos.join("; ")}`}
      data-testid="selo-demo"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ambar" aria-hidden />
      Dados de demonstração
    </span>
  );
}

/** Camada 2D sobre o Canvas: muda conforme o estado da experiência. */
export function Interface() {
  const veu = useExp((s) => s.veu);
  const estado = useExp((s) => s.estado);
  const cena = useExp((s) => s.cena);
  const vistaReal = useExp((s) => s.vistaReal);
  const u = useUnidadeSel();
  useUrl();
  return (
    <>
      <div className="pointer-events-none absolute left-4 top-[4.25rem] z-[24] flex items-center gap-2 sm:left-6 sm:top-20">
        {estado !== "INTRO" && <MenuQualidade />}
        <SeloDemo />
      </div>
      {estado === "PREDIO" && <BarraPredio />}
      <AnimatePresence>{estado === "UNIDADE" && u && <PainelUnidade key="unidade" u={u} />}</AnimatePresence>
      {estado === "MAQUETE" && u && cena === "interior" && <BarraMaquete u={u} />}
      {estado === "PASSEIO" && u && cena === "interior" && (
        <>
          <FotoDecorado u={u} />
          <BarraPasseio u={u} extras={<><BotaoFoto u={u} /><BotaoSom /></>} />
        </>
      )}
      {estado === "LAZER" && <CartaoLazer />}
      {estado === "VISTA" && u && <BarraVista u={u} ilustrativa={!vistaReal} />}
      <Carregador />
      {/* Véu branco quente dos cortes (400 ms) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[25] bg-[#fff3e0] transition-opacity duration-[400ms] ease-in-out"
        style={{ opacity: veu ? 1 : 0 }}
      />
    </>
  );
}
