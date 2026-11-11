"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { emp } from "@/lib/dados";
import { useExp } from "@/lib/store";
import type { Manifesto } from "@/lib/types";
import { Alternativa2D } from "./ui/Alternativa2D";
import { Interface } from "./ui/Interface";

const Experiencia = dynamic(() => import("./three/Experiencia"), { ssr: false });

function temWebGL(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("semwebgl") === "1") return false;
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2"));
  } catch {
    return false;
  }
}

/** Primeira tela: a experiência 3D em tela cheia, com o render oficial como imagem de espera. */
export function Hero({ fonte, manifesto }: { fonte: string; manifesto: Manifesto }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const pronto = useExp((s) => s.pronto);

  useEffect(() => {
    setWebgl(temWebGL());
  }, []);

  if (webgl === false) {
    return (
      <section id="experiencia" aria-label={`Unidades do ${emp.nome}`} className="relative w-full bg-fundo">
        <Alternativa2D />
      </section>
    );
  }

  return (
    <section id="experiencia" aria-label={`Experiência 3D do ${emp.nome}`} className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-fundo">
      <Image
        src="/referencias/01-fachada-esquina.png"
        alt={`Fachada do ${emp.nome} vista da esquina, à noite`}
        fill
        priority
        sizes="100vw"
        className={`object-cover object-top transition-opacity duration-700 ${pronto ? "opacity-0" : "opacity-60"}`}
      />
      {webgl && <Experiencia fonte={fonte} manifesto={manifesto} />}
      <Interface />
      <a href="#conceito" className="btn btn-linha absolute bottom-5 right-3 z-10 !min-w-11 !px-0 max-md:hidden" aria-label="Rolar para conhecer o projeto">↓</a>
    </section>
  );
}
