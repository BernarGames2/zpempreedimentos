"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { poseIntro } from "@/lib/poses";
import { linkInicial, poseCamera, useExp } from "@/lib/store";
import type { Manifesto } from "@/lib/types";
import { dprInicial } from "@/lib/qualidade";
import { Cena } from "./Cena";

/** O Canvas 3D. Pausa quando a aba está oculta ou a experiência saiu da tela. */
export default function Experiencia({ fonte, manifesto }: { fonte: string; manifesto: Manifesto }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(true);
  const [fontePronta, setFontePronta] = useState(false);
  const qualidade = useExp((s) => s.qualidade);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    linkInicial.unidade = p.get("unidade");
    linkInicial.comodo = p.get("comodo");
    const q = p.get("q");
    // Gancho de depuração e dos testes automatizados: /?debug=1 expõe o estado.
    if (p.get("debug") === "1") Object.assign(window, { __zp: useExp, __pose: poseCamera });
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const movel = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
    useExp.getState().set({
      carga: 0.35,
      movimentoReduzido: reduzido.matches,
      vistaReal: manifesto.vistas.some((v) => /andar-?\d+/i.test(v)),
      // O cliente não escolhe qualidade: o computador abre no nível alto; o celular, com sombras e
      // pós-processamento mas sem os efeitos que mais pesam na GPU (oclusão em tela, folhas recortadas).
      // Se o 3D caiu por falta de memória (ver webglcontextlost abaixo), a próxima abertura vem no leve.
      ...(q === "alto" || q === "medio" || q === "baixo"
        ? { qualidade: q, qualidadeAuto: false }
        : { qualidade: sessionStorage.getItem("liwo-leve") === "1" ? "baixo" : movel ? "medio" : "alto" }),
    });
    const aoMudar = () => useExp.getState().set({ movimentoReduzido: reduzido.matches });
    reduzido.addEventListener("change", aoMudar);
    // O letreiro é desenhado em canvas: a fonte precisa estar carregada antes.
    let vivo = true;
    const soltar = () => {
      if (vivo) {
        setFontePronta(true);
        useExp.getState().set({ carga: 0.55 });
      }
    };
    Promise.all([document.fonts.load(`300 100px ${fonte}`), document.fonts.load(`500 100px ${fonte}`)]).then(soltar, soltar);
    const limite = window.setTimeout(soltar, 2500);
    return () => {
      vivo = false;
      window.clearTimeout(limite);
      reduzido.removeEventListener("change", aoMudar);
    };
  }, [fonte, manifesto]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let naTela = true;
    const atualizar = () => setAtivo(naTela && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      naTela = e?.isIntersecting ?? true;
      atualizar();
    }, { threshold: 0.02 });
    io.observe(el);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, []);

  const intro = poseIntro();

  return (
    <div ref={caixa} className="absolute inset-0" data-testid="canvas-3d">
      {fontePronta && (
        <Canvas
          frameloop={ativo ? "always" : "never"}
          dpr={dprInicial()}
          performance={{ min: 0.6 }}
          shadows={qualidade === "baixo" ? false : { type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false, alpha: false }}
          camera={{ fov: intro.fov, near: 0.1, far: 1200, position: intro.pos.toArray() }}
          onCreated={({ gl, scene }) => {
            const debug = new URLSearchParams(window.location.search).get("debug") === "1";
            if (debug) Object.assign(window, { __cena: scene, __gl: gl });
            // conferir erros de cada shader custa tempo de compilação (recomendação do three.js para produção)
            gl.debug.checkShaderErrors = debug;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.setClearColor("#0a1a4a");
            // sem memória de vídeo o navegador derruba o 3D e a tela congela na última imagem: avisa e
            // deixa recarregar no nível leve
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              try {
                sessionStorage.setItem("liwo-leve", "1");
              } catch {
                // sem sessionStorage (modo privado antigo): recarrega no mesmo nível
              }
              useExp.getState().set({ contextoPerdido: true });
            });
            useExp.getState().set({ carga: 0.7 });
          }}
          style={{ touchAction: "none" }}
        >
          <Cena fonte={fonte} manifesto={manifesto} />
        </Canvas>
      )}
    </div>
  );
}
