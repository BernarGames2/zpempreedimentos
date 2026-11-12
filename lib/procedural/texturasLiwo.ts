import * as THREE from "three";
import { fbm, memo, normalDeAltura, pintar, ruido, sorteio, tela, textura } from "./canvas";
import type { ParTextura } from "./texturasInterior";

/**
 * Texturas do Liwo geradas por código (sem arquivos de imagem nem serviço pago).
 * Cores tiradas dos renders oficiais: concreto aparente quente, painéis terracota,
 * bronze nos gradis, madeira clara, mármore branco e porcelanato bege.
 */

/** Concreto aparente com manchas suaves e as juntas das fôrmas. */
export function texConcreto(claro = false): ParTextura {
  return memo(`concreto-${claro}`, () => {
    const n = 512;
    const a = fbm(n, n, 150, 5, claro ? 41 : 43);
    const b = ruido(n, n, 3, 9);
    const h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = (a[i] as number) * 0.85 + (b[i] as number) * 0.15;
    const c = pintar(h, n, n, claro ? ["#b9b2a7", "#d3cdc3"] : ["#9a948b", "#bdb6ab"], 1.6);
    const g = c.getContext("2d");
    if (g) {
      g.strokeStyle = "rgba(60,55,50,0.28)";
      g.lineWidth = 2;
      for (const y of [0.5, n / 2 + 0.5]) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(n, y);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0.5, 0);
      g.lineTo(0.5, n);
      g.stroke();
    }
    return { map: textura(c), normalMap: textura(normalDeAltura(h, n, n, 1.4), { cor: false }) };
  });
}

/** Painéis terracota/bronze das empenas, com juntas verticais finas. */
export function texTerracota(): ParTextura {
  return memo("terracota", () => {
    const n = 256;
    const a = fbm(n, n, 90, 4, 61);
    const c = pintar(a, n, n, ["#6e4a34", "#8a5e43"], 1.2);
    const g = c.getContext("2d");
    if (g) {
      g.fillStyle = "rgba(35,22,15,0.45)";
      for (const x of [0, n / 2]) g.fillRect(x, 0, 2, n);
      g.fillStyle = "rgba(255,220,190,0.06)";
      for (const x of [3, n / 2 + 3]) g.fillRect(x, 0, 2, n);
    }
    return { map: textura(c) };
  });
}

