import * as THREE from "three";
import { fbm, memo, sorteio, tela, textura } from "./canvas";

const QUENTE = "#ffcf8a";

/** Janela com veneziana: metade persiana, metade vidro (acesa ou apagada). */
export function texJanela(acesa: boolean): THREE.CanvasTexture {
  return memo(`janela-${acesa}`, () => {
    const [c, g] = tela(128, 144);
    g.fillStyle = "#15171c";
    g.fillRect(0, 0, 128, 144);
    // persiana
    g.fillStyle = "#23262d";
    g.fillRect(8, 8, 52, 128);
    g.strokeStyle = "#0c0d10";
    g.lineWidth = 2;
    for (let y = 14; y < 136; y += 7) {
      g.beginPath();
      g.moveTo(8, y);
      g.lineTo(60, y);
      g.stroke();
    }
    // vidro
    const grad = g.createLinearGradient(0, 8, 0, 136);
    if (acesa) {
      grad.addColorStop(0, "#ffe2b0");
      grad.addColorStop(1, "#e9a85c");
    } else {
      grad.addColorStop(0, "#3b5a8f");
      grad.addColorStop(1, "#1a2740");
    }
    g.fillStyle = grad;
    g.fillRect(66, 8, 54, 128);
    if (acesa) {
      g.fillStyle = "rgba(120,70,30,0.35)";
      for (let x = 70; x < 120; x += 9) g.fillRect(x, 8, 3, 128);
    }
    return textura(c);
  });
}

/** Emissivo que acompanha `texJanela(true)`: só o vidro brilha. */
export function texJanelaLuz(): THREE.CanvasTexture {
  return memo("janela-luz", () => {
    const [c, g] = tela(128, 144);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 144);
    const grad = g.createLinearGradient(0, 8, 0, 136);
    grad.addColorStop(0, "#ffd9a0");
    grad.addColorStop(1, "#c98a45");
    g.fillStyle = grad;
    g.fillRect(66, 8, 54, 128);
    return textura(c);
  });
}

/** Janelinha quadrada com caixilho escuro, acesa. */
export function texJanelinha(): THREE.CanvasTexture {
  return memo("janelinha", () => {
    const [c, g] = tela(64, 64);
    g.fillStyle = "#14161a";
    g.fillRect(0, 0, 64, 64);
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, "#fff0cf");
    grad.addColorStop(1, "#f0b56a");
    g.fillStyle = grad;
    g.fillRect(7, 7, 50, 50);
    g.fillStyle = "#14161a";
    g.fillRect(30, 7, 4, 50);
    return textura(c);
  });
}

/** Porta de vidro da sacada vista de fora: caixilho preto, cortina e luz quente. */
export function texPortaVidro(): THREE.CanvasTexture {
  return memo("porta-vidro", () => {
    const [c, g] = tela(256, 256);
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#ffe6b8");
    grad.addColorStop(0.55, "#f2b468");
    grad.addColorStop(1, "#9a5f2c");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    // cortina de um lado
    const r = sorteio(7);
    for (let x = 150; x < 250; x += 6) {
      g.fillStyle = `rgba(90,60,35,${0.18 + r() * 0.2})`;
      g.fillRect(x, 0, 3, 256);
    }
    // silhueta de móveis
    g.fillStyle = "rgba(60,35,20,0.45)";
    g.fillRect(20, 190, 110, 66);
    g.fillStyle = "#0e0f12";
    g.fillRect(0, 0, 256, 7);
    g.fillRect(0, 0, 6, 256);
    g.fillRect(250, 0, 6, 256);
    g.fillRect(125, 0, 6, 256);
    return textura(c);
  });
}

