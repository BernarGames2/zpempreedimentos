"use client";

import { motion, type PanInfo } from "framer-motion";
import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Conteúdo sempre visível, mesmo com a gaveta recolhida no celular. */
  cabecalho: ReactNode;
  rotulo: string;
  lado?: "direita" | "esquerda";
  testId?: string;
  inicialAberta?: boolean;
}

/**
 * Painel que vira gaveta inferior arrastável no celular e cartão lateral no desktop.
 * No celular, arraste a alça (ou toque nela) para abrir e recolher.
 */
export function Gaveta({ children, cabecalho, rotulo, lado = "direita", testId, inicialAberta = true }: Props) {
  const [aberta, setAberta] = useState(inicialAberta);
  const aoSoltar = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 30 || info.velocity.y > 300) setAberta(false);
    else if (info.offset.y < -30 || info.velocity.y < -300) setAberta(true);
  };
  return (
    <motion.aside
      aria-label={rotulo}
      data-testid={testId}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
      className={`vidro pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-2xl md:inset-x-auto md:bottom-auto md:top-24 md:max-h-[calc(100%-8.5rem)] md:w-[372px] md:rounded-3xl ${lado === "direita" ? "md:right-6" : "md:left-6"}`}
    >
      <motion.button
        type="button"
        onPanEnd={aoSoltar}
        onClick={() => setAberta((a) => !a)}
        className="flex h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
        aria-label={aberta ? "Recolher painel" : "Abrir painel"}
        aria-expanded={aberta}
      >
        <span className="h-1 w-10 rounded-full bg-white/30" />
      </motion.button>
      <div className="shrink-0 px-5 md:pt-5">{cabecalho}</div>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 ${aberta ? "" : "hidden md:block"}`}>{children}</div>
    </motion.aside>
  );
}
