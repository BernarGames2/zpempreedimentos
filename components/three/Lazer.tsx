"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { lazeres } from "@/lib/dados";
import { sorteio, tela } from "@/lib/procedural/canvas";
import { RECUO_GUARDA, TERRACO, medidasPiscina, type MedidasPiscina, type Ret2 } from "@/lib/procedural/lazer";
import { P } from "@/lib/procedural/predio";
import { texBoucle, texPorcelanatoBege } from "@/lib/procedural/texturasLiwo";
import { useExp } from "@/lib/store";
import { geoEspecie } from "./Entorno";

/**
 * Área de lazer do 5º pavimento, nas posições da planta oficial: deck de pedra clara, piscina com raia e
 * prainha, borda de pedra e guarda-corpo de vidro (renders oficiais), espreguiçadeiras dentro d'água e
 * puff no deck, terraço coberto com luminárias, quadra de pickleball e playground. Os ambientes fechados
 * aparecem como pontos clicáveis, e o cartão mostra a imagem oficial de cada um.
 */

const YD = P.podio + 0.362; // piso do lazer (logo acima do deck do embasamento)
const YA = YD + 0.04; // lâmina d'água
const YB = YD + 0.09; // topo da borda de pedra
const TEMPO = { value: 0 };
const DIA = { value: 1 };
const NOITE = { value: 0 };

// ───────────────────────── água ─────────────────────────

/**
 * Água com profundidade simulada no próprio material (sem malha do fundo): o raio de visão é refratado na
 * superfície ondulada e segue até o fundo ou as paredes de uma caixa virtual, onde se desenham as pastilhas
 * com cáusticas e a absorção da água pelo caminho percorrido. O reflexo do céu e o brilho do sol vêm do
 * material físico padrão (Fresnel). Custa um único plano por trecho de piscina.
 */
