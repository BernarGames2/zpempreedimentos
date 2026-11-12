"use client";

import Image from "next/image";
import { tipoDe } from "@/lib/dados";
import { registrar } from "@/lib/metricas";
import { useExp } from "@/lib/store";
import type { Unidade } from "@/lib/types";
import { IcoFechar, IcoFoto } from "./Icones";

function comodoDaFoto(u: Unidade, id: string | null) {
  return tipoDe(u).comodos.find((c) => c.id === id && c.fotoDecorado);
}

/** Botão "Foto do decorado": aparece nos cômodos que têm render oficial. */
export function BotaoFoto({ u }: { u: Unidade }) {
  const atual = useExp((s) => s.comodoAtual);
  const aberta = useExp((s) => s.foto.aberta);
  const c = comodoDaFoto(u, atual);
  if (!c) return null;
  const alternar = () => {
    const s = useExp.getState();
    if (aberta) {
      s.setFoto({ aberta: false });
      return;
    }
    // volta ao enquadramento da foto e a abre quando a câmera chega
    s.irComodo(c.id);
    s.set({ fotoAoChegar: true });
    registrar("abriu_foto_decorado", { unidade: u.numero, comodo: c.id });
  };
  return (
    <button type="button" onClick={alternar} aria-pressed={aberta} className={`btn btn-linha justify-start ${aberta ? "btn-ativo" : ""}`} data-testid="foto-decorado">
      <IcoFoto /> <span className="max-sm:sr-only">Foto do decorado</span><span className="sm:hidden">Foto</span>
    </button>
  );
}

/** Render oficial sobre o 3D, no mesmo ângulo, com o controle deslizante "3D ↔ Foto". */
export function FotoDecorado({ u }: { u: Unidade }) {
  const atual = useExp((s) => s.comodoAtual);
  const foto = useExp((s) => s.foto);
  const setFoto = useExp((s) => s.setFoto);
  const c = comodoDaFoto(u, atual);
  if (!c?.fotoDecorado) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 z-[9] transition-opacity duration-700 ${foto.aberta ? "opacity-100" : "opacity-0"}`} aria-hidden={!foto.aberta} data-testid="camada-foto">
      {/* fundo: a própria foto desfocada preenche a tela; por cima, a foto inteira */}
      <Image src={c.fotoDecorado} alt="" fill sizes="100vw" className="scale-110 object-cover blur-2xl brightness-50" style={{ opacity: foto.mix }} />
      <Image src={c.fotoDecorado} alt={`Foto oficial do decorado: ${c.nome}`} fill sizes="100vw" className="object-contain" style={{ opacity: foto.mix }} />
      {foto.aberta && (
        <>
          <p className="vidro absolute bottom-[11.8rem] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-texto sm:bottom-auto sm:top-20" data-testid="aviso-foto">
            Foto oficial do decorado · arraste para explorar em 3D
          </p>
          <div className="vidro pointer-events-auto absolute inset-x-3 bottom-[8.2rem] mx-auto flex max-w-md items-center gap-3 rounded-full px-4 sm:bottom-24">
            <span className="text-xs font-medium text-cinza">3D</span>
            <label className="sr-only" htmlFor="mix-foto">Comparar 3D e foto</label>
            <input id="mix-foto" type="range" min={0} max={1} step={0.01} value={foto.mix} onChange={(e) => setFoto({ mix: Number(e.target.value) })} data-testid="mix-foto" />
            <span className="text-xs font-medium text-ambar-claro">Foto</span>
            <button type="button" onClick={() => setFoto({ aberta: false })} aria-label="Fechar a foto do decorado" className="btn !min-h-11 !min-w-11 !px-0 text-texto"><IcoFechar /></button>
          </div>
        </>
      )}
    </div>
  );
}
