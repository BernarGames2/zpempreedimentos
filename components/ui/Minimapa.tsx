"use client";

import { useEffect, useRef } from "react";
import { limitesPlanta } from "@/lib/procedural/planta";
import { poseCamera, useExp } from "@/lib/store";
import type { TipoPlanta } from "@/lib/types";

/** Planta 2D com ponto e cone de visão. Clicar leva a câmera até o ponto. */
export function Minimapa({ tipo }: { tipo: TipoPlanta }) {
  const marcador = useRef<SVGGElement>(null);
  const atual = useExp((s) => s.comodoAtual);
  const caminharPara = useExp((s) => s.caminharPara);
  const l = limitesPlanta(tipo);
  const m = 0.25;
  const larg = l.x1 - l.x0 + m * 2;
  const alt = l.z1 - l.z0 + m * 2;

  useEffect(() => {
    let id = 0;
    const laco = () => {
      marcador.current?.setAttribute("transform", `translate(${poseCamera.x} ${poseCamera.z}) rotate(${(-poseCamera.guinada * 180) / Math.PI})`);
      id = requestAnimationFrame(laco);
    };
    id = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(id);
  }, []);

  const aoClicar = (ev: React.MouseEvent<SVGSVGElement>) => {
    const svg = ev.currentTarget;
    const p = svg.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const q = p.matrixTransform(ctm.inverse());
    caminharPara(q.x, q.y);
  };

  return (
    <div className="vidro pointer-events-auto rounded-2xl p-2" data-testid="minimapa">
      <svg
        viewBox={`${l.x0 - m} ${l.z0 - m} ${larg} ${alt}`}
        className="block h-auto w-[132px] cursor-pointer sm:w-[176px]"
        role="img"
        aria-label="Planta do apartamento. Clique em um ponto para ir até lá."
        onClick={aoClicar}
      >
        {tipo.comodos.map((c) => (
          <polygon
            key={c.id}
            points={c.poligono.map((p) => p.join(",")).join(" ")}
            fill={c.id === atual ? "rgb(232 169 78 / 0.28)" : "rgb(255 255 255 / 0.07)"}
            stroke="rgb(255 255 255 / 0.55)"
            strokeWidth={0.06}
            strokeLinejoin="round"
          />
        ))}
        <g ref={marcador}>
          {/* cone de visão (a câmera olha para -z quando a guinada é 0) */}
          <path d="M0 0 L-0.75 -1.25 A1.45 1.45 0 0 1 0.75 -1.25 Z" fill="rgb(232 169 78 / 0.35)" />
          <circle r={0.17} fill="#e8a94e" stroke="#141824" strokeWidth={0.05} />
        </g>
      </svg>
    </div>
  );
}
