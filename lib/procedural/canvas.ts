import * as THREE from "three";

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function sorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tela(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("Canvas 2D indisponível.");
  return [c, g];
}

export function textura(c: HTMLCanvasElement, opts: { cor?: boolean; repetir?: [number, number]; aniso?: number } = {}): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.cor === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repetir) t.repeat.set(opts.repetir[0], opts.repetir[1]);
  t.anisotropy = opts.aniso ?? 8;
  t.needsUpdate = true;
  return t;
}

/** Ruído de valor suave e ladrilhável, em [0, 1]. */
export function ruido(larg: number, alt: number, celula: number, semente: number): Float32Array {
  const r = sorteio(semente);
  const gx = Math.max(1, Math.round(larg / celula));
  const gy = Math.max(1, Math.round(alt / celula));
  const grade = new Float32Array(gx * gy);
  for (let i = 0; i < grade.length; i++) grade[i] = r();
  const out = new Float32Array(larg * alt);
  const s = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < alt; y++) {
    const fy = (y / alt) * gy;
    const y0 = Math.floor(fy) % gy;
    const y1 = (y0 + 1) % gy;
    const ty = s(fy - Math.floor(fy));
    for (let x = 0; x < larg; x++) {
      const fx = (x / larg) * gx;
      const x0 = Math.floor(fx) % gx;
      const x1 = (x0 + 1) % gx;
      const tx = s(fx - Math.floor(fx));
      const a = (grade[y0 * gx + x0] as number) * (1 - tx) + (grade[y0 * gx + x1] as number) * tx;
      const b = (grade[y1 * gx + x0] as number) * (1 - tx) + (grade[y1 * gx + x1] as number) * tx;
      out[y * larg + x] = a * (1 - ty) + b * ty;
    }
  }
  return out;
}

/** Soma de oitavas de ruído (fbm), em [0, 1]. */
export function fbm(larg: number, alt: number, celula: number, oitavas: number, semente: number): Float32Array {
  const out = new Float32Array(larg * alt);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < oitavas; o++) {
    const n = ruido(larg, alt, Math.max(2, celula / 2 ** o), semente + o * 97);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) + (n[i] as number) * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) / total;
  return out;
}

/** Converte um mapa de alturas em mapa de normais (ladrilhável). */
export function normalDeAltura(altura: Float32Array, larg: number, alt: number, forca: number): HTMLCanvasElement {
  const [c, g] = tela(larg, alt);
  const img = g.createImageData(larg, alt);
  const h = (x: number, y: number) => altura[((y + alt) % alt) * larg + ((x + larg) % larg)] as number;
  for (let y = 0; y < alt; y++) {
    for (let x = 0; x < larg; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * forca;
      const dy = (h(x, y + 1) - h(x, y - 1)) * forca;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * larg + x) * 4;
      img.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Pinta um mapa escalar como tons entre duas cores. */
export function pintar(valores: Float32Array, larg: number, alt: number, cores: [string, string], contraste = 1): HTMLCanvasElement {
  const [c, g] = tela(larg, alt);
  const a = new THREE.Color(cores[0]);
  const b = new THREE.Color(cores[1]);
  const img = g.createImageData(larg, alt);
  const cor = new THREE.Color();
  for (let i = 0; i < valores.length; i++) {
    const t = Math.min(1, Math.max(0, ((valores[i] as number) - 0.5) * contraste + 0.5));
    cor.copy(a).lerp(b, t);
    img.data[i * 4] = cor.r * 255;
    img.data[i * 4 + 1] = cor.g * 255;
    img.data[i * 4 + 2] = cor.b * 255;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const cache = new Map<string, unknown>();
/** Cria uma vez e reaproveita (texturas e materiais procedurais). */
export function memo<T>(chave: string, criar: () => T): T {
  if (!cache.has(chave)) cache.set(chave, criar());
  return cache.get(chave) as T;
}
