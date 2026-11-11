"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { lazeres } from "@/lib/dados";
import { useExp } from "@/lib/store";

/**
 * Pontos de lazer do térreo e da cobertura. Sem modelo real, cada espaço aparece como um
 * volume envidraçado com luz quente (o cartão avisa: "Imagem ilustrativa").
 */
export function Lazer({ artificial }: { artificial: number }) {
  const estado = useExp((s) => s.estado);
  const sel = useExp((s) => s.lazerSel);
  const emVoo = useExp((s) => s.emVoo);
  const abrir = useExp((s) => s.abrirLazer);
  const itens = useMemo(() => lazeres(), []);
  const vidro = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffd9a6", emissive: "#ffb866", emissiveIntensity: 0.5, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.2, depthWrite: false }), []);
  const agua = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2fb8d8", emissive: "#1c9fc4", emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.2 }), []);
  const arestas = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  vidro.emissiveIntensity = 0.15 + 0.55 * artificial;
  const visivel = estado === "PREDIO" || estado === "LAZER";

  return (
    <group name="lazer">
      {itens.map((l) => {
        const [x, y, z] = l.posicao;
        const [w, h, d] = l.tamanho;
        const piscina = l.id.includes("piscina");
        const ativo = sel === l.id;
        return (
          <group key={l.id} name={`lazer_${l.id}`} position={[x, y + h / 2, z]}>
            {l.local === "cobertura" || l.id !== "coffee-living" ? (
              <>
                <mesh scale={[w, h, d]} material={piscina ? agua : vidro} renderOrder={4}>
                  <boxGeometry />
                </mesh>
                <lineSegments geometry={arestas} scale={[w, h, d]}>
                  <lineBasicMaterial color={ativo ? "#ffe2b0" : "#1b1c20"} />
                </lineSegments>
              </>
            ) : null}
            {visivel && (
              <Html position={[0, h / 2 + 0.6, 0]} center zIndexRange={[15, 5]}>
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