function materialAgua(min: THREE.Vector3, max: THREE.Vector3): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.04, metalness: 0, envMapIntensity: 1.15 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uTempo: TEMPO, uDia: DIA, uNoite: NOITE, uMin: { value: min }, uMax: { value: max } });
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vAgua;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvAgua = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        varying vec3 vAgua;
        uniform float uTempo;
        uniform float uDia;
        uniform float uNoite;
        uniform vec3 uMin;
        uniform vec3 uMax;
        vec2 gradOnda(vec2 p, float t) {
          vec2 g = vec2(0.0);
          vec2 d;
          d = vec2(0.94, 0.34); g += d * 5.1 * 0.0050 * cos(dot(d, p) * 5.1 + t * 1.7);
          d = vec2(-0.45, 0.89); g += d * 7.3 * 0.0034 * cos(dot(d, p) * 7.3 + t * 2.1);
          d = vec2(0.71, -0.70); g += d * 11.0 * 0.0020 * cos(dot(d, p) * 11.0 + t * 2.9);
          d = vec2(-0.96, -0.28); g += d * 17.0 * 0.0011 * cos(dot(d, p) * 17.0 + t * 3.6);
          d = vec2(0.20, 0.98); g += d * 29.0 * 0.0006 * cos(dot(d, p) * 29.0 + t * 4.8);
          return g;
        }
        float hashAgua(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
        float caustica(vec2 p, float t) {
          vec2 q = p + 0.32 * vec2(sin(p.y * 1.9 + t * 0.8), cos(p.x * 1.6 - t * 0.7));
          float a = sin(q.x * 3.3 + t * 0.9) * sin(q.y * 2.9 - t * 0.7);
          float b = sin((q.x + q.y) * 2.4 - t * 1.0) * sin((q.x - q.y) * 3.1 + t * 0.6);
          return pow(clamp(1.0 - abs(a + b) * 0.55, 0.0, 1.0), 7.0);
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 gAgua = gradOnda(vAgua.xz, uTempo);
        vec3 nAgua = normalize(vec3(-gAgua.x, 1.0, -gAgua.y));
        normal = normalize((viewMatrix * vec4(nAgua, 0.0)).xyz);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        {
          vec3 V = normalize(vAgua - cameraPosition);
          vec3 R = refract(V, nAgua, 0.752);
          R.y = min(R.y, -0.04);
          R = normalize(R);
          vec3 t1 = (uMin - vAgua) / R;
          vec3 t2 = (uMax - vAgua) / R;
          vec3 tf = max(t1, t2);
          float t = min(min(tf.x, tf.y), tf.z);
          vec3 h = vAgua + R * t;
          vec2 uv;
          float parede = 1.0;
          if (tf.y <= tf.x && tf.y <= tf.z) { uv = h.xz; parede = 0.0; }
          else if (tf.x < tf.z) uv = vec2(h.z, h.y);
          else uv = vec2(h.x, h.y);
          // pastilhas de 10 cm, brancas e azul-claras, com rejunte
          vec2 c = uv / 0.1;
          vec2 f = fract(c);
          vec2 bd = min(f, 1.0 - f);
          float rejunte = 1.0 - smoothstep(0.035, 0.075, min(bd.x, bd.y));
          float longe = clamp(length(fwidth(c)) * 0.8, 0.0, 1.0);
          rejunte *= 1.0 - longe;
          vec3 azulejo = mix(vec3(0.80, 0.90, 0.93), vec3(0.66, 0.84, 0.91), hashAgua(floor(c)));
          azulejo = mix(azulejo, vec3(0.58, 0.69, 0.73), rejunte * 0.8);
          float cau = caustica(h.xz * 1.35 + vec2(h.y * 0.7), uTempo) * mix(1.0, 0.45, parede);
          vec3 luz = azulejo * (0.5 + 0.95 * cau) * uDia;
          // iluminação subaquática à noite: mais forte junto às paredes
          luz += uNoite * azulejo * vec3(0.5, 0.86, 1.0) * (0.55 + 0.5 * cau + 0.45 * parede);
          vec3 trans = exp(-t * vec3(0.55, 0.16, 0.10));
          vec3 fundo = vec3(0.02, 0.21, 0.29) * (0.75 * uDia + 0.7 * uNoite);
          vec3 agua = mix(fundo, luz, trans);
          float F = 0.02 + 0.98 * pow(1.0 - max(dot(-V, nAgua), 0.0), 5.0);
          totalEmissiveRadiance += agua * (1.0 - F);
        }`,
      );
  };
  m.customProgramCacheKey = () => "agua-liwo";
  return m;
}

// ───────────────────────── formas ─────────────────────────

/** Contorno da água (raia + prainha), afastado `f` metros para fora. Forma no plano (x, −z). */
function contorno(alvo: THREE.Path, pc: MedidasPiscina, f: number): void {
  const { raia: a, prainha: p, raio } = pc;
  alvo.moveTo(a.x0 - f, -(a.z0 - f));
  alvo.lineTo(a.x1 + f, -(a.z0 - f));
  alvo.lineTo(a.x1 + f, -(a.z1 + f));
  alvo.lineTo(p.x1 + f, -(a.z1 + f));
  alvo.lineTo(p.x1 + f, -(p.z1 - raio));
  alvo.absarc(p.x1 - raio, -(p.z1 - raio), raio + f, 0, -Math.PI / 2, true);
  alvo.lineTo(a.x0 - f, -(p.z1 + f));
  alvo.closePath();
}

function formaRet(r: Ret2): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(r.x0, -r.z0);
  s.lineTo(r.x1, -r.z0);
  s.lineTo(r.x1, -r.z1);
  s.lineTo(r.x0, -r.z1);
  s.closePath();
  return s;
}

function formaPrainha(p: Ret2, raio: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(p.x0, -p.z0);
  s.lineTo(p.x1, -p.z0);
  s.lineTo(p.x1, -(p.z1 - raio));
  s.absarc(p.x1 - raio, -(p.z1 - raio), raio, 0, -Math.PI / 2, true);
  s.lineTo(p.x0, -p.z1);
  s.closePath();
  return s;
}

/** Plano horizontal com UV em metros. */
function planoMetros(x0: number, x1: number, z0: number, z1: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0));
  return g;
}

/** Espreguiçadeira de imersão (renders oficiais): estofado contínuo em onda, cabeceira elevada. */
function geoEspreguicadeira(): THREE.BufferGeometry {
  const L = 1.85;
  const topo: [number, number][] = [
    [0, 0.13],
    [0.35, 0.17],
    [0.72, 0.21],
    [1.05, 0.165],
    [1.35, 0.24],
    [1.62, 0.41],
    [L, 0.5],
  ];
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(L, 0);
  s.lineTo(L, 0.5);
  s.splineThru([...topo].reverse().slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.58, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 28, steps: 1 });
  g.translate(-L / 2, 0, -0.29);
  return g;
}

/** Puff de deck (render oficial piscina-2): assento afundado e encosto alto, base achatada. */
function geoPuff(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const t = (y + 1) / 2;
    const alt = 0.3 + 0.42 * THREE.MathUtils.smoothstep(z, -0.3, 1.0);
    let ny = Math.pow(t, 0.85) * alt;
    const assento = Math.exp(-((z + 0.15) ** 2) / 0.12 - x * x / 0.35);
    if (t > 0.6) ny -= (0.09 * assento * (t - 0.6)) / 0.4;
    if (t < 0.12) ny = Math.min(ny, 0.02);
    p.setXYZ(i, x * 0.55 * (1 + 0.08 * (1 - t)), ny, z * 0.78);
  }
  g.computeVertexNormals();
  return g;
}

// ───────────────────────── texturas ─────────────────────────

function textura(c: HTMLCanvasElement, cor = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (cor) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Quadra de pickleball (6,10 × 13,41 m, zona de não voleio de 2,13 m), com área de escape. */
function texQuadra(W: number, D: number): THREE.CanvasTexture {
  const ppm = 64;
  const [c, g] = tela(Math.round(W * ppm), Math.round(D * ppm));
  const X = (x: number) => (x + W / 2) * ppm;
  const Z = (z: number) => (z + D / 2) * ppm;
  const [cw, cl, k] = [6.1, 13.41, 2.13];
  g.fillStyle = "#2f4b70";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#47709f";
  g.fillRect(X(-cw / 2), Z(-cl / 2), cw * ppm, cl * ppm);
  g.fillStyle = "#5884b6";
  g.fillRect(X(-cw / 2), Z(-k), cw * ppm, 2 * k * ppm);
  const r = sorteio(5);
  for (let i = 0; i < 14000; i++) {
    g.fillStyle = `rgba(255,255,255,${0.015 + r() * 0.03})`;
    g.fillRect(r() * c.width, r() * c.height, 1, 1);
  }
  g.strokeStyle = "#f2f2ee";
  g.lineWidth = 0.05 * ppm;
  g.strokeRect(X(-cw / 2), Z(-cl / 2), cw * ppm, cl * ppm);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(X(-cw / 2), Z(s * k));
    g.lineTo(X(cw / 2), Z(s * k));
    g.moveTo(X(0), Z(s * k));
    g.lineTo(X(0), Z((s * cl) / 2));
    g.stroke();
  }
  return textura(c);
}

function texRede(): THREE.CanvasTexture {
  const [c, g] = tela(512, 64);
  g.clearRect(0, 0, 512, 64);
  g.strokeStyle = "rgba(18,18,20,1)";
  g.lineWidth = 1.3;
  for (let x = 0; x <= 512; x += 5) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 64);
    g.stroke();
  }
  for (let y = 0; y <= 64; y += 5) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  return textura(c);
}

/** Piso emborrachado do playground (render oficial): base rosada com manchas orgânicas. */
function texPlayground(w: number, d: number): THREE.CanvasTexture {
  const ppm = 80;
  const [c, g] = tela(Math.round(w * ppm), Math.round(d * ppm));
  g.fillStyle = "#b77d68";
  g.fillRect(0, 0, c.width, c.height);
  const mancha = (cx: number, cz: number, raio: number, cor: string, sem: number) => {
    g.fillStyle = cor;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = raio * (1 + 0.16 * Math.sin(3 * a + sem) + 0.09 * Math.sin(5 * a + sem * 2.3));
      const [x, y] = [(cx + Math.cos(a) * rr) * ppm, (cz + Math.sin(a) * rr) * ppm];
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  };
  mancha(w * 0.32, d * 0.3, 1.25, "#d2b98f", 1);
  mancha(w * 0.72, d * 0.68, 0.95, "#dba642", 2);
  mancha(w * 0.25, d * 0.78, 0.8, "#8fa27a", 3);
  mancha(w * 0.78, d * 0.22, 0.55, "#85a8c0", 4);
  mancha(w * 0.55, d * 0.48, 0.42, "#d38e7e", 5);
  const r = sorteio(9);
  for (let i = 0; i < 16000; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.04})`;
    g.fillRect(r() * c.width, r() * c.height, 1.5, 1.5);
  }
  const t = textura(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Ripas radiais do sombreiro do playground (máscara). */
function texRipas(): THREE.CanvasTexture {
  const [c, g] = tela(256, 256);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#fff";
  g.lineWidth = 5;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 14, 128 + Math.sin(a) * 14);
    g.lineTo(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126);
    g.stroke();
  }
  g.lineWidth = 6;
  for (const r of [16, 124]) {
    g.beginPath();
    g.arc(128, 128, r, 0, Math.PI * 2);
    g.stroke();
  }
  return textura(c, false);
}