/** Mancha de luz suave (radial), para spots, balizadores e lavagens de luz. */
export function texBrilho(): THREE.CanvasTexture {
  return memo("brilho", () => {
    const [c, g] = tela(128, 128);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.6, "rgba(255,255,255,0.13)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Cone de luz de baixo para cima (uplight lavando o muro). A base fica em v = 0. */
export function texCone(): THREE.CanvasTexture {
  return memo("cone", () => {
    const [c, g] = tela(128, 256);
    const img = g.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
      const v = 1 - y / 255; // 0 na base
      for (let x = 0; x < 128; x++) {
        const u = (x - 63.5) / 64;
        const abertura = 0.16 + v * 0.75;
        const lateral = Math.exp(-Math.pow(u / abertura, 2) * 2.2);
        const queda = Math.pow(1 - v, 1.7) * (0.25 + 0.75 * Math.min(1, v * 14));
        const a = Math.min(1, lateral * queda * 1.5);
        const i = (y * 128 + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 255;
        img.data[i + 2] = 255;
        img.data[i + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Granito/textura cinza das bordas de laje das sacadas corridas. */
export function texGranito(): THREE.CanvasTexture {
  return memo("granito", () => {
    const n = 256;
    const base = fbm(n, n, 24, 4, 11);
    const [c, g] = tela(n, n);
    const img = g.createImageData(n, n);
    const r = sorteio(3);
    for (let i = 0; i < n * n; i++) {
      const grao = r();
      const v = 150 + (base[i] as number) * 50 + (grao > 0.82 ? 40 : grao < 0.14 ? -45 : 0);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v + 2;
      img.data[i * 4 + 2] = v + 7;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return textura(c, { repetir: [4, 0.6] });
  });
}

function fundoQuente(g: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#fff1d2");
  grad.addColorStop(1, QUENTE);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

/**
 * Painel de relevo com arcos curvos iluminados por trás (hall, render 02).
 * `emissivo` devolve só a luz dos rasgos.
 */
export function texArcos(emissivo: boolean): THREE.CanvasTexture {
  return memo(`arcos-${emissivo}`, () => {
    const col = 4;
    const lin = 9;
    const s = 128;
    const [c, g] = tela(col * s, lin * s);
    g.fillStyle = emissivo ? "#000" : "#b9bdc6";
    g.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < lin; j++) {
      for (let i = 0; i < col; i++) {
        const x = i * s;
        const y = j * s;
        if (!emissivo) {
          const sombra = g.createLinearGradient(x, y, x + s, y + s);
          sombra.addColorStop(0, "#c9cdd5");
          sombra.addColorStop(1, "#a3a8b2");
          g.fillStyle = sombra;
          g.fillRect(x + 1.5, y + 1.5, s - 3, s - 3);
        }
        // arco: quarto de círculo alternando o canto, como no render
        const canto = (i + j) % 2;
        const cx = canto === 0 ? x + s * 1.05 : x - s * 0.05;
        const cy = y - s * 0.1;
        g.save();
        g.beginPath();
        g.rect(x + 6, y + 6, s - 12, s - 12);
        g.clip();
        g.lineCap = "round";
        g.strokeStyle = emissivo ? QUENTE : "#5d4a34";
        g.lineWidth = emissivo ? 9 : 15;
        g.beginPath();
        if (canto === 0) g.arc(cx, cy, s * 0.92, Math.PI * 0.52, Math.PI * 0.98);
        else g.arc(cx, cy, s * 0.92, Math.PI * 0.02, Math.PI * 0.48);
        g.stroke();
        if (!emissivo) {
          g.strokeStyle = "#ffdca6";
          g.lineWidth = 6;
          g.stroke();
        }
        g.restore();
      }
    }
    return textura(c);
  });
}

/** Painel vazado de desenho geométrico angular, iluminado por trás (muro, render 01). */
export function texTrelica(modo: "cor" | "luz" | "escuro"): THREE.CanvasTexture {
  return memo(`trelica-${modo}`, () => {
    const w = 1024;
    const h = 512;
    const [c, g] = tela(w, h);
    if (modo === "luz") fundoQuente(g, w, h);
    else if (modo === "cor") { g.fillStyle = "#d9b98a"; g.fillRect(0, 0, w, h); }
    else {
      g.fillStyle = "#1d2027";
      g.fillRect(0, 0, w, h);
    }
    const barra = modo === "luz" ? "#000" : modo === "cor" ? "#eceef1" : "#3a3e48";
    g.strokeStyle = barra;
    g.lineCap = "square";
    const r = sorteio(42);
    const cols = 8;
    const cw = w / cols;
    // montantes
    g.lineWidth = 16;
    for (let i = 0; i <= cols; i++) {
      g.beginPath();
      g.moveTo(i * cw, 0);
      g.lineTo(i * cw, h);
      g.stroke();
    }
    g.lineWidth = 22;
    g.strokeRect(0, 0, w, h);
    // diagonais em ziguezague, diferentes em cada módulo
    g.lineWidth = 13;
    for (let i = 0; i < cols; i++) {
      const x0 = i * cw;
      let y = 0;
      let lado = r() > 0.5;
      while (y < h) {
        const passo = 70 + r() * 150;
        const y2 = Math.min(h, y + passo);
        g.beginPath();
        g.moveTo(lado ? x0 : x0 + cw, y);
        g.lineTo(lado ? x0 + cw : x0, y2);
        g.stroke();
        if (r() > 0.55) {
          const ym = (y + y2) / 2;
          g.beginPath();
          g.moveTo(x0 + cw / 2, ym);
          g.lineTo(lado ? x0 : x0 + cw, Math.min(h, y2 + 40));
          g.stroke();
        }
        y = y2;
        lado = !lado;
      }
    }
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Fachada de vidro do hall: caixilho preto, reflexo azulado e o interior quente ao fundo. */
export function texHall(emissivo: boolean): THREE.CanvasTexture {
  return memo(`hall-${emissivo}`, () => {
    const w = 512;
    const h = 768;
    const [c, g] = tela(w, h);
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (emissivo) {
      grad.addColorStop(0, "#3a2a18");
      grad.addColorStop(0.45, "#6b4a26");
      grad.addColorStop(1, "#c98f4c");
    } else {
      grad.addColorStop(0, "#27406e");
      grad.addColorStop(0.5, "#4a4f66");
      grad.addColorStop(1, "#c79a5e");
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // interior: poltronas claras e painel ripado
    g.fillStyle = emissivo ? "rgba(255,225,170,0.55)" : "rgba(255,235,200,0.5)";
    g.fillRect(70, 640, 90, 60);
    g.fillRect(180, 650, 80, 50);
    g.fillStyle = emissivo ? "rgba(255,200,120,0.25)" : "rgba(40,30,20,0.3)";
    for (let x = 300; x < 500; x += 14) g.fillRect(x, 330, 6, 400);
    // faixa branca intermediária (marquise interna)
    g.fillStyle = emissivo ? "#2a2218" : "#e9e6df";
    g.fillRect(0, 262, w, 34);
    // caixilhos
    g.fillStyle = emissivo ? "#000" : "#0b0c0f";
    for (const x of [0, 170, 338, w - 8]) g.fillRect(x, 0, 8, h);
    g.fillRect(0, 0, w, 8);
    g.fillRect(0, 296, w, 6);
    g.fillRect(0, h - 10, w, 10);
    // porta pivotante e puxador longo
    g.fillRect(250, 300, 5, h - 300);
    g.fillStyle = emissivo ? "#000" : "#c9ccd2";
    g.fillRect(266, 400, 5, 260);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Letreiro "LIVE ZP connect" em metal escovado. */
export function texLetreiro(fonte: string): THREE.CanvasTexture {
  return memo("letreiro", () => {
    const [c, g] = tela(1024, 384);
    g.clearRect(0, 0, 1024, 384);
    const metal = g.createLinearGradient(0, 60, 0, 300);
    metal.addColorStop(0, "#f2f3f5");
    metal.addColorStop(0.5, "#aeb3bb");
    metal.addColorStop(1, "#e3e5e8");
    g.fillStyle = metal;
    g.textBaseline = "alphabetic";
    g.font = `300 210px ${fonte}`;
    g.fillText("LIVE", 60, 240);
    const largLive = g.measureText("LIVE").width;
    // "ZP" dentro de um círculo, como no logo
    const cx = 60 + largLive + 120;
    g.lineWidth = 7;
    g.strokeStyle = metal;
    g.beginPath();
    g.arc(cx, 150, 92, 0, Math.PI * 2);
    g.stroke();
    g.font = `500 96px ${fonte}`;
    g.textAlign = "center";
    g.fillText("ZP", cx, 184);
    g.textAlign = "left";
    g.font = `300 78px ${fonte}`;
    g.fillText("connect", 250, 330);
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Asfalto com leve variação. */
export function texAsfalto(): THREE.CanvasTexture {
  return memo("asfalto", () => {
    const n = 256;
    const base = fbm(n, n, 40, 4, 5);
    const [c, g] = tela(n, n);
    const img = g.createImageData(n, n);
    const r = sorteio(9);
    for (let i = 0; i < n * n; i++) {
      const v = 62 + (base[i] as number) * 30 + (r() - 0.5) * 18;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v + 1;
      img.data[i * 4 + 2] = v + 5;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return textura(c, { repetir: [30, 30] });
  });
}

/** Folha de palmeira (alfa), com a ráquis ao longo do eixo V. */
export function texFolhaPalmeira(): THREE.CanvasTexture {
  return memo("folha-palmeira", () => {
    const w = 128;
    const h = 512;
    const [c, g] = tela(w, h);
    g.clearRect(0, 0, w, h);
    g.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const t = i / 45;
      const y = h - 14 - t * (h - 40);
      const comp = 58 * Math.sin(Math.PI * (0.12 + t * 0.86)) + 6;
      const tom = 120 + Math.round(70 * t);
      g.strokeStyle = `rgb(${Math.round(tom * 0.62)},${tom},${Math.round(tom * 0.3)})`;
      g.lineWidth = 5.2 - t * 2.2;
      for (const lado of [-1, 1]) {
        g.beginPath();
        g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 + lado * comp * 0.6, y - 12, w / 2 + lado * comp, y - 30 + t * 14);
        g.stroke();
      }
    }
    g.strokeStyle = "#8d9a3c";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(w / 2, h);
    g.lineTo(w / 2, 20);
    g.stroke();
    const t = textura(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
