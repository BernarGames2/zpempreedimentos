"use client";

import { emp } from "@/lib/dados";
import { useExp } from "@/lib/store";
import { Carregador } from "./Carregador";

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
  return (
    <>
      <div className="pointer-events-none absolute left-4 top-[4.25rem] z-20 sm:left-6 sm:top-20">
        <SeloDemo />
      </div>
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
