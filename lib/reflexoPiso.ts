import * as THREE from "three";

/**
 * Reflexo do próprio cômodo no porcelanato. Uma "sonda" (cubo de 128 px, o mesmo tamanho do mapa de ambiente
 * da cena, para os shaders não mudarem) fotografa o cômodo do meio dele; o piso lê essa foto com projeção em
 * caixa: o reflexo da janela cai no lugar certo do chão, e não "no infinito" como num mapa de ambiente comum.
 * Só o brilho especular vem da sonda; a luz difusa continua a do ambiente da cena, igual à das paredes.
 */
export interface SondaPiso {
  rt: THREE.WebGLCubeRenderTarget;
  camera: THREE.CubeCamera;
  caixaMin: THREE.Vector3;
  caixaMax: THREE.Vector3;
  centro: THREE.Vector3;
  /** A foto já filtrada por rugosidade (PMREM), lida pelo shader do piso. */
  mapa: { value: THREE.Texture | null };
  forca: { value: number };
  pmrem: THREE.PMREMGenerator | null;
  filtrada: THREE.WebGLRenderTarget | null;
  /** Quantas vezes a sonda já foi fotografada (diagnóstico). */
  fotos: number;
}

let unica: SondaPiso | null = null;

/** Uma sonda só para a sessão: o material do piso é compartilhado entre as unidades. */
export function criarSonda(): SondaPiso {
  if (unica) return unica;
  const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false });
  unica = {
    rt,
    camera: new THREE.CubeCamera(0.05, 600, rt),
    caixaMin: new THREE.Vector3(),
    caixaMax: new THREE.Vector3(1, 1, 1),
    centro: new THREE.Vector3(),
    mapa: { value: null },
    forca: { value: 0 },
    pmrem: null,
    filtrada: null,
    fotos: 0,
  };
  return unica;
}

/** Faz o material do piso ler a sonda com projeção em caixa (uma vez por material). */
export function comProjecaoCaixa(m: THREE.MeshStandardMaterial, sonda: SondaPiso): void {
  if (m.userData.caixa) return;
  m.userData.caixa = true;
  m.userData.sonda = sonda;
  const antes = m.onBeforeCompile;
  const chaveAntes = m.customProgramCacheKey();
  m.onBeforeCompile = (s, r) => {
    antes?.call(m, s, r);
    s.uniforms.uCaixaMin = { value: sonda.caixaMin };
    s.uniforms.uCaixaMax = { value: sonda.caixaMax };
    s.uniforms.uSonda = { value: sonda.centro };
    s.uniforms.uSondaMapa = sonda.mapa;
    s.uniforms.uSondaForca = sonda.forca;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPisoMundo;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvPisoMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vPisoMundo;\nuniform vec3 uCaixaMin;\nuniform vec3 uCaixaMax;\nuniform vec3 uSonda;\nuniform sampler2D uSondaMapa;\nuniform float uSondaForca;",
      )
      .replace(
        "#include <envmap_physical_pars_fragment>",
        THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
          "vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n\t\t\treturn envMapColor.rgb * envMapIntensity;",
          `vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
          vec3 ambiente = envMapColor.rgb * envMapIntensity;
          // projeção em caixa: onde o raio refletido sai do cômodo, visto do ponto onde a sonda foi tirada
          vec3 d = normalize( reflectVec );
          vec3 t = max( ( uCaixaMax - vPisoMundo ) / d, ( uCaixaMin - vPisoMundo ) / d );
          vec3 dirSonda = vPisoMundo + d * min( min( t.x, t.y ), t.z ) - uSonda;
          vec3 sonda = textureCubeUV( uSondaMapa, dirSonda, roughness ).rgb;
          return mix( ambiente, sonda * uSondaForca, step( 0.5, uSondaForca ) );`,
        ),
      );
  };
  m.customProgramCacheKey = () => `${chaveAntes}|caixa`;
  // porcelanato polido: reflexo mais nítido que o de antes
  m.roughness = 0.2;
  m.needsUpdate = true;
}

/**
 * Fotografa o cômodo para a sonda. `caixa` em coordenadas do mundo; `escondidos` (o próprio piso) saem da foto
 * para o piso não ler a textura em que está sendo desenhado. O apartamento pode estar invisível: os grupos acima
 * dele ficam visíveis só durante a foto.
 */
export function fotografarSonda(gl: THREE.WebGLRenderer, cena: THREE.Scene, sonda: SondaPiso, apto: THREE.Object3D, caixaMin: THREE.Vector3, caixaMax: THREE.Vector3, centro: THREE.Vector3, escondidos: THREE.Object3D[]): void {
  sonda.caixaMin.copy(caixaMin);
  sonda.caixaMax.copy(caixaMax);
  sonda.centro.copy(centro);
  sonda.camera.position.copy(centro);
  sonda.camera.updateMatrixWorld(true);
  const vis: [THREE.Object3D, boolean][] = [];
  for (let o: THREE.Object3D | null = apto; o; o = o.parent) {
    vis.push([o, o.visible]);
    o.visible = true;
  }
  for (const o of escondidos) {
    vis.push([o, o.visible]);
    o.visible = false;
  }
  try {
    sonda.camera.update(gl, cena);
    sonda.pmrem ??= new THREE.PMREMGenerator(gl);
    sonda.filtrada = sonda.pmrem.fromCubemap(sonda.rt.texture, sonda.filtrada ?? undefined);
    sonda.mapa.value = sonda.filtrada.texture;
    sonda.forca.value = 1;
    sonda.fotos++;
  } finally {
    for (const [o, v] of vis) o.visible = v;
  }
}