/** Estofado com gomos transversais (12 cm), como nas espreguiçadeiras dos renders. */
function texGomos(cor: string): THREE.CanvasTexture {
  const [c, g] = tela(256, 64);
  g.fillStyle = cor;
  g.fillRect(0, 0, 256, 64);
  for (const x of [0, 128, 256]) {
    const gr = g.createLinearGradient(x - 20, 0, x + 20, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.5, "rgba(0,0,0,0.3)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(x - 20, 0, 40, 64);
  }
  const t = textura(c);
  t.repeat.set(1 / 0.24, 1 / 0.6);
  return t;
}

function texBrilho(): THREE.CanvasTexture {
  const [c, g] = tela(128, 128);
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,214,160,0.9)");
  gr.addColorStop(0.45, "rgba(255,190,120,0.35)");
  gr.addColorStop(1, "rgba(255,170,100,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function repetida(t: THREE.Texture, metros: number): THREE.Texture {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(1 / metros, 1 / metros);
  c.needsUpdate = true;
  return c;
}

// ───────────────────────── cena ─────────────────────────

function useCenaLazer(pc: MedidasPiscina | null) {
  return useMemo(() => {
    const { x0, x1, z0, z1 } = P.lote;
    const g = new THREE.Group();
    g.name = "lazer_cena";
    const descartar: { dispose: () => void }[] = [];
    const d = <T extends { dispose: () => void }>(x: T) => (descartar.push(x), x);
    const malha = (geo: THREE.BufferGeometry, mat: THREE.Material, sombra = false, nome = "") => {
      const m = new THREE.Mesh(d(geo), mat);
      m.castShadow = sombra;
      m.receiveShadow = true;
      if (nome) m.name = nome;
      g.add(m);
      return m;
    };

    // deck de pedra clara (porcelanato externo), até a linha do guarda-corpo
    const pedra = texPorcelanatoBege(true);
    const deck = d(
      new THREE.MeshStandardMaterial({
        map: d(repetida(pedra.map, 0.9)),
        normalMap: pedra.normalMap ? d(repetida(pedra.normalMap, 0.9)) : null,
        color: "#f1ece4",
        roughness: 0.78,
      }),
    );
    malha(planoMetros(x0 - RECUO_GUARDA + 0.03, x1 + RECUO_GUARDA - 0.03, z0 - RECUO_GUARDA + 0.03, z1 + RECUO_GUARDA - 0.03), deck).position.y = YD;

    const vidro = d(new THREE.MeshStandardMaterial({ color: "#cfe6e1", transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.1, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide }));
    const metal = d(new THREE.MeshStandardMaterial({ color: "#6f6253", roughness: 0.38, metalness: 0.75 }));
    const ripas = d(texRipas());

    if (pc) {
      const { raia: a, prainha: p } = pc;
      // borda de pedra (extrusão do contorno com furo)
      const forma = new THREE.Shape();
      contorno(forma, pc, pc.borda);
      const furo = new THREE.Path();
      contorno(furo, pc, 0);
      forma.holes.push(furo);
      const borda = new THREE.ExtrudeGeometry(forma, { depth: YB - YD, bevelEnabled: false, curveSegments: 20 });
      borda.rotateX(-Math.PI / 2);
      const matBorda = d(new THREE.MeshStandardMaterial({ map: d(repetida(pedra.map, 0.6)), color: "#f7f3ec", roughness: 0.62 }));
      malha(borda, matBorda, false, "piscina_borda").position.y = YD;

      // água: raia funda e prainha rasa
      const agua1 = d(materialAgua(new THREE.Vector3(a.x0, YA - pc.profRaia, a.z0), new THREE.Vector3(a.x1, YA, a.z1)));
      const agua2 = d(materialAgua(new THREE.Vector3(p.x0, YA - pc.profPrainha, a.z0), new THREE.Vector3(p.x1, YA, p.z1)));
      const g1 = new THREE.ShapeGeometry(formaRet(a));
      g1.rotateX(-Math.PI / 2);
      const g2 = new THREE.ShapeGeometry(formaPrainha(p, pc.raio), 20);
      g2.rotateX(-Math.PI / 2);
      malha(g1, agua1, false, "piscina_agua").position.y = YA;
      malha(g2, agua2, false, "piscina_prainha").position.y = YA;

      // guarda-corpo de vidro sem montantes (render oficial), com perfil de base e capa fina
      const v = pc.vidro;
      const gv = new THREE.BoxGeometry(v.x1 - v.x0, 1.1, 0.02);
      malha(gv, vidro, false, "guarda_corpo_vidro").position.set((v.x0 + v.x1) / 2, YD + 0.55, v.z);
      malha(new THREE.BoxGeometry(v.x1 - v.x0, 0.025, 0.035), metal).position.set((v.x0 + v.x1) / 2, YD + 1.112, v.z);
      malha(new THREE.BoxGeometry(v.x1 - v.x0, 0.07, 0.06), metal).position.set((v.x0 + v.x1) / 2, YD + 0.035, v.z);

      // duas espreguiçadeiras de imersão na prainha (planta oficial), cabeceira para o terraço
      const geoE = geoEspreguicadeira();
      const linho = texBoucle("linho-piscina", ["#8f5136", "#a65f3f"]);
      const matE = d(
        new THREE.MeshStandardMaterial({
          map: d(texGomos("#9a5838")),
          normalMap: linho.normalMap ? d(repetida(linho.normalMap, 0.3)) : null,
          normalScale: new THREE.Vector2(0.5, 0.5),
          roughness: 0.95,
        }),
      );
      const matRolo = d(new THREE.MeshStandardMaterial({ color: "#d7652d", roughness: 0.9 }));
      const matBase = d(new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.6 }));
      const geoRolo = new THREE.CylinderGeometry(0.085, 0.085, 0.56, 24);
      geoRolo.rotateZ(Math.PI / 2);
      descartar.push(geoE, geoRolo);
      const zc = p.z0 + 1.46;
      for (const x of [p.x0 + 1.26, p.x0 + 2.13]) {
        const e = new THREE.Group();
        e.position.set(x, YA - 0.03, zc);
        e.rotation.y = -Math.PI / 2; // comprimento (pés → cabeça) ao longo de +z
        const corpo = new THREE.Mesh(geoE, matE);
        corpo.castShadow = corpo.receiveShadow = true;
        const rolo = new THREE.Mesh(geoRolo, matRolo);
        rolo.rotation.y = Math.PI / 2;
        rolo.position.set(0.68, 0.53, 0);
        rolo.castShadow = true;
        const base = new THREE.Mesh(d(new THREE.BoxGeometry(1.6, 0.2, 0.5)), matBase);
        base.position.y = -0.1;
        e.add(corpo, rolo, base);
        g.add(e);
      }

      // puff verde no deck, ao lado da raia (renders e planta oficiais)
      const puff = malha(geoPuff(), d(new THREE.MeshStandardMaterial({ color: "#6d7a3c", normalMap: linho.normalMap ? d(repetida(linho.normalMap, 0.25)) : null, roughness: 0.96 })), true, "puff");
      puff.position.set(-2.6, YD, a.z1 + 1.25);
      puff.rotation.y = 0.55;
    }

    // terraço coberto: luminárias embutidas no forro (acesas à noite)
    const matLuz = d(new THREE.MeshBasicMaterial({ color: "#fff1d8", toneMapped: false }));
    const matPoca = d(new THREE.MeshBasicMaterial({ map: d(texBrilho()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    const zt = (TERRACO.zVidro - 15.4) / 2;
    const luz = new THREE.InstancedMesh(d(new THREE.CircleGeometry(0.07, 20).rotateX(Math.PI / 2)), matLuz, TERRACO.luzes.length);
    const poca = new THREE.InstancedMesh(d(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2)), matPoca, TERRACO.luzes.length);
    TERRACO.luzes.forEach((x, i) => {
      luz.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, P.base - 0.056, zt));
      poca.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, YD + 0.012, zt));
    });
    poca.renderOrder = 2;
    g.add(luz, poca);

    // quadra de pickleball: piso com marcação, rede e postes
    const q = lazeres().find((l) => l.id === "quadra");
    if (q) {
      const [cx, , cz] = q.posicao;
      const [w, , dd] = q.tamanho;
      const [W, D] = [w + 1, dd + 1];
      const piso = malha(planoMetros(-W / 2, W / 2, -D / 2, D / 2), d(new THREE.MeshStandardMaterial({ map: d(texQuadra(W, D)), roughness: 0.82 })), false, "quadra_piso");
      // a textura cobre a quadra inteira uma vez: UV de volta para 0–1
      const uv = piso.geometry.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / W, uv.getY(i) / D);
      piso.position.set(cx, YD + 0.004, cz);
      const rede = malha(new THREE.PlaneGeometry(6.7, 0.86), d(new THREE.MeshStandardMaterial({ map: d(texRede()), color: "#ffffff", transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 })), false, "quadra_rede");
      rede.position.set(cx, YD + 0.48, cz);
      const fita = malha(new THREE.BoxGeometry(6.7, 0.05, 0.012), d(new THREE.MeshStandardMaterial({ color: "#f4f4f0", roughness: 0.8 })));
      fita.position.set(cx, YD + 0.915, cz);
      const preto = d(new THREE.MeshStandardMaterial({ color: "#1d1e20", roughness: 0.5, metalness: 0.4 }));
      for (const s of [-1, 1]) malha(new THREE.CylinderGeometry(0.035, 0.035, 0.94, 16), preto, true).position.set(cx + s * 3.38, YD + 0.47, cz);
    }

    // playground: piso emborrachado, dois sombreiros de ripas e montinhos macios (render oficial)
    const pg = lazeres().find((l) => l.id === "playground");
    if (pg) {
      const [cx, , cz] = pg.posicao;
      const [w, , dd] = pg.tamanho;
      const piso = malha(new THREE.PlaneGeometry(w, dd).rotateX(-Math.PI / 2), d(new THREE.MeshStandardMaterial({ map: d(texPlayground(w, dd)), roughness: 0.92 })), false, "playground_piso");
      piso.position.set(cx, YD + 0.005, cz);
      const branco = d(new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.5 }));
      const lamelas = d(new THREE.MeshStandardMaterial({ color: "#f3f1ec", alphaMap: ripas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }));
      for (const [dx, dz, r, h] of [[-0.8, -0.7, 0.95, 2.7], [0.9, 1.1, 0.75, 2.3]] as const) {
        malha(new THREE.CylinderGeometry(0.045, 0.05, h, 16), branco, true).position.set(cx + dx, YD + h / 2, cz + dz);
        const tampo = malha(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), lamelas, true);
        tampo.position.set(cx + dx, YD + h, cz + dz);
        malha(new THREE.TorusGeometry(r, 0.022, 8, 48).rotateX(Math.PI / 2), branco, true).position.set(cx + dx, YD + h, cz + dz);
      }
      const monte = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      descartar.push(monte);
      for (const [dx, dz, r, h, cor] of [
        [-1.1, 1.2, 0.45, 0.3, "#9fae8a"],
        [0.8, -1.4, 0.55, 0.36, "#c9765f"],
        [0.2, 1.9, 0.36, 0.25, "#e2a797"],
        [-1.2, -1.7, 0.4, 0.28, "#d6b25a"],
      ] as const) {
        const m = new THREE.Mesh(monte, d(new THREE.MeshStandardMaterial({ color: cor, roughness: 0.88 })));
        m.scale.set(r, h, r);
        m.position.set(cx + dx, YD, cz + dz);
        m.castShadow = m.receiveShadow = true;
        g.add(m);
      }
    }

    // duas palmeiras no jardim do fim da piscina (planta oficial)
    if (pc) {
      const geoP = geoEspecie("palmeira", true);
      const matP = d(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
      const palmas = new THREE.InstancedMesh(d(geoP), matP, 2);
      [pc.raia.z0 + 0.4, pc.raia.z1 + 0.6].forEach((z, i) => palmas.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x0 - 0.3, YD, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 2.1), new THREE.Vector3(0.42, 0.42 + i * 0.05, 0.42))));
      palmas.castShadow = true;
      g.add(palmas);
    }

    const ajustar = (artificial: number) => {
      DIA.value = 1 - 0.78 * artificial;
      NOITE.value = artificial;
      matLuz.color.set("#fff1d8").multiplyScalar(0.35 + 2.6 * artificial);
      matPoca.opacity = 0.5 * artificial;
      poca.visible = artificial > 0.05;
    };
    return { g, ajustar, descartar };
  }, [pc]);
}

