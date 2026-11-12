"use client";

import { AnimatePresence, motion } from "framer-motion";
import { emp } from "@/lib/dados";
import { useExp } from "@/lib/store";

/** Tela de carregamento (logo, nome e barra de progresso real) e botão "Pular" da introdução. */
export function Carregador() {
  const carga = useExp((s) => s.carga);
  const pronto = useExp((s) => s.pronto);
  const estado = useExp((s) => s.estado);
  const pular = useExp((s) => s.pularIntro);
  const naIntro = estado === "INTRO";
  const pct = Math.round(carga * 100);

  return (
    <>
      <AnimatePresence>
        {!pronto && (
          <motion.div
            key="carga"
            className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-fundo/80 backdrop-blur-sm"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            role="status"
            aria-live="polite"
          >
            <div className="font-titulo text-6xl font-extralight tracking-[0.18em] text-texto sm:text-7xl">MAXI</div>
            <div className="rotulo mt-1 !tracking-[0.42em]">Construtora e Incorporadora</div>
            <div className="mt-8 font-titulo text-2xl font-light tracking-wide sm:text-3xl">{emp.nome}</div>
            <div
              className="mt-6 h-[3px] w-56 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="Carregando a experiência 3D"
            >
              <div className="h-full rounded-full bg-ambar transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 text-xs tabular-nums text-cinza">{pct}%</div>
            {emp.proposta && <div className="mt-6 text-[11px] text-cinza">{emp.proposta.aviso}</div>}
          </motion.div>
        )}
      </AnimatePresence>
      {naIntro && (
        <button type="button" onClick={pular} className="btn btn-linha absolute bottom-6 right-4 z-40 sm:bottom-8 sm:right-8" data-testid="pular-intro">
          Pular
        </button>
      )}
    </>
  );
}
