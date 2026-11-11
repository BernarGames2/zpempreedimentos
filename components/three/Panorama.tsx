"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Vista real da janela: panorâmica 360° equirretangular de /public/vistas.
 * O centro da imagem deve apontar para onde olha a fachada da frente do prédio.
 */
export function Panorama({ arquivo, giro }: { arquivo: string; giro: number }) {
  const tex = useTexture(arquivo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} rotation={[0, giro - Math.PI / 2, 0]} scale={[-1, 1, 1]} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[380, 48, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Escolhe a panorâmica do andar mais próximo (arquivos "andar-07.jpg", "andar-12.webp"...). */
export function panoramaDoAndar(vistas: string[], andar: number): string | null {
  let melhor: { arquivo: string; dist: number } | null = null;
  for (const v of vistas) {
    const m = /andar-?(\d+)/i.exec(v);
    if (!m) continue;
    const dist = Math.abs(Number(m[1]) - andar);
    if (!melhor || dist < melhor.dist) melhor = { arquivo: v, dist };
  }
  return melhor?.arquivo ?? null;
}
