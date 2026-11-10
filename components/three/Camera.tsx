"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { unidade } from "@/lib/dados";
import { easeInOutCubic } from "@/lib/easing";
import {
  ALVO_PREDIO, AZIMUTE_01, FOV_PREDIO, caminhoEntrada, limitesPlanta, poseComodo, poseIntro, poseLazer,
  poseMaquete, posePredio, poseUnidade, poseVista, type Pose,
} from "@/lib/poses";
import { tipoDe } from "@/lib/dados";
import { linkInicial, useExp, type Estado } from "@/lib/store";

type Modo = "reta" | "orbita" | "curva";
interface Voo {
  de: Pose;
  para: Pose;
  t0: number;
  dur: number;
  modo: Modo;
  curva?: THREE.CatmullRomCurve3;
  aoFim?: () => void;
  /** Fração do voo em que o véu começa a fechar (entrada no apartamento). */
  veuEm?: number;
}

const DENTRO: Estado[] = ["MAQUETE", "PASSEIO"];
const VEU_MS = 420;
const _alvo = new THREE.Vector3();

function anguloCurto(a: number, b: number, k: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

/** Controla a câmera conforme o estado: voos suaves, órbita com limites e cortes com véu. */
export function Camera() {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const orbita = useRef<OrbitImpl>(null);
  const voo = useRef<Voo | null>(null);
  const alvoAtual = useRef(new THREE.Vector3().copy(poseIntro().alvo));
  const ficha = useRef(0);
  const anterior = useRef<Estado>("INTRO");
  const introFeita = useRef(false);
  const girando = useRef(true);

  const estado = useExp((s) => s.estado);
  const unidadeSel = useExp((s) => s.unidadeSel);
  const lazerSel = useExp((s) => s.lazerSel);
  const pronto = useExp((s) => s.pronto);
  const aspecto = size.width / Math.max(1, size.height);

  const aplicar = useCallback(
    (p: Pose) => {
      camera.position.copy(p.pos);
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
      alvoAtual.current.copy(p.alvo);
      camera.lookAt(p.alvo);
      invalidate();
    },
    [camera, invalidate],
  );

  const poseAtual = useCallback((): Pose => ({ pos: camera.position.clone(), alvo: alvoAtual.current.clone(), fov: camera.fov }), [camera]);

  /** Liga a órbita certa para o estado, já com o alvo e os limites. */
  const configurarOrbita = useCallback((e: Estado) => {
    const o = orbita.current;
    if (!o) return;
    const s = useExp.getState();
    if (e === "PREDIO") {
      o.target.copy(ALVO_PREDIO);
      o.minDistance = 36;
      o.maxDistance = 125;
      o.minPolarAngle = 0.32;
      o.maxPolarAngle = 1.9;
      o.autoRotate = false;
      o.enabled = true;
    } else if (e === "MAQUETE") {
      const u = unidade(s.unidadeSel);
      if (u) {
        const l = limitesPlanta(tipoDe(u));
        o.target.set(l.cx, 0.3, l.cz);
      }
      o.minDistance = 5;
      o.maxDistance = 24;
      o.minPolarAngle = 0.15;
      o.maxPolarAngle = 1.18;
      o.autoRotate = girando.current && !s.movimentoReduzido;
      o.autoRotateSpeed = 0.55;
      o.enabled = true;
    } else {
      o.enabled = false;
      o.autoRotate = false;
    }
    if (o.enabled) {
      alvoAtual.current.copy(o.target);
      o.update();
    }
  }, []);

  const voar = useCallback(
    (para: Pose, dur: number, modo: Modo, extra: Partial<Voo> = {}) => {
      const s = useExp.getState();
      if (orbita.current) orbita.current.enabled = false;
      if (s.movimentoReduzido && !extra.curva) {
        // Movimento reduzido: corte com fade no lugar do voo.
        const f = ++ficha.current;
        s.set({ veu: true, emVoo: true });
        window.setTimeout(() => {
          if (f !== ficha.current) return;
          aplicar(para);
          useExp.getState().set({ veu: false, emVoo: false });
          extra.aoFim?.();
        }, 220);
        return;
      }
      voo.current = { de: poseAtual(), para, t0: performance.now(), dur: dur * 1000, modo, ...extra };
      s.set({ emVoo: true });
      invalidate();
    },
    [aplicar, invalidate, poseAtual],
  );

  /** Corte com véu: troca a cena com a tela coberta e reabre já na pose nova. */
  const cortar = useCallback(
    (cena: "exterior" | "interior", depois: () => void) => {
      const f = ++ficha.current;
      voo.current = null;
      if (orbita.current) orbita.current.enabled = false;
      useExp.getState().set({ veu: true, emVoo: true });
      window.setTimeout(() => {
        if (f !== ficha.current) return;
        useExp.getState().set({ cena });
        depois();
        window.setTimeout(() => {
          if (f === ficha.current) useExp.getState().set({ veu: false });
        }, 120);
      }, VEU_MS);
    },
    [],
  );

  // Pose inicial: portaria (render 02).
  useEffect(() => {
    aplicar(poseIntro());
  }, [aplicar]);

  // Introdução: subida cinematográfica de 4 s até a vista de esquina (render 01).
  useEffect(() => {
    if (!pronto || introFeita.current || estado !== "INTRO") return;
    introFeita.current = true;
    const s = useExp.getState();
    // link direto ou movimento reduzido: sem a subida cinematográfica
    if (s.movimentoReduzido || unidade(linkInicial.unidade)) {
      s.pularIntro();
      return;
    }
    voar(posePredio(aspecto), 4, "orbita", { aoFim: () => useExp.getState().pularIntro() });
  }, [pronto, estado, aspecto, voar]);

  // Reação às mudanças de estado.
  useEffect(() => {
    const de = anterior.current;
    anterior.current = estado;
    const s = useExp.getState();
    const u = unidade(s.unidadeSel);
    const dentro = DENTRO.includes(estado);
    const fim = (e: Estado) => () => {
      configurarOrbita(e);
      useExp.getState().set({ emVoo: false });
    };

    if (estado === "INTRO") return;

    if (estado === "ENTRANDO" && u) {
      const c = caminhoEntrada(u);
      const curva = new THREE.CatmullRomCurve3([camera.position.clone(), c.antes, c.dentro], false, "centripetal");
      const f = ++ficha.current;
      voar({ pos: c.dentro, alvo: c.alvo, fov: 60 }, 2.6, "curva", {
        curva,
        veuEm: 0.72,
        aoFim: () => {
          window.setTimeout(() => {
            if (f !== ficha.current) return;
            useExp.getState().transicionar("MAQUETE");
          }, 140);
        },
      });
      return;
    }

    // Troca entre exterior e interior: sempre com o véu fechado.
    if (dentro !== (s.cena === "interior")) {
      if (dentro && u) {
        const destino = estado === "MAQUETE" ? poseMaquete(u, aspecto) : poseComodo(u, s.comodo);
        const abrir = () => {
          if (estado === "MAQUETE") {
            // chega um pouco mais alto e assenta na vista isométrica
            const alto = { ...destino, pos: destino.pos.clone().add(new THREE.Vector3(-1.5, 4, 3)) };
            aplicar(alto);
            voar(destino, 1.5, "reta", { aoFim: fim("MAQUETE") });
          } else {
            aplicar(destino);
            fim("PASSEIO")();
          }
        };
        if (s.veu) {
          // já viemos do voo de entrada com o véu fechado
          const f = ++ficha.current;
          window.setTimeout(() => {
            if (f !== ficha.current) return;
            useExp.getState().set({ cena: "interior" });
            abrir();
            window.setTimeout(() => useExp.getState().set({ veu: false }), 160);
          }, 260);
        } else cortar("interior", abrir);
      } else {
        cortar("exterior", () => {
          if (estado === "UNIDADE" && u) {
            const c = caminhoEntrada(u);
            aplicar({ pos: c.antes, alvo: c.alvo, fov: 50 });
            voar(poseUnidade(u, aspecto), 1.6, "reta", { aoFim: fim("UNIDADE") });
          } else {
            const az = u ? Math.atan2(c0(u).x, c0(u).z) : AZIMUTE_01;
            aplicar(posePredio(aspecto, az));
            fim(estado)();
          }
        });
      }
      return;
    }

    switch (estado) {
      case "PREDIO": {
        if (de === "INTRO") {
          // introdução pulada ou concluída
          const noLugar = camera.position.distanceTo(posePredio(aspecto).pos) < 0.5;
          if (noLugar) fim("PREDIO")();
          else voar(posePredio(aspecto), 1.4, "orbita", { aoFim: fim("PREDIO") });
        } else {
          const az = Math.atan2(camera.position.x, camera.position.z);
          voar(posePredio(aspecto, az), 1.6, "orbita", { aoFim: fim("PREDIO") });
        }
        break;
      }
      case "UNIDADE":
        if (u) voar(poseUnidade(u, aspecto), de === "UNIDADE" ? 1.2 : 1.8, de === "VISTA" ? "reta" : "orbita", { aoFim: fim("UNIDADE") });
        break;
      case "VISTA":
        if (u) voar(poseVista(u), 1.8, "reta", { aoFim: fim("VISTA") });
        break;
      case "LAZER":
        voar(poseLazer(s.lazerSel, aspecto), 2, "orbita", { aoFim: fim("LAZER") });
        break;
      case "MAQUETE":
        if (u) voar(poseMaquete(u, aspecto), 1.4, "reta", { aoFim: fim("MAQUETE") });
        break;
      case "PASSEIO":
        if (u) voar(poseComodo(u, s.comodo), 1.6, "reta", { aoFim: fim("PASSEIO") });
        break;
      default:
        break;
    }
    // `aspecto` fica de fora de propósito: girar o aparelho não deve refazer o voo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, unidadeSel, lazerSel]);

  // A maquete para de girar sozinha no primeiro toque.
  useEffect(() => {
    const o = orbita.current;
    if (!o) return;
    const parar = () => {
      if (useExp.getState().estado === "MAQUETE") {
        girando.current = false;
        o.autoRotate = false;
      }
    };
    o.addEventListener("start", parar);
    return () => o.removeEventListener("start", parar);
  }, []);

  useFrame(() => {
    const v = voo.current;
    const o = orbita.current;
    if (v) {
      const bruto = Math.min(1, (performance.now() - v.t0) / v.dur);
      const k = easeInOutCubic(bruto);
      if (v.modo === "curva" && v.curva) {
        v.curva.getPoint(k, camera.position);
      } else if (v.modo === "orbita") {
        // interpola em volta do eixo da torre, para o voo não atravessar o prédio
        const r0 = Math.hypot(v.de.pos.x, v.de.pos.z);
        const r1 = Math.hypot(v.para.pos.x, v.para.pos.z);
        const a = anguloCurto(Math.atan2(v.de.pos.x, v.de.pos.z), Math.atan2(v.para.pos.x, v.para.pos.z), k);
        const r = THREE.MathUtils.lerp(r0, r1, k);
        camera.position.set(Math.sin(a) * r, THREE.MathUtils.lerp(v.de.pos.y, v.para.pos.y, k), Math.cos(a) * r);
      } else {
        camera.position.lerpVectors(v.de.pos, v.para.pos, k);
      }
      _alvo.lerpVectors(v.de.alvo, v.para.alvo, k);
      alvoAtual.current.copy(_alvo);
      camera.fov = THREE.MathUtils.lerp(v.de.fov, v.para.fov, k);
      camera.updateProjectionMatrix();
      camera.lookAt(_alvo);
      if (v.veuEm !== undefined && bruto >= v.veuEm && !useExp.getState().veu) useExp.getState().set({ veu: true });
      if (bruto >= 1) {
        voo.current = null;
        v.aoFim?.();
      }
      return;
    }
    if (o?.enabled) {
      if (useExp.getState().estado === "PREDIO") {
        // a câmera nunca desce abaixo de 1,3 m do chão
        const d = camera.position.distanceTo(o.target);
        o.maxPolarAngle = Math.PI / 2 + Math.asin(Math.min(0.95, (o.target.y - 1.3) / d));
      }
      alvoAtual.current.copy(o.target);
    }
  });

  return (
    <OrbitControls
      ref={orbita}
      makeDefault
      enabled={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
    />
  );
}

/** Centro da sacada da unidade (para voltar ao prédio no mesmo lado da torre). */
function c0(u: NonNullable<ReturnType<typeof unidade>>): THREE.Vector3 {
  return poseUnidade(u, 1.6).pos;
}

export { FOV_PREDIO };
