"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toquePrincipal } from "@/lib/controles";
import { CALCADA, gerador, gerarEntorno, type Entorno as DadosEntorno, type Especie } from "@/lib/procedural/entorno";

/** Fachadas: brancos, areias, cinzas e um terracota (cores comuns no bairro). */
const PALETA = ["#e3dfd6", "#d9cbb1", "#bfbfba", "#cbb89a", "#a29d94", "#b07862", "#8e8a83", "#d2d0c8"];
const TELHAS = ["#9c5236", "#5c5e62", "#86584a"];
const LOD_RAIO = 150; // árvores mais perto que isso usam o modelo detalhado (e fazem sombra)

let cache: DadosEntorno | null = null;
const dados = () => (cache ??= gerarEntorno());

// ───────────────────────── texturas ─────────────────────────

function canvas(n: number, m = n) {
  const c = document.createElement("canvas");
  c.width = n;
  c.height = m;
  return [c, c.getContext("2d") as CanvasRenderingContext2D] as const;
}

/** Chão da malha: uso do solo de cada quadra, calçadas, sombras de contato e asfalto (para a vista de longe). */
function texturaChao(e: DadosEntorno): THREE.CanvasTexture {
  const N = 2048;
  const k = N / (e.meioLado * 2);
  const [c, g] = canvas(N);
  const px = (x: number) => (x + e.meioLado) * k;
  const r = gerador(77);
  g.fillStyle = "#7a8150";
  g.fillRect(0, 0, N, N);
  const manchas = (n: number, cores: string[], x0 = 0, z0 = 0, w = N, h = N, tam = 22) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cores[i % cores.length] as string;
      g.globalAlpha = 0.2 + r() * 0.35;
      const s = 2 + r() * tam;
      g.beginPath();
      g.ellipse(x0 + r() * w, z0 + r() * h, s, s * (0.35 + r() * 0.65), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  };
  manchas(9000, ["#6d7a46", "#868b56", "#8f8658", "#5f7340", "#7d7148"]);
  const ret = (x0: number, z0: number, x1: number, z1: number, cor: string, alfa = 1) => {
    g.globalAlpha = alfa;
    g.fillStyle = cor;
    g.fillRect(px(x0), px(z0), (x1 - x0) * k, (z1 - z0) * k);
    g.globalAlpha = 1;
  };
  for (const q of e.quadras) {
    const rr = gerador(q.semente + 3);
    const W = q.x1 - q.x0;
    const D = q.z1 - q.z0;
    ret(q.x0 - CALCADA, q.z0 - CALCADA, q.x1 + CALCADA, q.z1 + CALCADA, "#b9b5ab");
    const [x0, z0, w, h] = [px(q.x0), px(q.z0), W * k, D * k];
    if (q.uso === "casas") {
      ret(q.x0, q.z0, q.x1, q.z1, "#6d8a4a");
      manchas(70, ["#7d9656", "#5f7d41", "#8e9a62", "#c7c0b0"], x0, z0, w, h, 9);
    } else if (q.uso === "vertical") {
      ret(q.x0, q.z0, q.x1, q.z1, "#a9a499");
      ret(q.x0 + 4, q.z1 - 26, q.x1 - 4, q.z1 - 3, "#6a8c47");
      manchas(30, ["#7c9a55", "#5b7a3f"], x0, z0, w, h, 8);
    } else if (q.uso === "comercial") {
      ret(q.x0, q.z0, q.x1, q.z1, "#505356");
      g.strokeStyle = "rgba(235,235,230,0.55)";
      g.lineWidth = Math.max(1, 0.15 * k);
      for (let x = q.x0 + 3; x < q.x1 - 3; x += 2.6) {
        g.beginPath();
        g.moveTo(px(x), px(q.z1 - 18));
        g.lineTo(px(x), px(q.z1 - 13));
        g.stroke();
      }
    } else if (q.uso === "praca") {
      ret(q.x0, q.z0, q.x1, q.z1, "#5e8a40");
      manchas(60, ["#6d9a4c", "#527a37", "#7a9a52"], x0, z0, w, h, 10);
      g.strokeStyle = "#cfc2a3";
      g.lineWidth = 2.4 * k;
      g.beginPath();
      g.moveTo(x0, z0);
      g.lineTo(x0 + w, z0 + h);
      g.moveTo(x0 + w, z0);
      g.lineTo(x0, z0 + h);
      g.stroke();
      g.beginPath();
      g.ellipse(x0 + w / 2, z0 + h / 2, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#c9b48c";
      g.beginPath();
      g.ellipse(x0 + w / 2, z0 + h / 2, w * 0.08, h * 0.08, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      ret(q.x0, q.z0, q.x1, q.z1, "#8e8a57");
      manchas(26 + Math.floor(rr() * 20), ["#a5855a", "#9a9a62", "#b09a6c", "#7e8550"], x0, z0, w, h, 14);
    }
  }
  // sombra de contato e entrada de carro das casas; deque das piscinas
  for (const h of e.casas) {
    ret(h.x - h.larg / 2 - 0.9, h.z - h.prof / 2 - 0.9, h.x + h.larg / 2 + 0.9, h.z + h.prof / 2 + 0.9, "#2c2b24", 0.38);
    const frente = h.z < 0 ? -1 : 1;
    ret(h.x + h.larg / 2 - 3, h.z, h.x + h.larg / 2 + 0.2, h.z + frente * (h.prof / 2 + 6), "#bdb7aa", 0.9);
  }
  for (const p of e.predios) if (Math.abs(p.x) < e.meioLado && Math.abs(p.z) < e.meioLado && p.giro === 0) ret(p.x - p.larg / 2 - 1.5, p.z - p.prof / 2 - 1.5, p.x + p.larg / 2 + 1.5, p.z + p.prof / 2 + 1.5, "#2c2b24", 0.32);
  for (const p of e.piscinas) ret(p.x - p.larg / 2 - 2.5, p.z - p.prof / 2 - 2.5, p.x + p.larg / 2 + 2.5, p.z + p.prof / 2 + 2.5, "#d8d1c0");
  for (const v of e.vias) ret(v.x0, v.z0, v.x1, v.z1, "#3b3e41");
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Asfalto com faixa amarela tracejada no eixo (repetida a cada 12 m). */
function texturaVia(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 256);
  g.fillStyle = "#3d4044";
  g.fillRect(0, 0, 128, 256);
  const r = gerador(5);
  for (let i = 0; i < 2600; i++) {
    const v = 50 + Math.floor(r() * 30);
    g.fillStyle = `rgba(${v},${v + 2},${v + 5},0.55)`;
    g.fillRect(r() * 128, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  g.fillStyle = "rgba(25,25,25,0.25)"; // trilhas dos pneus
  g.fillRect(22, 0, 16, 256);
  g.fillRect(90, 0, 16, 256);
  g.fillStyle = "#d8b43c";
  g.fillRect(61, 0, 6, 128);
  g.fillStyle = "rgba(235,235,230,0.8)"; // bordas
  g.fillRect(3, 0, 3, 256);
  g.fillRect(122, 0, 3, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Mancha de luz do poste no chão (radial, quente). */
function texturaLuz(): THREE.CanvasTexture {
  const [c, g] = canvas(128);
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,206,140,0.95)");
  gr.addColorStop(0.35, "rgba(255,180,110,0.45)");
  gr.addColorStop(1, "rgba(255,160,90,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function texturaCampo(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  g.fillStyle = "#6c7546";
  g.fillRect(0, 0, 256, 256);
  const r = gerador(9);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = ["#7c8250", "#5d6a3c", "#857a4e", "#66773f"][i % 4] as string;
    g.globalAlpha = 0.3 + r() * 0.4;
    g.fillRect(r() * 256, r() * 256, 4 + r() * 40, 3 + r() * 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(70, 70);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───────────────────────── materiais ─────────────────────────

/** Fachadas com janelas desenhadas no shader pela posição no mundo (andares de 3 m): acesas à noite. */
function materialFachada(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const uNoite = { value: 1 };
  m.onBeforeCompile = (s) => {
    s.uniforms.uNoite = uNoite;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosW;\nvarying vec3 vNorW;\nvarying float vId;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 pw = vec4(transformed, 1.0);
        vec3 nw = objectNormal;
        vId = 0.0;
        #ifdef USE_INSTANCING
          pw = instanceMatrix * pw;
          nw = mat3(instanceMatrix) * nw;
          vId = float(gl_InstanceID);
        #endif
        vPosW = (modelMatrix * pw).xyz;
        vNorW = normalize(nw);`,
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPosW;
        varying vec3 vNorW;
        varying float vId;
        uniform float uNoite;
        float hashJ(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // estilo por prédio: ritmo das janelas, pé-direito, faixa corrida ou janelas soltas, tom do vidro
          float h1 = hashJ(vec3(vId, 1.7, 3.1));
          float h2 = hashJ(vec3(vId, 5.3, 0.7));
          float h3 = hashJ(vec3(vId, 2.9, 8.3));
          float passo = mix(2.3, 3.9, h1);
          float largJ = mix(0.42, 0.78, h2);
          float pe = mix(2.9, 3.3, h3);
          bool corrida = h2 > 0.82;
          float parede = 1.0 - step(0.55, abs(vNorW.y));
          bool emX = abs(vNorW.x) > 0.5;
          float lado = emX ? vPosW.z : vPosW.x;
          vec2 q = vec2(lado / passo, (vPosW.y - 0.9) / pe);
          vec2 cel = floor(q);
          vec2 f = fract(q);
          float meio = 0.5 * largJ;
          float colJ = corrida ? step(0.06, f.x) * step(f.x, 0.94) : step(0.5 - meio, f.x) * step(f.x, 0.5 + meio);
          float jan = parede * step(0.0, q.y) * colJ * step(0.3, f.y) * step(f.y, 0.82);
          float laje = parede * step(0.0, q.y) * (1.0 - step(0.07, f.y));
          float h = hashJ(vec3(cel, vId + (emX ? 31.0 : 0.0)));
          // de longe a janela fica menor que um pixel: troca o desenho pela média (sem chuvisco)
          vec2 fw = fwidth(q);
          float longe = smoothstep(0.18, 0.55, max(fw.x, fw.y));
          float cobertura = (corrida ? 0.88 : largJ) * 0.52;
          float limiar = mix(0.55, 0.8, h1);
          vec3 vidroDia = mix(vec3(0.33, 0.4, 0.47), vec3(0.52, 0.6, 0.66), h3) * (0.85 + 0.25 * h);
          vec3 vidro = mix(vidroDia, vec3(0.05, 0.06, 0.085), uNoite);
          jan = mix(jan, parede * step(0.0, q.y) * cobertura, longe);
          diffuseColor.rgb *= 1.0 - laje * 0.14 * (1.0 - longe);
          diffuseColor.rgb = mix(diffuseColor.rgb, vidro, jan * 0.9);
          float acesa = mix(jan * step(limiar, h), jan * (1.0 - limiar), longe) * uNoite;
          vec3 luz = mix(vec3(1.0, 0.66, 0.36), vec3(0.8, 0.88, 1.0), step(0.93, h));
          totalEmissiveRadiance += luz * acesa * (0.2 + 0.45 * fract(h * 7.31));
          diffuseColor.rgb *= mix(1.0, 0.7, 1.0 - parede);
        }`,
      );
  };
  m.userData.uNoite = uNoite;
  return m;
}

// ───────────────────────── árvores ─────────────────────────

function pintar(g: THREE.BufferGeometry, cor: THREE.Color, baseY: number, altura: number, escuro: number, semente: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const r = gerador(semente);
  const cores = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - baseY) / Math.max(altura, 0.01), 0, 1);
    const k = (escuro + (1 - escuro) * t) * (0.9 + r() * 0.2);
    cores[i * 3] = cor.r * k;
    cores[i * 3 + 1] = cor.g * k;
    cores[i * 3 + 2] = cor.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
}

/** Tufo de folhagem: icosaedro deformado com sombreamento suave e base mais escura. */
function tufo(det: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, cor: string, semente: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, det);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const r = gerador(semente);
  for (let i = 0; i < p.count; i++) {
    const k = 0.8 + r() * 0.4;
    p.setXYZ(i, p.getX(i) * sx * k, p.getY(i) * sy * k, p.getZ(i) * sz * k);
  }
  g.computeVertexNormals();
  g.translate(x, y, z);
  pintar(g, new THREE.Color(cor), y - sy, sy * 2, 0.55, semente + 1);
  return g;
}

function troncoGeo(r0: number, r1: number, h: number, cor: string, incl = 0, x = 0, y = 0, z = 0, lados = 5): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, h, lados, 1, lados < 5);
  g.deleteAttribute("uv");
  g.translate(0, h / 2, 0);
  if (incl) g.rotateZ(incl);
  g.translate(x, y, z);
  pintar(g, new THREE.Color(cor), y, h, 0.7, 3);
  return g;
}

/** Folha de palmeira: tira que sobe e cai em arco, mais estreita na ponta. */
function folhaPalmeira(giro: number, y: number, comp: number, semente: number): THREE.BufferGeometry {
  const seg = 5;
  const pos: number[] = [];
  const idx: number[] = [];
  const r = gerador(semente);
  const queda = 0.3 + r() * 0.15;
  for (let i = 0; i <= seg; i++) {
    const s = i / seg;
    const d = s * comp;
    const h = d * 0.5 - d * d * queda;
    const w = 0.36 * Math.sin(Math.PI * (0.12 + 0.88 * s)) + 0.03;
    pos.push(-w, h, d, w, h - 0.06, d);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.rotateY(giro);
  g.translate(0, y, 0);
  g.computeVertexNormals();
  pintar(g, new THREE.Color("#58792f"), y - 1.5, 2.5, 0.6, semente);
  return g;
}

function geoEspecie(e: Especie, perto: boolean): THREE.BufferGeometry {
  const d = perto ? 1 : 0;
  const partes: THREE.BufferGeometry[] = [];
  const marrom = "#5b4736";
  // de longe o tronco é um prisma aberto de 3 lados (6 triângulos)
  const tronco = (r0: number, r1: number, h: number, cor: string, incl = 0, x = 0, y = 0, z = 0) => troncoGeo(r0, r1, h, cor, incl, x, y, z, perto ? 5 : 3);
  switch (e) {
    case "copa":
      partes.push(tronco(0.24, 0.15, 2.8, marrom));
      if (perto) {
        partes.push(tufo(d, 1.95, 1.5, 1.95, 0, 3.95, 0, "#4b6b30", 11), tufo(d, 1.4, 1.1, 1.4, 1.25, 3.4, 0.5, "#527334", 12), tufo(d, 1.3, 1.0, 1.3, -1.1, 3.5, -0.7, "#47662d", 13), tufo(d, 1.15, 0.9, 1.15, 0.1, 4.75, 0.1, "#5a7a38", 14));
      } else partes.push(tufo(0, 2.3, 1.8, 2.3, 0, 4.0, 0, "#4c6b31", 16));
      break;
    case "ipe":
      partes.push(tronco(0.22, 0.13, 3.1, "#4e4035"));
      if (perto) partes.push(tufo(d, 2.2, 1.05, 2.2, 0, 4.5, 0, "#d9b23a", 21), tufo(d, 1.5, 0.8, 1.5, 1.5, 4.1, 0.6, "#e3c24d", 22), tufo(d, 1.4, 0.75, 1.4, -1.4, 4.2, -0.5, "#a9a03a", 23), tufo(d, 1.1, 0.7, 1.1, 0.2, 5.0, 1.0, "#e6c552", 24));
      else partes.push(tufo(0, 2.5, 1.1, 2.5, 0, 4.5, 0, "#d2b03e", 25));
      break;
    case "flamboyant":
      partes.push(tronco(0.26, 0.16, 2.5, "#56493d"));
      if (perto) partes.push(tufo(d, 2.8, 0.85, 2.8, 0, 3.9, 0, "#c8462b", 31), tufo(d, 1.8, 0.7, 1.8, 1.7, 3.7, 0.9, "#d6582f", 32), tufo(d, 1.7, 0.65, 1.7, -1.6, 3.8, -0.8, "#6a7d34", 33));
      else partes.push(tufo(0, 3.0, 0.9, 3.0, 0, 3.9, 0, "#c24a2d", 34));
      break;
    case "palmeira": {
      const h = 8.5;
      partes.push(tronco(0.22, 0.16, h, "#8a7f6c"));
      if (perto) {
        partes.push(tufo(1, 0.42, 0.55, 0.42, 0, h + 0.1, 0, "#6d6a3c", 41));
        for (let i = 0; i < 11; i++) partes.push(folhaPalmeira((i / 11) * Math.PI * 2 + (i % 2) * 0.2, h + 0.15, 3.0 + (i % 3) * 0.3, 42 + i));
      } else partes.push(tufo(0, 2.6, 0.7, 2.6, 0, h, 0, "#56772f", 43));
      break;
    }
    case "cone":
      partes.push(tronco(0.18, 0.12, 1.4, marrom));
      if (perto) partes.push(tufo(d, 0.95, 1.7, 0.95, 0, 2.6, 0, "#3b5a32", 51), tufo(d, 0.8, 1.55, 0.8, 0, 4.1, 0, "#40603a", 52), tufo(d, 0.55, 1.2, 0.55, 0, 5.4, 0, "#46663c", 53));
      else partes.push(tufo(0, 0.95, 3.0, 0.95, 0, 3.6, 0, "#3e5d35", 54));
      break;
    case "cerrado":
      partes.push(tronco(0.13, 0.09, 1.5, "#4d4033", 0.28), tronco(0.09, 0.07, 1.1, "#4d4033", -0.45, -0.38, 1.35, 0));
      if (perto) partes.push(tufo(d, 1.5, 0.55, 1.5, 0.3, 2.35, 0.2, "#6e7a3a", 61), tufo(d, 1.0, 0.5, 1.0, -0.7, 2.25, -0.3, "#7a8240", 62));
      else partes.push(tufo(0, 1.7, 0.6, 1.7, 0, 2.3, 0, "#717d3c", 63));
      break;
  }
  const g = mergeGeometries(partes, false) as THREE.BufferGeometry;
  partes.forEach((p) => p.dispose());
  return g;
}

// ───────────────────────── geometrias auxiliares ─────────────────────────

/** Telhado de duas águas, base 1 × 1 e cumeeira em y = 1 ao longo de x. */
function geoTelhado(): THREE.BufferGeometry {
  const v = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0,
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0,
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

function geoVias(e: DadosEntorno): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const v of e.vias) {
    const n = pos.length / 3;
    const y = v.faixa ? 0.012 : 0.016;
    pos.push(v.x0, y, v.z0, v.x1, y, v.z0, v.x1, y, v.z1, v.x0, y, v.z1);
    if (!v.faixa) uv.push(0.1, 0.1, 0.3, 0.1, 0.3, 0.3, 0.1, 0.3);
    else if (v.eixo === "x") uv.push(0, v.x0 / 12, 0, v.x1 / 12, 1, v.x1 / 12, 1, v.x0 / 12);
    else uv.push(0, v.z0 / 12, 1, v.z0 / 12, 1, v.z1 / 12, 0, v.z1 / 12);
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Serra baixa no horizonte (anel de 1,9 a 9 km), para o céu não encostar num chão chapado. */
function geoSerra(): THREE.BufferGeometry {
  const A = 120;
  const R = 18;
  const pos: number[] = [];
  const cor: number[] = [];
  const idx: number[] = [];
  const c0 = new THREE.Color("#3f4d35");
  const c1 = new THREE.Color("#55603f");
  for (let j = 0; j <= R; j++) {
    const t = j / R;
    const raio = 1900 + Math.pow(t, 1.6) * 7100;
    for (let i = 0; i <= A; i++) {
      const a = (i / A) * Math.PI * 2;
      const n = 0.5 + 0.25 * Math.sin(3 * a + 1.3) + 0.15 * Math.sin(7 * a + 0.4 + t * 3) + 0.1 * Math.sin(13 * a + 2.1);
      const h = THREE.MathUtils.smoothstep(raio, 1900, 4200) * (30 + 150 * n * n);
      pos.push(Math.cos(a) * raio, h - 0.2, Math.sin(a) * raio);
      const c = c0.clone().lerp(c1, n);
      cor.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < A; i++) {
      const a = j * (A + 1) + i;
      const b = a + A + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function geoPoste(): THREE.BufferGeometry {
  const partes = [
    new THREE.CylinderGeometry(0.07, 0.11, 8.2, 6).translate(0, 4.1, 0),
    new THREE.BoxGeometry(0.07, 0.07, 1.8).translate(0, 8.05, 0.85),
    new THREE.BoxGeometry(0.3, 0.12, 0.62).translate(0, 7.98, 1.72),
  ];
  partes.forEach((p) => p.deleteAttribute("uv"));
  const g = mergeGeometries(partes, false) as THREE.BufferGeometry;
  partes.forEach((p) => p.dispose());
  return g;
}

// ───────────────────────── montagem ─────────────────────────

function instancias(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], cores?: THREE.Color[], sombra = false): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(mats.length, 1));
  m.count = mats.length;
  mats.forEach((x, i) => m.setMatrixAt(i, x));
  cores?.forEach((c, i) => m.setColorAt(i, c));
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = sombra;
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}

interface Props {
  /** 0 = dia, 1 = noite (janelas e postes acesos). */
  noite: number;
  qualidade?: "alto" | "medio" | "baixo";
  /** No interior, o entorno é levado para o referencial da planta (a cidade aparece pelas janelas). */
  posicao?: [number, number, number];
  giro?: number;
}

/** Cidade em volta do Liwo: chão, ruas, casas, prédios, árvores, postes e serra no horizonte. */
export function Entorno({ noite, qualidade = "medio", posicao = [0, 0, 0], giro = 0 }: Props) {
  const grupo = useMemo(() => {
    const e = dados();
    const g = new THREE.Group();
    g.name = "entorno";
    const descartar: { dispose: () => void }[] = [];
    const guardar = <T extends { dispose: () => void }>(x: T) => (descartar.push(x), x);
    const q = new THREE.Quaternion();
    const eixoY = new THREE.Vector3(0, 1, 0);
    const mtx = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rot = 0) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.clone().setFromAxisAngle(eixoY, rot), new THREE.Vector3(sx, sy, sz));

    // chão: textura da malha no centro, campo repetido em volta e a serra no horizonte
    const matChao = guardar(new THREE.MeshStandardMaterial({ map: guardar(texturaChao(e)), roughness: 1 }));
    // grão fino por cima da textura da malha (que tem ~0,8 m por pixel): de perto o chão deixa de ser uma cor chapada
    matChao.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          {
            vec2 pm = vMapUv * ${(e.meioLado * 2).toFixed(1)};
            float grao = 0.45 * vn(pm * 1.7) + 0.35 * vn(pm * 0.45) + 0.2 * vn(pm * 6.0);
            float longe = smoothstep(0.25, 1.4, fwidth(pm.x) + fwidth(pm.y));
            diffuseColor.rgb *= mix(0.8 + 0.4 * grao, 1.0, longe);
          }`,
        );
    };
    const chao = new THREE.Mesh(guardar(new THREE.PlaneGeometry(e.meioLado * 2, e.meioLado * 2)), matChao);
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -0.05;
    chao.receiveShadow = true;
    const campo = new THREE.Mesh(guardar(new THREE.CircleGeometry(9200, 48)), guardar(new THREE.MeshStandardMaterial({ map: guardar(texturaCampo()), roughness: 1 })));
    campo.rotation.x = -Math.PI / 2;
    campo.position.y = -0.12;
    const serra = new THREE.Mesh(guardar(geoSerra()), guardar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    const vias = new THREE.Mesh(guardar(geoVias(e)), guardar(new THREE.MeshStandardMaterial({ map: guardar(texturaVia()), roughness: 0.92 })));
    vias.receiveShadow = true;
    g.add(chao, campo, serra, vias);

    // prédios e casas (um único material com janelas no shader)
    const fachada = guardar(materialFachada());
    const caixa = guardar(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const vols = [...e.predios, ...e.casas];
    g.add(instancias(caixa, fachada, vols.map((v) => mtx(v.x, 0, v.z, v.larg, v.alt, v.prof, v.giro)), vols.map((v) => new THREE.Color(PALETA[v.cor % PALETA.length])), true));
    const comTelhado = e.casas.filter((c) => c.telhado > 0);
    g.add(
      instancias(
        guardar(geoTelhado()),
        guardar(new THREE.MeshStandardMaterial({ roughness: 0.8 })),
        comTelhado.map((c) => {
          const h = Math.min(c.larg, c.prof) * 0.24;
          return c.telhado === 1 ? mtx(c.x, c.alt, c.z, c.larg + 0.6, h, c.prof + 0.6) : mtx(c.x, c.alt, c.z, c.prof + 0.6, h, c.larg + 0.6, Math.PI / 2);
        }),
        comTelhado.map((c) => new THREE.Color(TELHAS[c.corTelhado])),
        true,
      ),
    );
    // platibanda das casas de laje
    const lajes = e.casas.filter((c) => c.telhado === 0);
    g.add(instancias(caixa, fachada, lajes.map((c) => mtx(c.x, c.alt, c.z, c.larg + 0.3, 0.5, c.prof + 0.3)), lajes.map((c) => new THREE.Color(PALETA[c.cor % PALETA.length]))));
    const agua = guardar(new THREE.MeshStandardMaterial({ color: "#3aa2c6", roughness: 0.12, emissive: "#0d6f8f", emissiveIntensity: 0 }));
    g.add(instancias(guardar(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), agua, e.piscinas.map((p) => mtx(p.x, 0.02, p.z, p.larg, 1, p.prof))));

    // árvores por espécie, em dois níveis de detalhe
    const matArvore = guardar(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }));
    const especies: Especie[] = ["copa", "ipe", "flamboyant", "palmeira", "cone", "cerrado"];
    // Três malhas por espécie, para o nível de detalhe mudar sem reconstruir nada:
    //   perto  – modelo detalhado, da mais próxima para a mais distante (desenha as `n` primeiras);
    //   medio  – modelo simples das árvores até 380 m, da mais distante para a mais próxima (deixa de fora as `n` mais próximas);
    //   longe  – modelo simples das árvores além de 380 m (some no nível baixo e visto de dentro do apartamento).
    const niveis: { perto: THREE.InstancedMesh; medio: THREE.InstancedMesh; longe: THREE.InstancedMesh | null; dist: number[] }[] = [];
    const dist = (a: { x: number; z: number }) => Math.hypot(a.x, a.z);
    for (const sp of especies) {
      const todas = e.arvores.filter((a) => a.especie === sp).sort((a, b) => dist(a) - dist(b));
      if (!todas.length) continue;
      const malha = (lista: typeof todas, detalhada: boolean) => {
        const mats = lista.map((a) => {
          const s = a.escala * (0.9 + a.tom * 0.25);
          return mtx(a.x, 0, a.z, s, s * (0.92 + ((a.tom * 7) % 1) * 0.18), s, a.giro);
        });
        const cores = lista.map((a) => new THREE.Color().setRGB(0.86 + a.tom * 0.26, 0.88 + a.tom * 0.2, 0.86 + ((a.tom * 3) % 1) * 0.16));
        const m = instancias(guardar(geoEspecie(sp, detalhada)), matArvore, mats, cores, detalhada);
        g.add(m);
        return m;
      };
      const ate380 = todas.filter((a) => dist(a) < 380);
      const alem = todas.filter((a) => dist(a) >= 380);
      niveis.push({
        perto: malha(todas.filter((a) => dist(a) < LOD_RAIO), true),
        medio: malha([...ate380].reverse(), false),
        longe: alem.length ? malha(alem, false) : null,
        dist: ate380.map(dist),
      });
    }

    // postes, lâmpadas e manchas de luz no chão
    const matsPoste = e.postes.map((p) => mtx(p.x, 0, p.z, 1, 1, 1, p.giro));
    g.add(instancias(guardar(geoPoste()), guardar(new THREE.MeshStandardMaterial({ color: "#6f7277", roughness: 0.6, metalness: 0.4 })), matsPoste));
    const lampada = guardar(new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false }));
    g.add(instancias(guardar(new THREE.PlaneGeometry(0.26, 0.56).rotateX(Math.PI / 2).translate(0, 7.91, 1.72)), lampada, matsPoste));
    const mancha = guardar(new THREE.MeshBasicMaterial({ map: guardar(texturaLuz()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    const poca = instancias(guardar(new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2).translate(0, 0.03, 2.4)), mancha, matsPoste);
    poca.receiveShadow = false;
    poca.renderOrder = 1;
    g.add(poca);

    const ajustar = (n: number) => {
      (fachada.userData.uNoite as { value: number }).value = n;
      lampada.color.set(n > 0.5 ? "#ffcf8a" : "#9a9a96").multiplyScalar(n > 0.5 ? 3.2 : 1);
      mancha.opacity = 0.55 * n;
      poca.visible = n > 0.05;
      agua.emissiveIntensity = 0.9 * n;
    };
    // no nível "baixo" (celular sem folga) as árvores além de 380 m não são desenhadas
    /** `raio`: até onde as árvores usam o modelo detalhado; `distantes`: desenha as árvores além de 380 m. */
    const detalhar = (raio: number, distantes: boolean) =>
      niveis.forEach((n) => {
        const k = n.dist.filter((d) => d < Math.min(raio, LOD_RAIO)).length;
        n.perto.count = k;
        n.medio.count = n.dist.length - k;
        if (n.longe) n.longe.visible = distantes;
      });
    return { g, ajustar, detalhar, descartar };
  }, []);

  useEffect(() => grupo.ajustar(noite), [grupo, noite]);
  // Visto de dentro do apartamento, o entorno não precisa projetar sombra nem das árvores mais distantes:
  // era o maior custo do passeio (toda a cidade era redesenhada no mapa de sombras a cada quadro).
  const interno = giro !== 0 || posicao[0] !== 0 || posicao[1] !== 0 || posicao[2] !== 0;
  // Árvores detalhadas só onde fazem diferença: 150 m no computador, 60 m no celular, 40 m no nível baixo e
  // nenhuma quando a cidade é vista pela janela do apartamento (ficam dezenas de metros abaixo).
  useEffect(() => {
    const raio = interno ? 0 : qualidade === "baixo" ? 40 : toquePrincipal() ? 60 : LOD_RAIO;
    grupo.detalhar(raio, !(qualidade === "baixo" || interno));
  }, [grupo, qualidade, interno]);
  useEffect(() => {
    grupo.g.traverse((o) => {
      if (o.userData.sombra === undefined) o.userData.sombra = o.castShadow;
      o.castShadow = interno ? false : (o.userData.sombra as boolean);
    });
  }, [grupo, interno]);
  useEffect(() => () => grupo.descartar.forEach((x) => x.dispose()), [grupo]);

  return <primitive object={grupo.g} position={posicao} rotation={[0, giro, 0]} />;
}
