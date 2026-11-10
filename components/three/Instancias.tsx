"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  geometria: THREE.BufferGeometry;
  material: THREE.Material;
  matrizes: THREE.Matrix4[];
  sombra?: boolean;
  recebeSombra?: boolean;
  ordem?: number;
}

/** Um InstancedMesh estático a partir de uma lista de matrizes (uma chamada de desenho). */
export function Instancias({ geometria, material, matrizes, sombra = false, recebeSombra = false, ordem = 0 }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrizes.forEach((mat, i) => m.setMatrixAt(i, mat));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
  }, [matrizes]);
  if (matrizes.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometria, material, matrizes.length]}
      castShadow={sombra}
      receiveShadow={recebeSombra}
      renderOrder={ordem}
      raycast={() => null}
    />
  );
}
