import * as THREE from "three";
import { comLuzVolume } from "@/lib/luzVolume";
import { memo } from "@/lib/procedural/canvas";
import type { MatInt } from "@/lib/procedural/mobilia";
import { texFolhagem, type ParTextura } from "@/lib/procedural/texturasInterior";
import { texAzulejo, texBoucle, texLivros, texMarmore, texPalhinha, texPorcelanatoBege, texQuadro, texReboco, texTVDesligada } from "@/lib/procedural/texturasLiwo";

/** Lado (em metros) que uma repetição da textura cobre. */
function ladrilho(p: ParTextura, metros: number, metrosV = metros): ParTextura {
  for (const t of [p.map, p.normalMap]) if (t) t.repeat.set(1 / metros, 1 / metrosV);
  return p;
}

const QUENTE = "#ffe2c2"; // luz quente (~2700 K), já compensada para o tone mapping

export interface MateriaisInterior {
  mats: Record<MatInt, THREE.Material>;
  piso: THREE.Material;
  pisoExterno: THREE.Material;
  ajustar: (artificial: number) => void;
}

/**
 * Materiais PBR do interior, com texturas geradas por código. Paleta dos três renders oficiais
 * de interiores do Liwo (Aline Borges): paredes brancas, forro bege, marcenaria de carvalho claro,
 * mármore branco de veios cinza, bouclé e veludo caramelo, perfis bronze e cromados.
 */
