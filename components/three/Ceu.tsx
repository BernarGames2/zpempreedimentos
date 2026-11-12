"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface Props {
  /** Vetor que aponta para o sol, já no referencial da cena. */
  solDir: THREE.Vector3;
  /** 1 = noite/fim de tarde dos renders; 0 = dia. */
  noite: number;
  /** Altura do observador (m): muda a escala das luzes da cidade. */
  altura: number;
  /** Giro do céu em Y (para a vista acompanhar a fachada da unidade). */
  giro?: number;
}

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // sempre no fundo
  }`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uTopo;
  uniform vec3 uHorizonte;
  uniform vec3 uChao;
  uniform vec3 uSolDir;
  uniform float uNoite;
  uniform float uAltura;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5; float v = 0.0;
    for (int i = 0; i < 4; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 cor = mix(uHorizonte, uTopo, pow(h, 0.55));

    // nuvens ralas, mais visíveis perto do horizonte
    vec2 uvN = d.xz / max(d.y + 0.35, 0.05) * 1.6; // evita divisão por zero (NaN apaga a tela no bloom)
    float nuv = smoothstep(0.52, 0.85, fbm(uvN + 3.7)) * smoothstep(0.02, 0.3, d.y) * (1.0 - h * 0.6);
    cor = mix(cor, mix(uHorizonte * 1.25 + 0.06, vec3(1.0), 0.25 * (1.0 - uNoite)), nuv * 0.42);

    // sol e halo (de dia)
    float cs = max(dot(d, normalize(uSolDir)), 0.0);
    float dia = 1.0 - uNoite;
    cor += dia * (vec3(1.0, 0.86, 0.62) * pow(cs, 220.0) * 6.0 + vec3(1.0, 0.72, 0.45) * pow(cs, 9.0) * 0.28);

    // estrelas (de noite)
    vec2 g = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 260.0;
    float e = hash(floor(g));
    float estrela = step(0.9965, e) * smoothstep(0.28, 0.0, length(fract(g) - 0.5)) * smoothstep(0.12, 0.6, d.y);
    cor += vec3(0.9, 0.95, 1.0) * estrela * uNoite * 0.8;

    // abaixo do horizonte: cidade ao longe, com pontos de luz
    if (d.y < 0.0) {
      float prof = clamp(-d.y, 0.0, 1.0);
      vec3 chao = mix(mix(uHorizonte * 0.3, vec3(0.16, 0.19, 0.2), 1.0 - uNoite), mix(uChao, vec3(0.2, 0.24, 0.22), 1.0 - uNoite), smoothstep(0.0, 0.12, prof));
      // projeção em perspectiva do solo visto do alto
      vec2 solo = d.xz / max(prof, 0.012) * uAltura * 0.02;
      vec2 cel = floor(solo * 2.2);
      float r = hash(cel);
      vec2 f = fract(solo * 2.2) - 0.5;
      float ponto = step(0.72, r) * smoothstep(0.3, 0.04, length(f));
      float quadra = smoothstep(0.4, 0.75, fbm(cel * 0.07 + 11.0));
      vec3 luz = mix(vec3(1.0, 0.7, 0.36), vec3(0.8, 0.88, 1.0), step(0.97, r));
      float atenua = smoothstep(0.75, 0.015, prof);
      chao += luz * ponto * quadra * atenua * (0.25 + 1.6 * uNoite);
      // brilho difuso da cidade junto ao horizonte
      chao += vec3(1.0, 0.72, 0.42) * 0.22 * uNoite * smoothstep(0.1, 0.0, prof) * (0.5 + 0.5 * fbm(d.xz * 9.0));
      cor = chao;
    } else {
      // brilho quente da cidade junto ao horizonte (o skyline em si é 3D, em Entorno.tsx)
      cor += vec3(1.0, 0.7, 0.4) * 0.16 * uNoite * smoothstep(0.1, 0.0, d.y);
    }

    gl_FragColor = vec4(cor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** Céu procedural: azul profundo dos renders à noite, céu claro de dia, cidade ao longe. */
export function Ceu({ solDir, noite, altura, giro = 0 }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,
        uniforms: {
          uTopo: { value: new THREE.Color() },
          uHorizonte: { value: new THREE.Color() },
          uChao: { value: new THREE.Color("#070b16") },
          uSolDir: { value: new THREE.Vector3(0, 1, 0) },
          uNoite: { value: 1 },
          uAltura: { value: 30 },
        },
      }),
    [],
  );

  const cores = useMemo(
    () => ({
      topoNoite: new THREE.Color("#1a58cc"),
      horNoite: new THREE.Color("#79b6f4"),
      topoDia: new THREE.Color("#2a6fd6"),
      horDia: new THREE.Color("#b5d6f6"),
      horBaixo: new THREE.Color("#f3b98a"),
    }),
    [],
  );

  useFrame(({ camera }) => {
    const u = material.uniforms;
    const el = Math.max(0, solDir.y);
    const dourado = (1 - noite) * Math.max(0, 1 - el / 0.32); // sol baixo deixa o horizonte quente
    (u.uTopo!.value as THREE.Color).copy(cores.topoDia).lerp(cores.topoNoite, noite);
    (u.uHorizonte!.value as THREE.Color).copy(cores.horDia).lerp(cores.horBaixo, dourado * 0.7).lerp(cores.horNoite, noite);
    (u.uSolDir!.value as THREE.Vector3).copy(solDir);
    u.uNoite!.value = noite;
    u.uAltura!.value = Math.max(6, altura);
    if (ref.current) {
      ref.current.position.copy(camera.position);
      ref.current.rotation.y = giro;
    }
  });

  return (
    <mesh ref={ref} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 20]} />
    </mesh>
  );
}
