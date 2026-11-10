"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { emp } from "@/lib/dados";

const LINKS = [
  { href: "#experiencia", rotulo: "Unidades" },
  { href: "#decorado", rotulo: "Decorado" },
  { href: "#lazer", rotulo: "Lazer" },
  { href: "#localizacao", rotulo: "Localização" },
];

/** Header fixo e transparente; ganha fundo quando a página rola. */
export function Header({ logo }: { logo?: string }) {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > window.innerHeight * 0.6);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${rolou ? "vidro" : "bg-gradient-to-b from-fundo/70 to-transparent"}`}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <a href="#experiencia" className="flex min-h-11 items-center gap-2.5" aria-label={`${emp.incorporadora} — início`}>
          {logo ? (
            <Image src={logo} alt={emp.incorporadora} width={120} height={36} className="h-8 w-auto" />
          ) : (
            <>
              <span className="font-titulo text-2xl font-extralight tracking-[0.14em]">ZP</span>
              <span className="rotulo hidden !tracking-[0.3em] sm:inline">Empreendimentos</span>
            </>
          )}
        </a>
        <nav aria-label="Seções" className="flex items-center gap-1">
          <ul className="hidden items-center md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="flex min-h-11 items-center px-3 text-sm text-texto/85 transition-colors hover:text-ambar-claro">
                  {l.rotulo}
                </a>
              </li>
            ))}
          </ul>
          <a href="#contato" className="btn btn-ambar ml-2 !min-h-10 !px-4">
            Agendar visita
          </a>
        </nav>
      </div>
    </header>
  );
}
