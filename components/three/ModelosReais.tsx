"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { emp } from "@/lib/dados";
import { CORTE } from "@/lib/procedural/planta";
import { geosReais, type GeoUnidade } from "@/lib/procedural/predio";

function caixaDe(b: THREE.Box3) {
  const c = b.getCenter(new THREE.Vector3());
  const t = b.getSize(new THREE.Vector3());
  return { centro: c.toArray() as [number, number, number], tamanho: t.toArray() as [number, number, number] };
}

/**
 * Modelo real do prédio (/public/models/predio.glb), no lugar do procedural.
 * Convenção de nomes: `unidade_1201` (uma malha por unidade, clicável) e `lazer_piscina`.
 * O modelo deve estar em metros, com o térreo em y = 0 e o centro da torre na origem.
 */
export function PredioReal({ arquivo, aoLer }: { arquivo: string; aoLer: () => void }) {
  const { scene } = useGLTF(arquivo, false, true);

  useEffect(() => {
    scene.updateMatrixWorld(true);
    const centro = new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3());
    const novos = new Map<string, GeoUnidade>();
    scene.traverse((o) => {
      const m = /^unidade_(\w+)$/i.exec(o.name);
      const malha = o as THREE.Mesh;
      if (malha.isMesh) {
        malha.castShadow = true;
        malha.receiveShadow = true;
      }
      if (!m || !emp.unidades.some((u) => u.numero === m[1])) return;
      const b = new THREE.Box3().setFromObject(o);
      const c = b.getCenter(new THREE.Vector3());
      // normal da fachada: eixo dominante do centro da torre até a unidade
      const dx = c.x - centro.x;
      const dz = c.z - centro.z;
      const normal: [number, number, number] = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0, 0] : [0, 0, Math.sign(dz)];
      const t = b.getSize(new THREE.Vector3());
      const sacada: [number, number, number] = [c.x + (normal[0] * t.x) / 2, b.min.y + 1.25, c.z + (normal[2] * t.z) / 2];
      const env = caixaDe(b.clone().expandByScalar(0.1));
      novos.set(m[1] as string, { numero: m[1] as string, caixas: [env], envolvente: env, sacada, normal, rotY: Math.atan2(normal[0], normal[2]) });
    });
    geosReais.clear();
    novos.forEach((g, k) => geosReais.set(k, g));
    aoLer();
    return () => {
      geosReais.clear();
      aoLer();
    };
  }, [scene, aoLer]);

  return <primitive object={scene} />;
}

/**
 * Modelo real do apartamento (/public/models/apto-[tipo].glb), no lugar do procedural.
 * Convenção: `teto_*` some na maquete; as paredes são cortadas a 1,20 m por um plano de corte.
 * A planta do JSON continua valendo para a colisão, as abas e o minimapa.
 */
export function ApartamentoReal({ arquivo, corte, oculto }: { arquivo: string; corte: boolean; oculto: boolean }) {
  const { scene } = useGLTF(arquivo, false, true);
  const gl = useThree((s) => s.gl);
  const plano = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), CORTE), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
    scene.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (/^teto_/i.test(o.name)) o.visible = !corte;
      if (!malha.isMesh) return;
      malha.castShadow = true;
      malha.receiveShadow = true;
      for (const mat of Array.isArray(malha.material) ? malha.material : [malha.material]) {
        mat.clippingPlanes = corte ? [plano] : null;
        mat.clipShadows = true;
        mat.needsUpdate = true;
      }
    });
  }, [scene, corte, gl, plano]);

  return <primitive object={scene} visible={!oculto} />;
}
