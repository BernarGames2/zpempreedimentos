import * as THREE from "three";
import { memo } from "@/lib/procedural/canvas";
import {
  texArcos, texAsfalto, texBrilho, texCone, texFolhaPalmeira, texGranito, texHall, texJanela,
  texJanelaLuz, texJanelinha, texLetreiro, texPortaVidro, texTrelica,
} from "@/lib/procedural/texturasExterior";
import type { Mat, Plano } from "@/lib/procedural/torre";

export const QUENTE = new THREE.Color("#ffc57a");

/** Material da grade preta quadriculada: o quadriculado é calculado no shader, em metros. */
export function matGrade(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uCor: { value: new THREE.Color("#0b0c0f") }, uCelula: { value: 0.105 }, uFio: { value: 0.017 } },
    vertexShader: /* glsl */ `
      varying vec3 vMundo;
      varying vec3 vNormalMundo;
      void main() {
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          vNormalMundo = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        #else
          vNormalMundo = normalize(mat3(modelMatrix) * normal);
        #endif
        vec4 m = modelMatrix * p;
        vMundo = m.xyz;
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCor;
      uniform float uCelula;
      uniform float uFio;
      varying vec3 vMundo;
      varying vec3 vNormalMundo;
      void main() {
        // coordenada horizontal ao longo do plano, qualquer que seja a fachada
        float h = abs(vNormalMundo.x) > 0.5 ? vMundo.z : vMundo.x;
        vec2 uv = vec2(h, vMundo.y) / uCelula;
        vec2 d = abs(fract(uv) - 0.5) * uCelula;          // distância ao centro da célula
        vec2 borda = (0.5 * uCelula - d);                  // distância até o fio
        vec2 aa = fwidth(uv) * uCelula;
        vec2 fio = 1.0 - smoothstep(vec2(uFio * 0.5) - aa, vec2(uFio * 0.5) + aa, borda);
        float a = max(fio.x, fio.y);
        // ao longe o quadriculado vira um véu uniforme (evita cintilação)
        float longe = clamp(max(aa.x, aa.y) / uCelula * 1.6, 0.0, 1.0);
        a = mix(a, 0.34, longe);
        if (a < 0.08) discard;
        gl_FragColor = vec4(uCor, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
}

export interface MateriaisExterior {
  caixas: Record<Mat, THREE.Material>;
  planos: Record<Plano, THREE.Material>;
  /** Materiais cuja intensidade depende de a iluminação artificial estar acesa. */
  ajustarLuz: (artificial: number) => void;
}

/** Materiais do exterior. `artificial` (0 a 1) acende janelas, spots e lavagens de luz. */
export function materiaisExterior(): MateriaisExterior {
  return memo("materiais-exterior", () => {
    const pintura = (cor: string, rug = 0.86) => new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: 0 });
    const granito = texGranito();
    const caixas: Record<Mat, THREE.Material> = {
      branco: pintura("#f1f0ec"),
      areia: pintura("#c8ab82"),
      grafite: pintura("#34363d", 0.7),
      granito: new THREE.MeshStandardMaterial({ map: granito, roughness: 0.92, color: "#d9dbe0" }),
      laje: pintura("#9a9ca3", 0.9),
      vidroEscuro: new THREE.MeshStandardMaterial({ color: "#16284a", roughness: 0.08, metalness: 0.75, transparent: true, opacity: 0.82 }),
      metal: new THREE.MeshStandardMaterial({ color: "#0d0e11", roughness: 0.45, metalness: 0.6 }),
      deck: pintura("#5b5d63", 0.95),
      maximar: new THREE.MeshStandardMaterial({ color: "#a9c3e6", roughness: 0.12, metalness: 0.55 }),
      muro: pintura("#e9e7e2", 0.9),
    };

    const luzJanela = texJanelaLuz();
    const janelaAcesa = new THREE.MeshStandardMaterial({ map: texJanela(true), emissive: "#ffffff", emissiveMap: luzJanela, emissiveIntensity: 1.6, roughness: 0.5 });
    const janelaApagada = new THREE.MeshStandardMaterial({ map: texJanela(false), roughness: 0.25, metalness: 0.3 });
    const janelinha = new THREE.MeshBasicMaterial({ map: texJanelinha(), toneMapped: false });
    const portaVidro = new THREE.MeshBasicMaterial({ map: texPortaVidro(), toneMapped: false });
    const brilho = new THREE.MeshBasicMaterial({
      map: texBrilho(), color: QUENTE, transparent: true, opacity: 0.5, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    });
    const spot = new THREE.MeshBasicMaterial({ color: "#fff3dc", toneMapped: false, side: THREE.DoubleSide });
    const cone = new THREE.MeshBasicMaterial({
      map: texCone(), color: QUENTE, transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    });
    const planos: Record<Plano, THREE.Material> = { janelaAcesa, janelaApagada, janelinha, portaVidro, grade: matGrade(), brilho, spot, cone };

    const ajustarLuz = (a: number) => {
      janelaAcesa.emissiveIntensity = 0.1 + 1.5 * a;
      janelinha.color.setScalar(0.3 + 1.0 * a);
      portaVidro.color.setRGB(0.28 + 1.0 * a, 0.3 + 0.98 * a, 0.36 + 0.92 * a);
      brilho.opacity = 0.5 * a;
      cone.opacity = 0.85 * a;
      spot.color.set("#fff3dc").multiplyScalar(0.35 + 1.4 * a);
    };
    return { caixas, planos, ajustarLuz };
  });
}

export interface MateriaisSitio {
  podio: THREE.Material;
  asfalto: THREE.Material;
  asfalto2: THREE.Material;
  calcada: THREE.Material;
  grama: THREE.Material;
  arcos: THREE.MeshStandardMaterial;
  trelica: THREE.MeshStandardMaterial;
  trelicaEscura: THREE.MeshStandardMaterial;
  hall: THREE.MeshStandardMaterial;
  letreiro: THREE.Material;
  tronco: THREE.Material;
  folha: THREE.MeshStandardMaterial;
  copa: THREE.MeshStandardMaterial;
  vaso: THREE.Material;
  vizinho: THREE.Material;
  logo: THREE.Material;
  ajustarLuz: (artificial: number) => void;
}

function repetir(t: THREE.Texture, u: number, v: number): THREE.Texture {
  const c = t.clone();
  c.repeat.set(u, v);
  c.needsUpdate = true;
  return c;
}

export function materiaisSitio(fonte: string): MateriaisSitio {
  return memo("materiais-sitio", () => {
    const arcos = new THREE.MeshStandardMaterial({ map: texArcos(false), emissive: "#ffffff", emissiveMap: texArcos(true), emissiveIntensity: 2.2, roughness: 0.8 });
    const trelica = new THREE.MeshStandardMaterial({ map: texTrelica("cor"), emissive: "#ffffff", emissiveMap: texTrelica("luz"), emissiveIntensity: 0.5, roughness: 0.8 });
    const trelicaEscura = new THREE.MeshStandardMaterial({ map: texTrelica("escuro"), roughness: 0.7, emissive: "#ffb866", emissiveIntensity: 0.05 });
    const hall = new THREE.MeshStandardMaterial({ map: texHall(false), emissive: "#ffffff", emissiveMap: texHall(true), emissiveIntensity: 1.3, roughness: 0.08, metalness: 0.5 });
    const folha = new THREE.MeshStandardMaterial({
      map: texFolhaPalmeira(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7,
      emissive: "#b9c84a", emissiveMap: texFolhaPalmeira(), emissiveIntensity: 0.55,
    });
    const copa = new THREE.MeshStandardMaterial({ color: "#2f5b33", roughness: 0.95, flatShading: true });
    const ajustarLuz = (a: number) => {
      arcos.emissiveIntensity = 0.15 + 2.1 * a;
      trelica.emissiveIntensity = 0.05 + 0.45 * a;
      hall.emissiveIntensity = 0.15 + 1.2 * a;
      folha.emissiveIntensity = 0.55 * a; // palmeiras iluminadas de baixo para cima
    };
    return {
      podio: new THREE.MeshStandardMaterial({ color: "#eeece7", roughness: 0.9 }),
      asfalto: new THREE.MeshStandardMaterial({ map: repetir(texAsfalto(), 128, 2.2), roughness: 0.82, color: "#ffffff" }),
      asfalto2: new THREE.MeshStandardMaterial({ map: repetir(texAsfalto(), 2.2, 128), roughness: 0.82, color: "#ffffff" }),
      calcada: new THREE.MeshStandardMaterial({ color: "#8c8d92", roughness: 0.95 }),
      grama: new THREE.MeshStandardMaterial({ color: "#3b5a3f", roughness: 1 }),
      arcos, trelica, trelicaEscura, hall,
      letreiro: new THREE.MeshStandardMaterial({ map: texLetreiro(fonte), transparent: true, alphaTest: 0.25, roughness: 0.35, metalness: 0.85, emissive: "#8f949c", emissiveIntensity: 0.35 }),
      tronco: new THREE.MeshStandardMaterial({ color: "#6f6352", roughness: 0.95 }),
      folha, copa,
      vaso: new THREE.MeshStandardMaterial({ color: "#f3f2ee", roughness: 0.35 }),
      vizinho: new THREE.MeshStandardMaterial({ color: "#59627a", roughness: 0.95 }),
      logo: new THREE.MeshStandardMaterial({ color: "#b4b8c0", roughness: 0.4, metalness: 0.6 }),
      ajustarLuz,
    };
  });
}
