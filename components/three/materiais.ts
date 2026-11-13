import * as THREE from "three";
import { memo } from "@/lib/procedural/canvas";
import { texBrilho, texCone, texJanela, texJanelaLuz, texJanelinha, texJanelinhaDia, texPortaVidro, texPortaVidroDia } from "@/lib/procedural/texturasExterior";
import { texConcreto, texLetreiro, texPendente, texPerfurado, texTerracota, texVitrine } from "@/lib/procedural/texturasLiwo";
import type { Mat, Plano } from "@/lib/procedural/torre";

export const QUENTE = new THREE.Color("#ffc57a");

/** Material da grade preta quadriculada: o quadriculado é calculado no shader, em metros. */
/** Gradil desenhado no shader, em metros: quadriculado ou só montantes verticais (gradil das varandas do Liwo). */
export function matGrade(cor = "#0b0c0f", verticais = true): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uCor: { value: new THREE.Color(cor) }, uCelula: { value: verticais ? 0.12 : 0.105 }, uFio: { value: verticais ? 0.022 : 0.017 }, uVertical: { value: verticais ? 1 : 0 } },
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
      uniform float uVertical;
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
        float a = uVertical > 0.5 ? fio.x : max(fio.x, fio.y);
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
  /** Lajes em onda (mesma pintura das lajes) e fita de LED sob elas. */
  laje: THREE.Material;
  fita: THREE.MeshBasicMaterial;
  /** Materiais cuja intensidade depende de a iluminação artificial estar acesa. */
  ajustarLuz: (artificial: number) => void;
}

/** Materiais do exterior (paleta dos renders do Liwo). `artificial` (0 a 1) acende janelas, spots e LEDs. */
export function materiaisExterior(): MateriaisExterior {
  return memo("materiais-exterior", () => {
    const pintura = (cor: string, rug = 0.86) => new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: 0 });
    const conc = texConcreto(false);
    const concClaro = texConcreto(true);
    const terr = texTerracota();
    const repetir = (t: THREE.Texture, u: number, v: number) => { const c = t.clone(); c.repeat.set(u, v); c.needsUpdate = true; return c; };
    const concreto = new THREE.MeshStandardMaterial({ map: repetir(conc.map, 0.25, 0.25), normalMap: conc.normalMap ? repetir(conc.normalMap, 0.25, 0.25) : null, roughness: 0.9 });
    const concretoClaro = new THREE.MeshStandardMaterial({ map: repetir(concClaro.map, 0.3, 0.3), roughness: 0.8 });
    const fita = new THREE.MeshBasicMaterial({ color: "#ffd59a", toneMapped: false });
    const caixas: Record<Mat, THREE.Material> = {
      concreto,
      concretoClaro,
      // painéis de bronze das empenas e do coroamento: leve brilho metálico, como o ACM dos renders
      terracota: new THREE.MeshStandardMaterial({ map: repetir(terr.map, 0.4, 0.4), roughness: 0.55, metalness: 0.18 }),
      grafite: pintura("#2e2d2b", 0.7),
      branco: pintura("#efece6"),
      painel: pintura("#d8d2c8", 0.6),
      vidroEscuro: new THREE.MeshStandardMaterial({ color: "#1d2a3a", roughness: 0.08, metalness: 0.75, transparent: true, opacity: 0.82 }),
      metal: new THREE.MeshStandardMaterial({ color: "#0d0e11", roughness: 0.45, metalness: 0.6 }),
      bronze: new THREE.MeshStandardMaterial({ color: "#7a5a3c", roughness: 0.38, metalness: 0.8 }),
      deck: pintura("#a59c8f", 0.95),
      muro: pintura("#cfc8bd", 0.92),
      led: fita,
    };

    const luzJanela = texJanelaLuz();
    // vidro de verdade: dielétrico liso (escuro de frente, espelhado de lado), e a cor vem do céu refletido
    const vidro = { roughness: 0.05, metalness: 0, envMapIntensity: 1.6 };
    const janelaAcesa = new THREE.MeshStandardMaterial({ map: texJanela(true), emissive: "#ffffff", emissiveMap: luzJanela, emissiveIntensity: 1.6, roughness: 0.5 });
    const janelaApagada = new THREE.MeshStandardMaterial({ map: texJanela(false), ...vidro });
    // de dia vidro fosco; à noite a mesma peça acende (emissivo quente)
    const janelinha = new THREE.MeshStandardMaterial({ map: texJanelinhaDia(), emissive: "#ffffff", emissiveMap: texJanelinha(), emissiveIntensity: 0, roughness: 0.3 });
    // porta da sacada: de dia o interior na penumbra atrás do reflexo; à noite a luz quente do apartamento
    const portaVidro = new THREE.MeshStandardMaterial({ map: texPortaVidroDia(), emissive: "#ffffff", emissiveMap: texPortaVidro(), emissiveIntensity: 0, ...vidro });
    const brilho = new THREE.MeshBasicMaterial({
      map: texBrilho(), color: QUENTE, transparent: true, opacity: 0.5, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    });
    const spot = new THREE.MeshBasicMaterial({ color: "#fff3dc", toneMapped: false, side: THREE.DoubleSide });
    const cone = new THREE.MeshBasicMaterial({
      map: texCone(), color: QUENTE, transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    });
    const planos: Record<Plano, THREE.Material> = { janelaAcesa, janelaApagada, janelinha, portaVidro, grade: matGrade("#5a4129"), brilho, spot, cone };

    // de dia a janela "acesa" é vidro como as outras (antes o laranja da luz interna parecia painel de madeira)
    const [mapaDia, mapaNoite] = [texJanela(false), texJanela(true)];
    const ajustarLuz = (a: number) => {
      const acesa = a > 0.35;
      janelaAcesa.map = acesa ? mapaNoite : mapaDia;
      janelaAcesa.roughness = acesa ? 0.5 : 0.05;
      janelaAcesa.metalness = 0;
      janelaAcesa.envMapIntensity = acesa ? 1 : 1.6;
      janelaAcesa.emissiveIntensity = acesa ? 0.1 + 1.5 * a : 0;
      janelinha.emissiveIntensity = acesa ? 0.25 + 1.3 * a : 0;
      portaVidro.emissiveIntensity = 2.1 * a;
      brilho.opacity = 0.5 * a;
      cone.opacity = 0.85 * a;
      spot.color.set("#fff3dc").multiplyScalar(0.35 + 1.4 * a);
      fita.color.set("#ffd59a").multiplyScalar(0.35 + 1.6 * a);
    };
    return { caixas, planos, laje: concretoClaro, fita, ajustarLuz };
  });
}