/** Vitrine do térreo: caixilhos finos e lojas iluminadas ao fundo. `emissivo` devolve só a luz. */
export function texVitrine(emissivo: boolean): THREE.CanvasTexture {
  return memo(`vitrine-${emissivo}`, () => {
    const w = 1024;
    const h = 256;
    const [c, g] = tela(w, h);
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (emissivo) {
      grad.addColorStop(0, "#4a3218");
      grad.addColorStop(1, "#d79a55");
    } else {
      grad.addColorStop(0, "#3c4d66");
      grad.addColorStop(0.5, "#8a7a63");
      grad.addColorStop(1, "#d3a46c");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const r = sorteio(5);
    for (let x = 30; x < w - 40; x += 40 + r() * 70) {
      g.fillStyle = emissivo ? `rgba(255,${200 + r() * 40},150,${0.25 + r() * 0.3})` : `rgba(240,225,200,${0.25 + r() * 0.35})`;
      g.fillRect(x, 120 + r() * 50, 18 + r() * 40, 80 + r() * 40);
    }
    g.fillStyle = emissivo ? "#000" : "#20201f";
    for (let x = 0; x < w; x += w / 8) g.fillRect(x, 0, 5, h);
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Painel metálico perfurado claro do térreo, levemente iluminado por trás. */
export function texPerfurado(emissivo: boolean): THREE.CanvasTexture {
  return memo(`perfurado-${emissivo}`, () => {
    const w = 512;
    const h = 128;
    const [c, g] = tela(w, h);
    g.fillStyle = emissivo ? "#000" : "#d8d2c8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = emissivo ? "#7a5a34" : "#b3aa9c";
    for (let y = 4; y < h; y += 8) for (let x = (y / 8) % 2 ? 8 : 4; x < w; x += 8) g.fillRect(x, y, 2.4, 2.4);
    return textura(c, { repetir: [6, 2] });
  });
}

/** Nome do empreendimento em letras finas (texto simples, sem reproduzir o logotipo). */
export function texLetreiro(fonte: string, texto: string): THREE.CanvasTexture {
  return memo(`letreiro-${texto}`, () => {
    const [c, g] = tela(1024, 320);
    g.clearRect(0, 0, 1024, 320);
    g.fillStyle = "#f6f3ee";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `200 230px ${fonte}`;
    g.fillText(texto.toUpperCase(), 512, 170);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Ramos pendentes das floreiras (alfa): folhas miúdas ao longo de hastes que caem. */
export function texPendente(): THREE.CanvasTexture {
  return memo("pendente", () => {
    const w = 128;
    const h = 256;
    const [c, g] = tela(w, h);
    g.clearRect(0, 0, w, h);
    const r = sorteio(8);
    for (let k = 0; k < 9; k++) {
      let x = 16 + r() * (w - 32);
      for (let y = 0; y < h - 10; y += 6) {
        x += (r() - 0.5) * 4;
        const tom = 70 + r() * 90;
        g.fillStyle = `rgb(${Math.round(tom * 0.55)},${Math.round(tom)},${Math.round(tom * 0.35)})`;
        g.beginPath();
        g.ellipse(x + (r() - 0.5) * 10, y, 4 + r() * 4, 2.5 + r() * 2, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Mármore branco com veios cinza (bancada da cozinha e lareira dos renders). */
export function texMarmore(nome: string, cores: [string, string], veio: string): ParTextura {
  return memo(`marmore-${nome}`, () => {
    const n = 512;
    const a = fbm(n, n, 220, 5, nome.length * 13 + 7);
    const b = fbm(n, n, 60, 4, 91);
    const h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) {
      const x = i % n;
      const y = Math.floor(i / n);
      const v = Math.abs(Math.sin((x + y * 0.6) / n * Math.PI * 3 + (a[i] as number) * 9 + (b[i] as number) * 2));
      h[i] = v;
    }
    const c = pintar(a, n, n, cores, 0.8);
    const g = c.getContext("2d");
    if (g) {
      const img = g.getImageData(0, 0, n, n);
      const cv = new THREE.Color(veio);
      for (let i = 0; i < n * n; i++) {
        const t = Math.pow(1 - Math.min(1, (h[i] as number) * 9), 3) * 0.75;
        img.data[i * 4] = (img.data[i * 4] as number) * (1 - t) + cv.r * 255 * t;
        img.data[i * 4 + 1] = (img.data[i * 4 + 1] as number) * (1 - t) + cv.g * 255 * t;
        img.data[i * 4 + 2] = (img.data[i * 4 + 2] as number) * (1 - t) + cv.b * 255 * t;
      }
      g.putImageData(img, 0, 0);
    }
    return { map: textura(c) };
  });
}

/** Porcelanato bege de placas grandes (piso dos renders), com juntas finas. */
/** Pintura sobre massa corrida: quase lisa, com um relevo fino que quebra o brilho uniforme da parede. */
export function texReboco(): ParTextura {
  return memo("reboco", () => {
    const n = 256;
    const a = ruido(n, n, 3, 11);
    const b = fbm(n, n, 48, 3, 5);
    const h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = (a[i] as number) * 0.5 + (b[i] as number) * 0.5;
    return { map: textura(pintar(h, n, n, ["#e7e2d8", "#efebe3"], 1)), normalMap: textura(normalDeAltura(h, n, n, 1.5), { cor: false }) };
  });
}

export function texPorcelanatoBege(externo: boolean): ParTextura {
  return memo(`porcelanato-bege-${externo}`, () => {
    const n = 512;
    const a = fbm(n, n, 180, 4, 17);
    const c = pintar(a, n, n, externo ? ["#b9b0a2", "#c9c0b2"] : ["#d6cdbf", "#e4ddd1"], 0.7);
    const g = c.getContext("2d");
    if (g) {
      g.strokeStyle = "rgba(120,110,95,0.35)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0.5, 0);
      g.lineTo(0.5, n);
      g.moveTo(0, 0.5);
      g.lineTo(n, 0.5);
      g.stroke();
    }
    return { map: textura(c) };
  });
}

/** Tecido bouclé caramelo (sofá e cabeceira dos renders). */
export function texBoucle(nome: string, cores: [string, string]): ParTextura {
  return memo(`boucle-${nome}`, () => {
    const n = 256;
    const a = ruido(n, n, 2, 31);
    const b = fbm(n, n, 40, 3, 7);
    const h = new Float32Array(n * n);
    for (let i = 0; i < h.length; i++) h[i] = (a[i] as number) * 0.7 + (b[i] as number) * 0.3;
    return { map: textura(pintar(h, n, n, cores, 1.3)), normalMap: textura(normalDeAltura(h, n, n, 4), { cor: false }) };
  });
}

/** Palhinha (rattan) dos assentos das banquetas. */
export function texPalhinha(): ParTextura {
  return memo("palhinha", () => {
    const n = 128;
    const [c, g] = tela(n, n);
    g.fillStyle = "#d9bf8f";
    g.fillRect(0, 0, n, n);
    g.strokeStyle = "rgba(120,90,50,0.6)";
    g.lineWidth = 2;
    for (let i = -n; i < n * 2; i += 10) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + n, n);
      g.moveTo(i, n);
      g.lineTo(i + n, 0);
      g.stroke();
    }
    return { map: textura(c) };
  });
}

/** Tela de TV desligada (preta, com reflexo suave). */
export function texTVDesligada(): THREE.CanvasTexture {
  return memo("tv-desligada", () => {
    const [c, g] = tela(256, 144);
    const grad = g.createLinearGradient(0, 0, 256, 144);
    grad.addColorStop(0, "#1b1c1f");
    grad.addColorStop(0.45, "#0b0b0d");
    grad.addColorStop(1, "#141518");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 144);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Quadro em degradê laranja (suíte) e quadro de formas orgânicas em tons terrosos (living). Genéricos. */
export function texQuadro(tipo: "degrade" | "formas"): THREE.CanvasTexture {
  return memo(`quadro-${tipo}`, () => {
    const w = 256;
    const h = 320;
    const [c, g] = tela(w, h);
    if (tipo === "degrade") {
      const grad = g.createLinearGradient(0, 0, w * 0.4, h);
      grad.addColorStop(0, "#f1a15a");
      grad.addColorStop(0.55, "#e0643a");
      grad.addColorStop(1, "#9c2f22");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    } else {
      g.fillStyle = "#b9a789";
      g.fillRect(0, 0, w, h);
      const r = sorteio(23);
      const cores = ["#7c4a2e", "#c9773f", "#55643f", "#2f4d5c", "#d8b06a", "#8e3b2c"];
      for (let i = 0; i < 18; i++) {
        g.fillStyle = cores[i % cores.length] as string;
        g.beginPath();
        g.ellipse(r() * w, r() * h, 18 + r() * 50, 12 + r() * 40, r() * 3, 0, Math.PI * (1 + r()));
        g.fill();
      }
    }
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Livros na estante: lombadas em tons neutros. */
export function texLivros(): THREE.CanvasTexture {
  return memo("livros", () => {
    const w = 256;
    const h = 64;
    const [c, g] = tela(w, h);
    const r = sorteio(4);
    const cores = ["#e9e3d8", "#c9b9a0", "#3b3b3b", "#a8875f", "#d8d0c2", "#6d5a45"];
    for (let x = 0; x < w; ) {
      const l = 6 + r() * 14;
      g.fillStyle = cores[Math.floor(r() * cores.length)] as string;
      g.fillRect(x, h * (0.08 + r() * 0.2), l - 1, h);
      x += l;
    }
    return textura(c);
  });
}
