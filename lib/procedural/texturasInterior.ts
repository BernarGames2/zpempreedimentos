import * as THREE from "three";
import { fbm, memo, normalDeAltura, pintar, ruido, sorteio, tela, textura } from "./canvas";

export interface ParTextura {
  map: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
}

/** Madeira com veio vertical; `relevo` gera o efeito ondulado/escovado dos painéis. */
export function texMadeira(nome: string, cores: [string, string], relevo: number): ParTextura {
  return memo(`madeira-${nome}`, () => {
    const n = 512;
    const largo = fbm(n, n, 180, 3, 21);
    const fino = ruido(n, n, 6, 5);
    const h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        // veios: listras verticais deformadas por ruído largo
        const desvio = (largo[i] as number) * 5 + (fino[((y >> 3) * n + x) % (n * n)] as number) * 0.25;
        const veio = 0.5 + 0.5 * Math.sin((x / n) * Math.PI * 2 * 22 + desvio * 2.2);
        h[i] = Math.pow(veio, 1.6) * 0.8 + (fino[i] as number) * 0.2;
      }
    }
    const map = textura(pintar(h, n, n, cores, 0.75));
    const normalMap = relevo > 0 ? textura(normalDeAltura(h, n, n, relevo), { cor: false }) : undefined;
    return { map, normalMap };
  });
}

/** Jardim vertical: massa de folhagem (samambaias e folhas miúdas). */
export function texFolhagem(): ParTextura {
  return memo("folhagem", () => {
    const n = 512;
    const [c, g] = tela(n, n);
    g.fillStyle = "#12240f";
    g.fillRect(0, 0, n, n);
    const r = sorteio(19);
    for (let i = 0; i < 2600; i++) {
      const x = r() * n;
      const y = r() * n;
      const comp = 10 + r() * 30;
      const ang = Math.PI / 2 + (r() - 0.5) * 1.6;
      const tom = r();
      const verde = tom > 0.9 ? [150, 110, 70] : [30 + tom * 60, 85 + tom * 95, 25 + tom * 40];
      g.strokeStyle = `rgb(${verde[0]},${verde[1]},${verde[2]})`;
      g.lineWidth = 1 + r() * 1.6;
      // fronde: haste com folíolos dos dois lados
      const ex = x + Math.cos(ang) * comp;
      const ey = y + Math.sin(ang) * comp;
      for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]] as const) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.lineTo(ex + ox, ey + oy);
        for (let k = 1; k < 6; k++) {
          const px = x + ox + (ex - x) * (k / 6);
          const py = y + oy + (ey - y) * (k / 6);
          const l = (1 - k / 7) * comp * 0.3;
          g.moveTo(px - Math.sin(ang) * l, py + Math.cos(ang) * l);
          g.lineTo(px, py);
          g.lineTo(px + Math.sin(ang) * l, py - Math.cos(ang) * l);
        }
        g.stroke();
      }
    }
    const img = g.getImageData(0, 0, n, n).data;
    const alt = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) alt[i] = (img[i * 4 + 1] as number) / 255;
    return { map: textura(c), normalMap: textura(normalDeAltura(alt, n, n, 3), { cor: false }) };
  });
}

/** Cartão de folhas com alfa, para dar volume ao jardim vertical. */
export function texCartaoFolhas(): THREE.CanvasTexture {
  return memo("cartao-folhas", () => {
    const n = 256;
    const [c, g] = tela(n, n);
    g.clearRect(0, 0, n, n);
    const r = sorteio(23);
    for (let f = 0; f < 7; f++) {
      const ang = -Math.PI / 2 + (f - 3) * 0.42 + (r() - 0.5) * 0.2;
      const comp = 90 + r() * 30;
      const tom = 0.35 + r() * 0.65;
      g.strokeStyle = `rgb(${Math.round(40 + tom * 50)},${Math.round(110 + tom * 90)},${Math.round(35 + tom * 35)})`;
      g.lineWidth = 3;
      for (let k = 0; k < 14; k++) {
        const t = k / 14;
        const px = n / 2 + Math.cos(ang) * comp * t;
        const py = n - 12 + Math.sin(ang) * comp * t;
        const l = (1 - t * 0.8) * 20;
        g.beginPath();
        g.moveTo(px - Math.sin(ang) * l, py + Math.cos(ang) * l - 5);
        g.lineTo(px, py);
        g.lineTo(px + Math.sin(ang) * l, py - Math.cos(ang) * l - 5);
        g.stroke();
      }
    }
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