/** Planta e mesinha do terraço (modelos 3D): só baixam quando o visitante abre um espaço de lazer. */
function ModelosLazer({ pc }: { pc: MedidasPiscina }) {
  const planta = useGLTF("/modelos/planta-grande.glb", false, true);
  const mesa = useGLTF("/modelos/mesa-lateral.glb", false, true);
  const objs = useMemo(() => {
    const prep = (o: THREE.Object3D) => {
      const c = o.clone(true);
      c.traverse((x) => {
        if ((x as THREE.Mesh).isMesh) x.castShadow = x.receiveShadow = true;
      });
      return c;
    };
    return { planta: prep(planta.scene), mesa: prep(mesa.scene) };
  }, [planta, mesa]);
  const z = pc.raia.z1 + 0.62;
  return (
    <group name="lazer_modelos">
      <primitive object={objs.planta} position={[-4.05, YD, z]} />
      <primitive object={objs.mesa} position={[-3.3, YD, pc.raia.z1 + 1.95]} />
    </group>
  );
}

export function Lazer({ artificial }: { artificial: number }) {
  const estado = useExp((s) => s.estado);
  const sel = useExp((s) => s.lazerSel);
  const emVoo = useExp((s) => s.emVoo);
  const abrir = useExp((s) => s.abrirLazer);
  const itens = useMemo(() => lazeres().filter((l) => !l.sem3d), []);
  const pc = useMemo(() => medidasPiscina(), []);
  const cena = useCenaLazer(pc);
  const [modelos, setModelos] = useState(false);
  useEffect(() => cena.ajustar(artificial), [cena, artificial]);
  useEffect(() => () => cena.descartar.forEach((x) => x.dispose()), [cena]);
  useEffect(() => {
    if (estado === "LAZER") setModelos(true);
  }, [estado]);
  useFrame((_, dt) => {
    TEMPO.value += Math.min(dt, 0.1);
  });
  const visivel = estado === "PREDIO" || estado === "LAZER";

  return (
    <group name="lazer">
      <primitive object={cena.g} />
      {modelos && pc && (
        <Suspense fallback={null}>
          <ModelosLazer pc={pc} />
        </Suspense>
      )}
      {itens.map((l) => {
        const [x, y, z] = l.posicao;
        const [, h] = l.tamanho;
        const ativo = sel === l.id;
        return (
          <group key={l.id} name={`lazer_${l.id}`} position={[x, y, z]}>
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