export interface MateriaisSitio {
  podio: THREE.Material;
  calcada: THREE.Material;
  vitrine: THREE.MeshStandardMaterial;
  perfurado: THREE.MeshStandardMaterial;
  escuro: THREE.Material;
  letreiro: THREE.MeshStandardMaterial;
  tronco: THREE.Material;
  copa: THREE.MeshStandardMaterial;
  arbusto: THREE.MeshStandardMaterial;
  pendente: THREE.MeshStandardMaterial;
  ajustarLuz: (artificial: number) => void;
}

function repetir(t: THREE.Texture, u: number, v: number): THREE.Texture {
  const c = t.clone();
  c.repeat.set(u, v);
  c.needsUpdate = true;
  return c;
}

export function materiaisSitio(fonte: string, nome: string): MateriaisSitio {
  return memo("materiais-sitio", () => {
    const vitrine = new THREE.MeshStandardMaterial({ map: texVitrine(false), emissive: "#ffffff", emissiveMap: texVitrine(true), emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.45 });
    const perfurado = new THREE.MeshStandardMaterial({ map: texPerfurado(false), emissive: "#ffffff", emissiveMap: texPerfurado(true), emissiveIntensity: 0.4, roughness: 0.55, metalness: 0.35 });
    const letreiro = new THREE.MeshStandardMaterial({ map: texLetreiro(fonte, nome), transparent: true, alphaTest: 0.3, emissive: "#fff3e0", emissiveMap: texLetreiro(fonte, nome), emissiveIntensity: 0.25, roughness: 0.4 });
    const copa = new THREE.MeshStandardMaterial({ color: "#3d5f34", roughness: 0.95, flatShading: true });
    const arbusto = new THREE.MeshStandardMaterial({ color: "#4f7a3c", roughness: 0.9 });
    const pendente = new THREE.MeshStandardMaterial({ map: texPendente(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8, color: "#d8e6c8" });
    const ajustarLuz = (a: number) => {
      vitrine.emissiveIntensity = 0.12 + 1.1 * a;
      perfurado.emissiveIntensity = 0.04 + 0.6 * a;
      letreiro.emissiveIntensity = 0.25 + 1.2 * a;
    };
    const conc = texConcreto(false);
    return {
      podio: new THREE.MeshStandardMaterial({ map: repetir(conc.map, 0.2, 0.2), roughness: 0.9 }),
      calcada: new THREE.MeshStandardMaterial({ color: "#9b968d", roughness: 0.95 }),
      vitrine, perfurado, letreiro, copa, arbusto, pendente,
      escuro: new THREE.MeshStandardMaterial({ color: "#3b3732", roughness: 0.8 }),
      tronco: new THREE.MeshStandardMaterial({ color: "#6f6352", roughness: 0.95 }),
      ajustarLuz,
    };
  });
}
