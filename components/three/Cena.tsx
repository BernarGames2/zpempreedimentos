"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ambiente } from "@/lib/ambiente";
import { tipoDe, unidade } from "@/lib/dados";
import { geoUnidade } from "@/lib/procedural/predio";
import { emp } from "@/lib/dados";
import { resolverTodos, splatsDoTipo } from "@/lib/splats";
import { useExp } from "@/lib/store";
import type { Manifesto } from "@/lib/types";
import { Camera } from "./Camera";
import { Ceu } from "./Ceu";
import { Efeitos } from "./Efeitos";
import { Lazer } from "./Lazer";
import { Luzes } from "./Luzes";
import { Panorama, panoramaDoAndar } from "./Panorama";
import { Passeio } from "./Passeio";
import { Predio } from "./Predio";
import { Unidades } from "./Unidades";

// O interior entra em um chunk separado, baixado quando uma unidade é escolhida.
const Interior = lazy(() => import("./Interior").then((m) => ({ default: m.Interior })));

const SplatComodo = lazy(() => import("./SplatComodo").then((m) => ({ default: m.SplatComodo })));

const PredioReal = lazy(() => import("./ModelosReais").then((m) => ({ default: m.PredioReal })));
const ApartamentoReal = lazy(() => import("./ModelosReais").then((m) => ({ default: m.ApartamentoReal })));

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
  const estado = useExp((s) => s.estado);
  const emVoo = useExp((s) => s.emVoo);
  const gl = useThree((s) => s.gl);

  const amb = useMemo(() => ambiente(hora, noite), [hora, noite]);
  const hdri = useMemo(() => escolherHdri(manifesto), [manifesto]);
  const interior = cena === "interior";
  const u = unidade(unidadeSel);
  const geo = useMemo(() => (u ? geoUnidade(u, emp) : null), [u]);
  const tipo = u ? tipoDe(u) : null;
  const comodoAtual = useExp((s) => s.comodoAtual);
  // Modelos reais do arquiteto, se existirem em /public/models.
  const predioReal = manifesto.modelos.find((f) => /\/models\/predio\.glb$/i.test(f));
  const aptoReal = tipo ? manifesto.modelos.find((f) => f.toLowerCase() === `/models/apto-${tipo.id}.glb`) : undefined;
  const [versaoModelo, setVersaoModelo] = useState(0);
  const aoLerModelo = useCallback(() => setVersaoModelo((v) => v + 1), []);
  const [splatOk, setSplatOk] = useState(false);

  // Splats: arquivo mais leve fora do nível alto (celular); o mais completo no nível alto.
  const splats = useMemo(() => (tipo ? resolverTodos(tipo, manifesto, qualidade !== "alto") : {}), [tipo, manifesto, qualidade]);
  useEffect(() => {
    splatsDoTipo.atual = splats;
  }, [splats]);
  const comodoObj = tipo?.comodos.find((c) => c.id === comodoAtual);
  const splat = estado === "PASSEIO" && interior && comodoObj ? splats[comodoObj.id] : undefined;
  const comSplat = Boolean(splat) && splatOk;
  useEffect(() => {
    if (!splat) setSplatOk(false);
  }, [splat]);
  useEffect(() => {
    useExp.getState().set({ usandoSplat: comSplat });
  }, [comSplat]);
  // Pré-carrega os outros mundos (cache HTTP) para a troca entre cômodos ser rápida.
  useEffect(() => {
    if (estado !== "PASSEIO") return;
    const urls = new Set(Object.values(splats).map((x) => x?.url).filter((x): x is string => Boolean(x)));
    urls.forEach((url) => void fetch(url, { priority: "low" } as RequestInit).catch(() => undefined));
  }, [estado, splats]);
  // No interior a cena fica no referencial da planta: o céu e o sol giram no sentido contrário.
  const giro = interior && geo ? -geo.rotY : 0;
  const solCena = useMemo(() => amb.solDir.clone().applyAxisAngle(EIXO_Y, giro), [amb, giro]);
  const altura = geo ? geo.sacada[1] : 30;
  const pano = u ? panoramaDoAndar(manifesto.vistas, u.andar) : null;

  useEffect(() => {
    gl.shadowMap.autoUpdate = true;
  }, [gl]);

  return (
    <>
      <Camera />
      {/* Dentro de um splat o céu procedural sai de cena: o mundo capturado já traz o próprio fundo. */}
      {!comSplat && (!pano || !(interior || estado === "VISTA")) && <Ceu solDir={solCena} noite={amb.noite} altura={interior ? altura : 30} giro={0} />}
      {pano && !comSplat && (interior || estado === "VISTA") && (
        <Suspense fallback={null}>
          <Panorama arquivo={pano} giro={giro} />
        </Suspense>
      )}
      {/* Qualidade automática: desce um nível se o aparelho não acompanha, sobe se sobra folga. */}
      <PerformanceMonitor
        bounds={(taxa) => (taxa > 90 ? [50, 100] : [38, 58])}
        flipflops={3}
        onDecline={() => {
          const s = useExp.getState();
          if (s.qualidadeAuto && s.qualidade !== "baixo") s.set({ qualidade: s.qualidade === "alto" ? "medio" : "baixo" });
        }}
        onIncline={() => {
          const s = useExp.getState();
          if (s.qualidadeAuto && s.qualidade !== "alto") s.set({ qualidade: s.qualidade === "baixo" ? "medio" : "alto" });
        }}
      />
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
          {/* Um predio.glb com malhas bem nomeadas substitui a torre procedural. */}
          <Predio fonte={fonte} artificial={amb.artificial} semTorre={Boolean(predioReal)} />
          {predioReal && <PredioReal arquivo={predioReal} aoLer={aoLerModelo} />}
          <Unidades key={versaoModelo} versao={versaoModelo} />
          <Lazer artificial={amb.artificial} />
        </group>
        <Pronto />
      </Suspense>
      {tipo && (
        <Suspense fallback={null}>
          <group visible={interior}>
            {aptoReal ? (
              <ApartamentoReal arquivo={aptoReal} corte={estado !== "PASSEIO"} oculto={comSplat} />
            ) : (
              <Interior tipo={tipo} corte={estado !== "PASSEIO"} artificial={Math.max(amb.artificial, 0.35)} fonte={fonte} oculto={comSplat} />
            )}
          </group>
          {splat && comodoObj && <SplatComodo key={splat.url} comodo={comodoObj} splat={splat} aoCarregar={setSplatOk} />}
          <Passeio tipo={tipo} ativo={estado === "PASSEIO" && interior && !emVoo} />
          <Passeio tipo={tipo} soOlhar ativo={estado === "VISTA" && !emVoo} />
        </Suspense>
      )}
      {/* A luz dos splats já vem assada: sem pós-processamento dentro deles. */}
      {!comSplat && <Efeitos qualidade={qualidade} interior={interior} />}
    </>
  );
}
