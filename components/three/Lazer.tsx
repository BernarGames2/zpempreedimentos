"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { lazeres } from "@/lib/dados";
import { useExp } from "@/lib/store";

/**
 * Espaços de lazer do 5º pavimento, nas posições da planta oficial. Só os espaços abertos
 * ganham volume (água da piscina, quadra e piso do playground); os fechados aparecem como
 * pontos clicáveis, e o cartão mostra a imagem oficial de cada um.
 */
export function Lazer({ artificial }: { artificial: number }) {
  const estado = useExp((s) => s.estado);
  const sel = useExp((s) => s.lazerSel);
  const emVoo = useExp((s) => s.emVoo);
  const abrir = useExp((s) => s.abrirLazer);
  const itens = useMemo(() => lazeres().filter((l) => !l.sem3d), []);
  const mats = useMemo(
    () => ({
      agua: new THREE.MeshStandardMaterial({ color: "#3cb6d0", emissive: "#1c9fc4", emissiveIntensity: 0.6, roughness: 0.06, metalness: 0.2 }),
      quadra: new THREE.MeshStandardMaterial({ color: "#3b5d8c", roughness: 0.85 }),
      quadraBorda: new THREE.MeshStandardMaterial({ color: "#3f7a52", roughness: 0.9 }),
      playground: new THREE.MeshStandardMaterial({ color: "#d9a35f", roughness: 0.95 }),
      linha: new THREE.MeshBasicMaterial({ color: "#f3f1ec" }),
    }),
    [],
  );
  mats.agua.emissiveIntensity = 0.25 + 0.6 * artificial;
  const visivel = estado === "PREDIO" || estado === "LAZER";

  return (
    <group name="lazer">
      {itens.map((l) => {
        const [x, y, z] = l.posicao;
        const [w, h, d] = l.tamanho;
        const ativo = sel === l.id;
        return (
          <group key={l.id} name={`lazer_${l.id}`} position={[x, y, z]}>
            {l.id === "piscina" && (
              <mesh position={[0, 0.38, 0]} material={mats.agua} receiveShadow>
                <boxGeometry args={[w, 0.06, d]} />
              </mesh>
            )}
            {l.id === "quadra" && (
              <>
                <mesh position={[0, 0.39, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.quadraBorda} receiveShadow>
                  <planeGeometry args={[w + 1, d + 1]} />
                </mesh>
                <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.quadra} receiveShadow>
                  <planeGeometry args={[w * 0.82, d * 0.9]} />
                </mesh>
                <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.linha}>
                  <planeGeometry args={[w * 0.82, 0.06]} />
                </mesh>
              </>
            )}
            {l.id === "playground" && (
              <mesh position={[0, 0.39, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.playground} receiveShadow>
                <planeGeometry args={[w, d]} />
              </mesh>
            )}
            {visivel && (
              <Html position={[0, Math.max(h, 0.5) + 0.9, 0]} center zIndexRange={[15, 5]}>
                <button
                  type="button"
                  disabled={emVoo}
                  onClick={() => abrir(l.id)}
                  aria-label={`Ver ${l.nome}`}
                  data-testid={`lazer-${l.id}`}
                  className="group relative flex h-11 w-11 items-center justify-center"
                >
                  <span className={`pulso relative block h-3.5 w-3.5 rounded-full border-2 border-white ${ativo ? "bg-white" : "bg-ambar"} shadow-lg`} />
                  <span className={`vidro pointer-events-none absolute bottom-full mb-0.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium text-texto ${estado === "LAZER" ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                    {l.nome}
                  </span>
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
