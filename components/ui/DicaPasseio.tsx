"use client";

import { useEffect, useState } from "react";
import { toquePrincipal } from "@/lib/controles";

/** Dica dos controles ao entrar no apartamento; some no primeiro movimento ou depois de alguns segundos. */
export function DicaPasseio() {
  const [visivel, setVisivel] = useState(true);
  const [toque, setToque] = useState(false);
  useEffect(() => {
    setToque(toquePrincipal());
    const esconder = () => setVisivel(false);
    const t = window.setTimeout(esconder, 9000);
    window.addEventListener("keydown", esconder, { once: true });
    window.addEventListener("pointerdown", esconder, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", esconder);
      window.removeEventListener("pointerdown", esconder);
    };
  }, []);
  return (
    <div
      aria-live="polite"
      data-testid="dica-passeio"
      className={`vidro pointer-events-none absolute left-1/2 top-1/2 z-10 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 py-4 text-center text-sm leading-relaxed text-texto transition-opacity duration-500 ${visivel ? "opacity-100" : "opacity-0"}`}
    >
      <p className="rotulo mb-1.5">Você está dentro do apartamento</p>
      {toque ? (
        <p>Arraste a tela para olhar em volta, use o joystick para andar e faça pinça para aproximar. Toque no chão para ir até o ponto.</p>
      ) : (
        <p>Use <b>W A S D</b> ou as setas para andar, arraste com o mouse para olhar e role a rodinha para aproximar. Clique no chão para ir até o ponto.</p>
      )}
    </div>
  );
}
