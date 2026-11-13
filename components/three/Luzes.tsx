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

/**
 * Céu dos reflexos do lado de fora: degradê do zênite azul ao horizonte claro e o chão quente embaixo (é o
 * que o vidro, o metal e a luz ambiente "veem"). Antes era um fundo azul chapado com um painel branco em
 * cima: o vidro refletia uma cor só e a sombra ficava fria.
 */
function CeuReflexo({ noite }: { noite: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uZen: { value: new THREE.Color(noite ? "#0b1a3e" : "#3c6bb2") },
          uHor: { value: new THREE.Color(noite ? "#3b4566" : "#e6e3dc") },
          uChao: { value: new THREE.Color(noite ? "#17181c" : "#85745b") },
          uForca: { value: noite ? 1.1 : 1.35 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uZen;
          uniform vec3 uHor;
          uniform vec3 uChao;
          uniform float uForca;
          varying vec3 vDir;
          void main() {
            float y = normalize(vDir).y;
            vec3 c = y > 0.0 ? mix(uHor, uZen, pow(y, 0.55)) : mix(uHor * 0.8, uChao, clamp(-y * 5.0, 0.0, 1.0));
            gl_FragColor = vec4(c * uForca, 1.0);
          }`,
      }),
    [noite],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} scale={60}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
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
  // as texturas pintadas por código saíam ~4x mais escuras que a cor escolhida (bug de espaço de cor, corrigido):
  // a luz da noite e o ambiente do dia, que compensavam isso, baixaram; o sol ficou um pouco mais forte
  const intensidade = noite ? (interior ? 0.25 : 1.0) : 0.6 + 2.0 * Math.min(1, sen * 1.6);
  const mapa = qualidade === "alto" ? 2048 : 1024;
  void interior;

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
    // por dentro, o chão claro devolve muita luz para o forro e as paredes (renders: ambiente claro e arejado)
    scene.environmentIntensity = noite ? (interior ? 0.6 : 0.5) : interior ? 0.62 : 0.9;
    scene.environmentRotation.set(0, giro, 0);
  }, [scene, noite, interior, giro]);

  // O HDRI de amanhecer tingia o dia de rosa; de dia e por dentro os reflexos vêm de um ambiente neutro gerado aqui.
  // O HDRI noturno pesava 1,5 MB (metade do primeiro carregamento) só para os reflexos: o ambiente gerado
  // aqui embaixo faz o mesmo papel sem baixar nada.
  const arquivo = undefined as string | undefined;
  void hdri;

  return (
    <>
      {/* de dia o céu é menos azul e o chão devolve luz quente (as sombras ficavam frias, puxando para o roxo no bronze) */}
      <hemisphereLight args={[noite ? (interior ? "#f3e6d8" : "#b4c8f5") : interior ? "#fbf7f0" : "#dde4ea", noite ? (interior ? "#7a7064" : "#4a5068") : interior ? "#cdc4b5" : "#8a7a62", noite ? (interior ? 0.8 : 1.0) : interior ? 0.95 : 0.42]} />
      <directionalLight
        ref={luz}
        color={noite ? "#dfe8ff" : corSol}
        intensity={intensidade}
        // ligar/desligar a sombra muda a chave de todos os shaders (recompila a cena): fica fixa por nível
        castShadow={qualidade !== "baixo"}
        shadow-mapSize={[mapa, mapa]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      {arquivo ? (
        <Environment files={arquivo} />
      ) : (
        // mesma resolução dentro e fora: o tamanho do mapa de reflexos entra na chave dos shaders, e trocar
        // 64 por 128 ao entrar no apartamento recompilava todos os materiais da cena
        <Environment key={`${interior}-${noite}`} resolution={128} frames={1}>
          {interior && (
            <>
              {/* sala neutra e quente: forro claro, piso bege e duas "janelas" (reflexos de interior, não de céu aberto) */}
              <color attach="background" args={[noite ? "#3b352e" : "#8b8479"]} />
              <Lightformer form="rect" intensity={noite ? 1.7 : 2.2} color="#fff1dc" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
              <Lightformer form="rect" intensity={noite ? 0.5 : 5} color={noite ? "#5a78b8" : "#eef5ff"} position={[0, 1, 8]} scale={[7, 4, 1]} />
              <Lightformer form="rect" intensity={noite ? 0.3 : 2.5} color={noite ? "#5a78b8" : "#eef5ff"} position={[-8, 1, 0]} rotation-y={Math.PI / 2} scale={[5, 3, 1]} />
              <Lightformer form="rect" intensity={0.8} color="#c9b79a" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
            </>
          )}
          {!interior && <CeuReflexo noite={noite} />}
        </Environment>
      )}
    </>
  );
}
