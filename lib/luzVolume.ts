/**
 * Iluminação indireta pré-calculada (scripts/assar-luz.ts): um volume de sondas por planta, lido como
 * textura 3D e aplicado à luz ambiente de todos os materiais do interior (paredes, pisos, móveis e modelos).
 * Perto das janelas o ambiente clareia; corredores e banhos sem janela ficam mais fechados; à noite vale
 * o canal das luminárias.
 */
import * as THREE from "three";

const neutro = new THREE.Data3DTexture(new Uint8Array([128, 128, 0, 255]), 1, 1, 1);
neutro.needsUpdate = true;

const U = {
  uLuzVol: { value: neutro as THREE.Data3DTexture },
  uLuzMin: { value: new THREE.Vector3() },
  uLuzTam: { value: new THREE.Vector3(1, 1, 1) },
  uLuzNoite: { value: 0 },
  uLuzAtiva: { value: 0 },
};
let atual: THREE.Data3DTexture | null = null;
let pedido = 0;

/** Carrega o volume da planta (ou desliga, sem id). */
export async function carregarLuz(tipoId: string | null): Promise<void> {
  const meu = ++pedido;
  U.uLuzAtiva.value = 0;
  if (!tipoId) return;
  try {
    const r = await fetch(`/luz/${tipoId}.json`);
    if (!r.ok) return;
    const j = (await r.json()) as { min: [number, number, number]; tam: [number, number, number]; n: [number, number, number]; dados: string };
    if (meu !== pedido) return;
    const bin = atob(j.dados);
    const dados = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) dados[i] = bin.charCodeAt(i);
    const t = new THREE.Data3DTexture(dados, j.n[0], j.n[1], j.n[2]);
    t.format = THREE.RGBAFormat;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    atual?.dispose();
    atual = t;
    U.uLuzVol.value = t;
    U.uLuzMin.value.set(...j.min);
    U.uLuzTam.value.set(...j.tam);
    U.uLuzAtiva.value = 1;
  } catch {
    // sem o volume a cena continua com a luz ambiente uniforme
  }
}

/** 0 = dia (luz do céu pelas janelas), 1 = noite (luminárias). */
export function luzNoite(n: number): void {
  U.uLuzNoite.value = n;
}

/** Faz o material ler o volume de luz. Pode ser chamado mais de uma vez no mesmo material. */
export function comLuzVolume<T extends THREE.Material>(m: T): T {
  if (m.userData.luzVolume) return m;
  m.userData.luzVolume = true;
  const antes = m.onBeforeCompile;
  const chave = `${antes ? antes.toString() : ""}|luz-volume`;
  m.onBeforeCompile = (s, r) => {
    antes?.call(m, s, r);
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLuzPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvLuzPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vLuzPos;\nuniform highp sampler3D uLuzVol;\nuniform vec3 uLuzMin;\nuniform vec3 uLuzTam;\nuniform float uLuzNoite;\nuniform float uLuzAtiva;",
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
        {
          vec2 lv = texture(uLuzVol, clamp((vLuzPos - uLuzMin) / uLuzTam, 0.0, 1.0)).rg * 2.0;
          float fl = mix(1.0, mix(lv.r, lv.g, uLuzNoite), uLuzAtiva);
          reflectedLight.indirectDiffuse *= fl;
          reflectedLight.indirectSpecular *= mix(1.0, fl, 0.6);
        }`,
      );
  };
  m.customProgramCacheKey = () => chave;
  m.needsUpdate = true;
  return m;
}
