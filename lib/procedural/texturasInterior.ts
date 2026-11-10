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

export function texCimento(): ParTextura {
  return memo("cimento", () => {
    const n = 512;
    const a = fbm(n, n, 200, 5, 31);
    const b = fbm(n, n, 30, 3, 77);
    const h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = (a[i] as number) * 0.7 + (b[i] as number) * 0.3;
    return { map: textura(pintar(h, n, n, ["#6f6a63", "#a39d94"], 1.5)), normalMap: textura(normalDeAltura(h, n, n, 2.2), { cor: false }) };
  });
}

/** Porcelanato cinza-claro em placas grandes (um ladrilho = 2 x 2 placas). */
export function texPorcelanato(escuro: boolean): ParTextura {
  return memo(`porcelanato-${escuro}`, () => {
    const n = 512;
    const a = fbm(n, n, 160, 4, 13);
    const c = pintar(a, n, n, escuro ? ["#56575b", "#6b6c70"] : ["#a9a8a5", "#c2c1bd"], 0.9);
    const g = c.getContext("2d");
    if (g) {
      g.strokeStyle = escuro ? "rgba(20,20,22,0.7)" : "rgba(70,70,72,0.55)";
      g.lineWidth = 2;
      for (const p of [0.5, n / 2 + 0.5]) {
        g.beginPath();
        g.moveTo(p, 0);
        g.lineTo(p, n);
        g.moveTo(0, p);
        g.lineTo(n, p);
        g.stroke();
      }
    }
    return { map: textura(c) };
  });
}

/** Granito preto São Gabriel: fundo preto com cristais claros miúdos. */
export function texGranitoPreto(): ParTextura {
  return memo("granito-preto", () => {
    const n = 256;
    const [c, g] = tela(n, n);
    g.fillStyle = "#0b0b0d";
    g.fillRect(0, 0, n, n);
    const r = sorteio(8);
    for (let i = 0; i < 1500; i++) {
      const v = 60 + r() * 150;
      g.fillStyle = `rgba(${v},${v},${v + 8},${0.25 + r() * 0.6})`;
      g.fillRect(r() * n, r() * n, 1 + r() * 1.4, 1 + r() * 1.4);
    }
    return { map: textura(c) };
  });
}

/** Pastilha hexagonal preta com rejunte. */
export function texHex(): ParTextura {
  return memo("hex", () => {
    const w = 256;
    const h = Math.round(256 * Math.sqrt(3));
    const [c, g] = tela(w, h);
    const alt = new Float32Array(w * h);
    g.fillStyle = "#3b3d42";
    g.fillRect(0, 0, w, h);
    const R = w / 6; // raio do hexágono
    const dx = R * 1.5;
    const dy = R * Math.sqrt(3);
    const r = sorteio(4);
    for (let i = -1; i < 6; i++) {
      for (let j = -1; j < 5; j++) {
        const cx = i * dx;
        const cy = j * dy + (i % 2 ? dy / 2 : 0);
        const tom = 14 + r() * 14;
        g.fillStyle = `rgb(${tom},${tom},${tom + 3})`;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          const px = cx + Math.cos(a) * (R - 3);
          const py = cy + Math.sin(a) * (R - 3);
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
      }
    }
    const img = g.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) alt[i] = (img[i * 4] as number) < 45 ? 1 : 0;
    return { map: textura(c), normalMap: textura(normalDeAltura(alt, w, h, 1.5), { cor: false }) };
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

/** Tapete patchwork de couro (sala). */
export function texPatchwork(): ParTextura {
  return memo("patchwork", () => {
    const n = 512;
    const [c, g] = tela(n, n);
    const r = sorteio(61);
    const q = 64;
    for (let y = 0; y < n; y += q) {
      for (let x = 0; x < n; x += q) {
        const t = r();
        const base = t > 0.7 ? [205, 196, 178] : t > 0.35 ? [150, 138, 120] : [98, 92, 84];
        g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        g.fillRect(x, y, q, q);
        for (let k = 0; k < 40; k++) {
          g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 240 : 0},${r() > 0.5 ? 220 : 0},0.06)`;
          g.fillRect(x + r() * q, y + r() * q, 3 + r() * 14, 2 + r() * 6);
        }
        g.strokeStyle = "rgba(40,36,30,0.55)";
        g.strokeRect(x + 0.5, y + 0.5, q - 1, q - 1);
      }
    }
    return { map: textura(c) };
  });
}

/** Tecido (linho, roupa de cama, cortina): trama fina com leve variação. */
export function texTecido(nome: string, cores: [string, string], dobras = false): ParTextura {
  return memo(`tecido-${nome}`, () => {
    const n = 256;
    const a = fbm(n, n, 70, 3, 41);
    const h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const trama = ((x % 4 < 2 ? 1 : 0) + (y % 4 < 2 ? 1 : 0)) * 0.12;
        const dobra = dobras ? 0.5 + 0.5 * Math.sin((x / n) * Math.PI * 2 * 9 + (a[y * n + x] as number) * 3) : 0;
        h[y * n + x] = (a[y * n + x] as number) * 0.5 + trama + dobra * 0.5;
      }
    }
    return { map: textura(pintar(h, n, n, cores, 0.9)), normalMap: textura(normalDeAltura(h, n, n, dobras ? 5 : 1.6), { cor: false }) };
  });
}

/** Tela da TV com o logo ZP (render 07). */
export function texTV(fonte: string): THREE.CanvasTexture {
  return memo("tv", () => {
    const [c, g] = tela(512, 288);
    const grad = g.createLinearGradient(0, 0, 512, 288);
    grad.addColorStop(0, "#1a2140");
    grad.addColorStop(1, "#11162b");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = "#cfd3da";
    g.textAlign = "center";
    g.font = `300 120px ${fonte}`;
    g.fillText("ZP", 256, 170);
    g.font = `400 17px ${fonte}`;
    g.fillText("E M P R E E N D I M E N T O S", 256, 204);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Quadro abstrato em preto e branco (quarto). Ilustração genérica, sem reproduzir obra alguma. */
export function texQuadro(): THREE.CanvasTexture {
  return memo("quadro", () => {
    const w = 256;
    const h = 352;
    const a = fbm(w, h, 90, 5, 55);
    const c = pintar(a, w, h, ["#101010", "#f4f4f4"], 3.2);
    const g = c.getContext("2d");
    if (g) {
      const r = sorteio(12);
      for (let i = 0; i < 26; i++) {
        const tom = r() > 0.5 ? 255 : 0;
        g.strokeStyle = `rgba(${tom},${tom},${tom},${0.15 + r() * 0.3})`;
        g.lineWidth = 1 + r() * 7;
        g.beginPath();
        g.moveTo(r() * w, r() * h);
        g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
        g.stroke();
      }
    }
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
