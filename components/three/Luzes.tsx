"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Ambiente } from "@/lib/ambiente";
import type { Qualidade } from "@/lib/store";

interface Props {
  amb: Ambiente;
  qualidade: Qualidade;
  /** HDRIs encontrados em /public/hdri (noite/fim de tarde e dia). */
  hdri: { noite?: string; dia?: string };
  /** Centro e raio da área que recebe sombra. */
  foco: [number, number, number];
  raio: number;
  /** Giro em Y aplicado ao sol (referencial da planta do apartamento). */
  giro?: number;
  interior?: boolean;
}

/** Sol/luz de céu, luz hemisférica e mapa de ambiente para reflexos. */
export function Luzes({ amb, qualidade, hdri, foco, raio, giro = 0, interior = false }: Props) {
  const luz = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const noite = amb.noite > 0.5;

  const dir = useMemo(() => {
    // À noite, uma luz fria vinda da frente-esquerda dá volume à torre, como no render 01.
    const d = noite ? new THREE.Vector3(-0.42, 0.62, 0.66).normalize() : amb.solDir.clone();
    return d.applyAxisAngle(new THREE.Vector3(0, 1, 0), giro);
  }, [amb, noite, giro]);

  const sen = Math.max(0, amb.solDir.y);
  const corSol = useMemo(() => new THREE.Color("#fff4e2").lerp(new THREE.Color("#ffb070"), Math.max(0, 1 - sen / 0.35)), [sen]);
  const intensidade = noite ? (interior ? 0.25 : 2.6) : 0.6 + 3.0 * Math.min(1, sen * 1.6);
  const mapa = qualidade === "alto" ? 2048 : 1024;

  useEffect(() => {
    const l = luz.current;
    if (!l) return;
    l.position.set(foco[0] + dir.x * raio * 2.2, foco[1] + dir.y * raio * 2.2, foco[2] + dir.z * raio * 2.2);
    l.target.position.set(...foco);
    l.target.updateMatrixWorld();
    const c = l.shadow.camera;
    c.left = c.bottom = -raio;
    c.right = c.top = raio;
    c.near = 1;
    c.far = raio * 4.6;
    c.updateProjectionMatrix();
    l.shadow.needsUpdate = true;
    invalidate();
  }, [dir, foco, raio, invalidate]);

  useEffect(() => {
    scene.environmentIntensity = noite ? (interior ? 0.9 : 0.6) : 0.9;
    scene.environmentRotation.set(0, giro, 0);
  }, [scene, noite, interior, giro]);

  const arquivo = noite ? hdri.noite : (hdri.dia ?? hdri.noite);

  return (
    <>
      <hemisphereLight args={[noite ? (interior ? "#f3e6d8" : "#b4c8f5") : "#cfe2ff", noite ? (interior ? "#5c5650" : "#4a5068") : "#6b6a66", noite ? (interior ? 1.15 : 2.9) : interior ? 1.4 : 0.85]} />
      <directionalLight
        ref={luz}
        color={noite ? "#dfe8ff" : corSol}
        intensity={intensidade}
        castShadow={qualidade !== "baixo"}
        shadow-mapSize={[mapa, mapa]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      {arquivo ? (
        <Environment files={arquivo} />
      ) : (
        <Environment resolution={64} frames={1}>
          <color attach="background" args={[noite ? "#0d2a78" : "#8fbdf0"]} />
          <Lightformer form="rect" intensity={noite ? 1.2 : 3} color={noite ? "#4f86e0" : "#ffffff"} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
          <Lightformer form="rect" intensity={noite ? 0.8 : 1.5} color="#ffc98a" position={[0, -4, 6]} scale={[14, 3, 1]} />
        </Environment>
      )}
    </>
  );
}
