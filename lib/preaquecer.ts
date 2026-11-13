import * as THREE from "three";

interface ProgramaThree {
  isReady?: () => boolean;
  getUniforms?: () => unknown;
  getAttributes?: () => unknown;
}

/**
 * Prepara um trecho da cena antes de ele aparecer: envia as texturas para a GPU e compila os shaders com a
 * mesma iluminação, névoa e ambiente da cena real. Sem isso, o primeiro quadro dentro do apartamento fazia
 * tudo de uma vez — no iPhone, dezenas de segundos de tela parada.
 *
 * O trabalho é dividido em pedaços de poucos milissegundos (um objeto por vez, com pausas), para não
 * congelar a tela enquanto o visitante lê a ficha da unidade.
 *
 * `comComposicao`: com pós-processamento a cena é desenhada numa textura (sem tone mapping, cor linear) e
 * os programas são outros; compila exatamente as variantes que serão usadas.
 *
 * Devolve uma função que interrompe o trabalho.
 */
export function preaquecer(gl: THREE.WebGLRenderer, cena: THREE.Scene, camera: THREE.Camera, alvo: THREE.Object3D, comComposicao: boolean, aoTerminar?: () => void): () => void {
  const fila: THREE.Object3D[] = [];
  alvo.traverse((o) => {
    if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) fila.push(o);
  });
  const enviadas = new Set<THREE.Texture>();
  let i = 0;
  let vivo = true;
  let id = 0;
  const rt = comComposicao ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;

  const enviarTexturas = (m: THREE.Material) => {
    for (const v of Object.values(m)) {
      const t = v as THREE.Texture | null;
      if (!t || !t.isTexture || enviadas.has(t)) continue;
      enviadas.add(t);
      const img = t.image as { width?: number; complete?: boolean } | null;
      // só o que já tem imagem pronta (as que ainda baixam sobem sozinhas quando chegam)
      if (img && (img.width ?? 0) > 0 && img.complete !== false) gl.initTexture(t);
    }
  };

  const passo = () => {
    if (!vivo) return;
    const t0 = performance.now();
    const anterior = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    try {
      while (i < fila.length && performance.now() - t0 < 6) {
        const obj = fila[i++] as THREE.Object3D;
        const mats = gl.compile(obj, camera, cena);
        for (const m of mats) {
          enviarTexturas(m);
          // termina a ligação do programa aqui (se já compilou), e não no primeiro quadro lá dentro
          const p = (gl.properties.get(m) as { currentProgram?: ProgramaThree }).currentProgram;
          if (p?.isReady?.()) {
            p.getUniforms?.();
            p.getAttributes?.();
          }
        }
      }
    } finally {
      gl.setRenderTarget(anterior);
    }
    if (i < fila.length) id = window.setTimeout(passo, 24);
    else {
      rt?.dispose();
      aoTerminar?.();
    }
  };
  id = window.setTimeout(passo, 0);
  return () => {
    vivo = false;
    window.clearTimeout(id);
    rt?.dispose();
  };
}
