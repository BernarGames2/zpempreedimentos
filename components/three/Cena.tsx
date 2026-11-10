"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ambiente } from "@/lib/ambiente";
import { unidade } from "@/lib/dados";
import { geoUnidade } from "@/lib/procedural/predio";
import { emp } from "@/lib/dados";
import { useExp } from "@/lib/store";
import type { Manifesto } from "@/lib/types";
import { Camera } from "./Camera";
import { Ceu } from "./Ceu";
import { Efeitos } from "./Efeitos";
import { Luzes } from "./Luzes";
import { Predio } from "./Predio";

const EIXO_Y = new THREE.Vector3(0, 1, 0);

function escolherHdri(m: Manifesto): { noite?: string; dia?: string } {
  const achar = (re: RegExp) => m.hdri.find((f) => re.test(f));
  return {
    noite: achar(/night|noite|dusk|evening/i) ?? m.hdri[0],
    dia: achar(/dawn|day|dia|sunset|sunrise|tarde/i),
  };
}

/** Avisa o carregador quando a cena já desenhou os primeiros quadros. */
function Pronto() {
  const quadros = useRef(0);
  useFrame(() => {
    quadros.current++;
    if (quadros.current === 1) useExp.getState().set({ carga: 0.92 });
    if (quadros.current === 3) useExp.getState().set({ carga: 1, pronto: true });
  });
  return null;
}

export function Cena({ fonte, manifesto }: { fonte: string; manifesto: Manifesto }) {
  const hora = useExp((s) => s.hora);
  const noite = useExp((s) => s.noite);
  const qualidade = useExp((s) => s.qualidade);
  const cena = useExp((s) => s.cena);
  const unidadeSel = useExp((s) => s.unidadeSel);
  const gl = useThree((s) => s.gl);

  const amb = useMemo(() => ambiente(hora, noite), [hora, noite]);
  const hdri = useMemo(() => escolherHdri(manifesto), [manifesto]);
  const interior = cena === "interior";
  const u = unidade(unidadeSel);
  const geo = useMemo(() => (u ? geoUnidade(u, emp) : null), [u]);
  // No interior a cena fica no referencial da planta: o céu e o sol giram no sentido contrário.
  const giro = interior && geo ? -geo.rotY : 0;
  const solCena = useMemo(() => amb.solDir.clone().applyAxisAngle(EIXO_Y, giro), [amb, giro]);
  const altura = geo ? geo.sacada[1] : 30;

  useEffect(() => {
    gl.shadowMap.autoUpdate = true;
  }, [gl]);

  return (
    <>
      <Camera />
      <Ceu solDir={solCena} noite={amb.noite} altura={interior ? altura : 30} giro={0} />
      <Suspense fallback={null}>
        <Luzes
          amb={amb}
          qualidade={qualidade}
          hdri={hdri}
          foco={interior ? [3.7, 0, 2.8] : [0, 22, 0]}
          raio={interior ? 9 : 40}
          giro={giro}
          interior={interior}
        />
        <group visible={!interior}>
          <Predio fonte={fonte} artificial={amb.artificial} />
        </group>
        <Pronto />
      </Suspense>
      <Efeitos qualidade={qualidade} interior={interior} />
    </>
  );
}
