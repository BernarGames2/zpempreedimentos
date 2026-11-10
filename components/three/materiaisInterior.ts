import * as THREE from "three";
import { memo } from "@/lib/procedural/canvas";
import type { MatInt } from "@/lib/procedural/mobilia";
import {
  texCimento, texFolhagem, texGranitoPreto, texHex, texMadeira, texPatchwork, texPorcelanato, texQuadro, texTV, texTecido,
  type ParTextura,
} from "@/lib/procedural/texturasInterior";

/** Lado (em metros) que uma repetição da textura cobre. */
function ladrilho(p: ParTextura, metros: number, metrosV = metros): ParTextura {
  for (const t of [p.map, p.normalMap]) if (t) t.repeat.set(1 / metros, 1 / metrosV);
  return p;
}

const QUENTE = "#ffcf9e"; // luz quente (~2700 K), já compensada para o tone mapping

export interface MateriaisInterior {
  mats: Record<MatInt, THREE.Material>;
  piso: THREE.Material;
  pisoExterno: THREE.Material;
  ajustar: (artificial: number) => void;
}

/** Materiais PBR do interior, com texturas geradas por código (madeira em relevo, cimento, granito...). */
export function materiaisInterior(fonte: string): MateriaisInterior {
  return memo("materiais-interior", () => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const tex = (p: ParTextura, o: THREE.MeshStandardMaterialParameters = {}) => std({ map: p.map, normalMap: p.normalMap ?? null, ...o });
    const madeira = ladrilho(texMadeira("clara", ["#8f7558", "#b89d7e"], 3.2), 0.9);
    const madeiraEscura = ladrilho(texMadeira("escura", ["#3a2b21", "#5a4232"], 1.5), 1.2);
    const madeiraLisa = ladrilho(texMadeira("lisa", ["#b08d68", "#d9bb95"], 0.8), 1.4);
    const led = new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false });
    const lampada = new THREE.MeshBasicMaterial({ color: "#fff1d6", toneMapped: false });
    const tv = new THREE.MeshBasicMaterial({ map: texTV(fonte), toneMapped: false });
    const mats: Record<MatInt, THREE.Material> = {
      parede: std({ color: "#4a4b51", roughness: 0.93 }),
      cimento: tex(ladrilho(texCimento(), 2.2), { roughness: 0.9, normalScale: new THREE.Vector2(0.5, 0.5) }),
      madeira: tex(madeira, { roughness: 0.62, normalScale: new THREE.Vector2(0.9, 0.9) }),
      madeiraEscura: tex(madeiraEscura, { roughness: 0.6 }),
      madeiraLisa: tex(madeiraLisa, { roughness: 0.55 }),
      teto: std({ color: "#eeece8", roughness: 0.95 }),
      pretoFosco: std({ color: "#17181b", roughness: 0.75 }),
      metalPreto: std({ color: "#0c0c0e", roughness: 0.45, metalness: 0.7 }),
      inox: std({ color: "#b9bcc0", roughness: 0.28, metalness: 0.95 }),
      granitoPreto: tex(ladrilho(texGranitoPreto(), 0.6), { roughness: 0.24, metalness: 0.15 }),
      hex: tex(ladrilho(texHex(), 0.33, 0.33 * Math.sqrt(3)), { roughness: 0.3, metalness: 0.1 }),
      vidroFume: std({ color: "#1a1612", roughness: 0.16, metalness: 0.9, transparent: true, opacity: 0.72 }),
      vidro: std({ color: "#cfe3ee", roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.16 }),
      espelho: std({ color: "#aeb4bb", roughness: 0.14, metalness: 1, envMapIntensity: 1.4 }),
      linho: tex(ladrilho(texTecido("linho", ["#9d978c", "#c8c2b6"]), 0.45), { roughness: 0.95 }),
      tecidoGrafite: tex(ladrilho(texTecido("grafite", ["#232427", "#3d3e43"]), 0.4), { roughness: 0.92 }),
      amarelo: std({ color: "#d9a514", roughness: 0.9 }),
      couro: std({ color: "#8a4a2a", roughness: 0.42 }),
      patchwork: tex(ladrilho(texPatchwork(), 1.4), { roughness: 0.85 }),
      tapeteVerde: std({ color: "#4b4f2c", roughness: 1 }),
      folhagem: tex(ladrilho(texFolhagem(), 1.1), { color: "#8fa07f", roughness: 0.85, normalScale: new THREE.Vector2(1.4, 1.4) }),
      led,
      lampada,
      dourado: std({ color: "#c79a4a", roughness: 0.28, metalness: 1 }),
      louca: std({ color: "#f2f1ee", roughness: 0.25 }),
      loucaPreta: std({ color: "#17181a", roughness: 0.3 }),
      cortina: tex(ladrilho(texTecido("cortina", ["#55565a", "#8a8b90"], true), 0.9, 3), { roughness: 0.95 }),
      quadro: new THREE.MeshStandardMaterial({ map: texQuadro(), roughness: 0.6 }),
      tv,
      planta: std({ color: "#3f8a3a", roughness: 0.8 }),
      flor: std({ color: "#d98aa6", roughness: 0.7 }),
      papel: std({ color: "#e6e2d8", roughness: 0.9 }),
      porta: std({ color: "#2c2d31", roughness: 0.6 }),
    };
    const piso = tex(ladrilho(texPorcelanato(false), 1.6), { roughness: 0.32, metalness: 0.05 });
    const pisoExterno = tex(ladrilho(texPorcelanato(true), 1.6), { roughness: 0.5 });
    const ajustar = (a: number) => {
      led.color.set("#ffd9a0").multiplyScalar(0.25 + 1.5 * a);
      lampada.color.set("#fff1d6").multiplyScalar(0.3 + 1.9 * a);
      tv.color.setScalar(0.55 + 0.6 * a);
    };
    return { mats, piso, pisoExterno, ajustar };
  });
}

export const COR_LUZ_QUENTE = QUENTE;