export function materiaisInterior(_fonte: string): MateriaisInterior {
  void _fonte;
  return memo("materiais-interior-liwo", () => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const tex = (p: ParTextura, o: THREE.MeshStandardMaterialParameters = {}) => std({ map: p.map, normalMap: p.normalMap ?? null, ...o });
    const led = new THREE.MeshBasicMaterial({ color: "#ffe6bf", toneMapped: false });
    const lampada = new THREE.MeshBasicMaterial({ color: "#fff4e0", toneMapped: false });
    const tv = new THREE.MeshStandardMaterial({ map: texTVDesligada(), roughness: 0.12, metalness: 0.3 });
    const linho = (nome: string, cores: [string, string], lado = 0.35, relevo = 0.35) =>
      tex(ladrilho(texBoucle(nome, cores), lado), { roughness: 0.96, normalScale: new THREE.Vector2(relevo, relevo) });
    // parede pintada com relevo fino e oclusão junto ao piso e ao forro (a malha do interior está em metros do mundo)
    const parede = tex(ladrilho(texReboco(), 0.9), { roughness: 0.9, normalScale: new THREE.Vector2(0.07, 0.07) });
    parede.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying float vAltura;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvAltura = position.y;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vAltura;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - 0.2 * exp(-vAltura * 6.0) - 0.15 * exp(-(2.6 - vAltura) * 5.0);");
    };
    // madeiras fotográficas (Poly Haven, CC0): cor e rugosidade medidas de lâminas reais
    const carregador = new THREE.TextureLoader();
    const foto = (nome: string, lado: number, o: THREE.MeshStandardMaterialParameters = {}) => {
      const ler = (sufixo: string, cor: boolean) => {
        const t = carregador.load(`/texturas/${nome}-${sufixo}.webp`);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1 / lado, 1 / lado);
        t.anisotropy = 8;
        if (cor) t.colorSpace = THREE.SRGBColorSpace;
        return t;
      };
      return std({ map: ler("cor", true), roughnessMap: ler("rug", false), roughness: 1, ...o });
    };
    // revestimento dos banhos: porcelanato claro acetinado de grande formato (ESTIMADO: o memorial de acabamentos não foi fornecido)
    const azulejo = std({ map: texAzulejo(), color: "#e4e1da", roughness: 0.28, metalness: 0, envMapIntensity: 0.7 });
    const mats: Record<MatInt, THREE.Material> = {
      parede,
      azulejo,
      teto: std({ color: "#e4d6bd", roughness: 0.96 }),
      madeiraClara: foto("carvalho", 1.1, { color: "#f1e6d6" }),
      madeiraNatural: foto("okoume", 1.1, { color: "#c2a07c" }),
      marmore: tex(ladrilho(texMarmore("branco", ["#e9e7e3", "#f6f5f2"], "#8d8a86"), 1.6), { roughness: 0.18, metalness: 0.02 }),
      marmoreVerde: tex(ladrilho(texMarmore("verde", ["#5f7a62", "#86a088"], "#e3ece2"), 0.9), { roughness: 0.2 }),
      pedraBranca: std({ color: "#f1efea", roughness: 0.3 }),
      caramelo: tex(ladrilho(texBoucle("caramelo", ["#94703f", "#b48c5a"]), 0.25), { roughness: 0.98, normalScale: new THREE.Vector2(0.6, 0.6) }),
      veludo: tex(ladrilho(texBoucle("veludo", ["#a07d45", "#b38f58"]), 2.5), { roughness: 0.62, normalScale: new THREE.Vector2(0.08, 0.08) }),
      tecidoBranco: linho("linho-branco", ["#e6e2da", "#f5f3ee"], 0.4, 0.3),
      tecidoCinza: linho("linho-cinza", ["#96958f", "#b0afa9"]),
      tecidoVerde: linho("linho-verde", ["#6f825c", "#889a74"]),
      laqueado: std({ color: "#e9e4db", roughness: 0.42 }),
      palhinha: tex(ladrilho(texPalhinha(), 0.12), { roughness: 0.8 }),
      cromo: std({ color: "#d6d9dc", roughness: 0.12, metalness: 1 }),
      bronze: std({ color: "#8a6a48", roughness: 0.32, metalness: 0.9 }),
      metalBranco: std({ color: "#f2f1ee", roughness: 0.4, metalness: 0.2 }),
      pretoFosco: std({ color: "#1b1b1d", roughness: 0.6 }),
      vidro: std({ color: "#dbe8ee", roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.14, envMapIntensity: 1.5 }),
      vidroFosco: std({ color: "#ebe7df", roughness: 0.55, transparent: true, opacity: 0.62 }),
      espelhoFume: std({ color: "#6a645d", roughness: 0.08, metalness: 1, envMapIntensity: 1.5 }),
      espelho: std({ color: "#eef1f3", roughness: 0.03, metalness: 1, envMapIntensity: 2.4 }),
      tv,
      louca: std({ color: "#f4f3f0", roughness: 0.2 }),
      eletro: std({ color: "#f2efe8", roughness: 0.25, metalness: 0.1 }),
      inox: std({ color: "#b9bcc0", roughness: 0.28, metalness: 0.95 }),
      led,
      lampada,
      planta: std({ color: "#5d7a45", roughness: 0.8, flatShading: true }),
      folhagem: tex(ladrilho(texFolhagem(), 1.1), { color: "#8fa07f", roughness: 0.85 }),
      livros: new THREE.MeshStandardMaterial({ map: texLivros(), roughness: 0.85 }),
      quadroDegrade: new THREE.MeshStandardMaterial({ map: texQuadro("degrade"), roughness: 0.6 }),
      quadroFormas: new THREE.MeshStandardMaterial({ map: texQuadro("formas"), roughness: 0.7 }),
      resinaAmbar: std({ color: "#d9762e", roughness: 0.1, metalness: 0, transparent: true, opacity: 0.86, emissive: "#6b2a08", emissiveIntensity: 0.25 }),
      tapete: linho("tapete", ["#bfb098", "#d8ccb7"], 0.5, 0.8),
      porta: std({ color: "#f6f5f1", roughness: 0.45 }),
    };
    const piso = tex(ladrilho(texPorcelanatoBege(false), 1.2), { roughness: 0.3, metalness: 0.02, envMapIntensity: 1.25 });
    const pisoExterno = tex(ladrilho(texPorcelanatoBege(true), 1.0), { roughness: 0.6 });
    const ajustar = (a: number) => {
      led.color.set("#ffe6bf").multiplyScalar(0.3 + 1.3 * a);
      lampada.color.set("#fff4e0").multiplyScalar(0.35 + 1.6 * a);
    };
    // todos os materiais do interior leem a iluminação indireta pré-calculada da planta
    for (const mt of [...Object.values(mats), piso, pisoExterno]) if ((mt as THREE.MeshStandardMaterial).isMeshStandardMaterial) comLuzVolume(mt);
    return { mats, piso, pisoExterno, ajustar };
  });
}

export const COR_LUZ_QUENTE = QUENTE;
