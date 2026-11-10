"use client";

import { useEffect } from "react";
import { useExp } from "./store";

/** Mantém a URL em dia: /?unidade=1201 e /?unidade=1201&comodo=sala (links diretos). */
export function useUrl(): void {
  useEffect(() => {
    const escrever = (s: ReturnType<typeof useExp.getState>) => {
      if (s.estado === "INTRO") return;
      const url = new URL(window.location.href);
      const dentro = s.estado === "PASSEIO";
      if (s.unidadeSel) url.searchParams.set("unidade", s.unidadeSel);
      else url.searchParams.delete("unidade");
      const comodo = dentro ? (s.comodoAtual ?? s.comodo) : null;
      if (comodo && s.unidadeSel) url.searchParams.set("comodo", comodo);
      else url.searchParams.delete("comodo");
      if (url.href !== window.location.href) window.history.replaceState(null, "", url);
    };
    return useExp.subscribe(escrever);
  }, []);
}
