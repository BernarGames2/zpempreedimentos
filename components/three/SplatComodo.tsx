"use client";

import { useThree } from "@react-three/fiber";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";
import type { SplatResolvido } from "@/lib/splats";
import { useExp } from "@/lib/store";
import type { Comodo } from "@/lib/types";
import { colisorSplat } from "./Passeio";

const RAD = Math.PI / 180;

function aplicarTransform(o: THREE.Object3D, c: Comodo): void {
  const t = c.splatTransform ?? { posicao: [0, 0, 0] as [number, number, number], rotacaoY: 0, escala: 1 };
  o.position.set(...t.posicao);
  // Os .spz do Marble vêm no padrão OpenCV (Y para baixo): 180° em X coloca a cena em pé.
  o.rotation.set((t.rotacaoX ?? 180) * RAD, t.rotacaoY * RAD, 0, "YXZ");
  o.scale.setScalar(t.escala);
  o.updateMatrixWorld(true);
}

/**
 * Interior fotorrealista em Gaussian Splatting (Spark): um mundo por cômodo, com o colisor
 * invisível do Marble e a "área segura" que limita a câmera à parte bem reconstruída.
 */
export function SplatComodo({ comodo, splat, aoCarregar }: { comodo: Comodo; splat: SplatResolvido; aoCarregar: (ok: boolean) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const avisar = useRef(aoCarregar);
  avisar.current = aoCarregar;
  // Sala e cozinha dividem o mesmo mundo: só recarrega se o arquivo ou a transformação mudarem.
  const ref = useRef(comodo);
  ref.current = comodo;
  const chave = `${splat.url}|${splat.colisor ?? ""}|${JSON.stringify(comodo.splatTransform ?? null)}`;

  // Um único SparkRenderer por cena.
  useEffect(() => {
    const spark = new SparkRenderer({ renderer: gl, onDirty: () => invalidate() });
    scene.add(spark);
    return () => {
      scene.remove(spark);
      spark.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => {
    let vivo = true;
    const comodo = ref.current;
    const malha = new SplatMesh({ url: splat.url });
    aplicarTransform(malha, comodo);
    scene.add(malha);
    malha.initialized.then(
      () => {
        if (!vivo) return;
        avisar.current(true);
        invalidate();
      },
      (erro: unknown) => {
        console.warn(`Não foi possível carregar o splat ${splat.url}; usando a prévia simplificada.`, erro);
        if (vivo) avisar.current(false);
      },
    );

    // Colisor do Marble: malha invisível para a colisão e para limitar a câmera.
    let colisor: THREE.Object3D | null = null;
    if (splat.colisor) {
      new GLTFLoader().load(
        splat.colisor,
        (gltf) => {
          if (!vivo) return;
          colisor = gltf.scene;
          aplicarTransform(colisor, comodo);
          colisor.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            (m.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree = new MeshBVH(m.geometry);
            m.raycast = acceleratedRaycast;
            m.material = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
          });
          scene.add(colisor);
          colisorSplat.malha = colisor;
        },
        undefined,
        () => console.warn(`Colisor ${splat.colisor} não carregou; a câmera fica limitada só pela área segura.`),
      );
    }
    return () => {
      vivo = false;
      scene.remove(malha);
      malha.dispose();
      if (colisor) scene.remove(colisor);
      colisorSplat.malha = null;
      colisorSplat.ativo = false;
      useExp.getState().set({ usandoSplat: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, scene, invalidate]);

  // Área segura do cômodo atual (muda entre sala e cozinha sem recarregar o mundo).
  useEffect(() => {
    const area = comodo.splat?.areaSegura;
    if (!area) return;
    colisorSplat.centro.set(...area.centro);
    colisorSplat.raio = area.raio;
    colisorSplat.ativo = true;
  }, [comodo]);

  return null;
}
