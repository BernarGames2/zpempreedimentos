import * as THREE from "three";
import { memo, sorteio, tela, textura } from "./canvas";


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


