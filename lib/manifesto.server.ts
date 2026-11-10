import "server-only";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Manifesto } from "./types";

function listar(pasta: string, extensoes: string[]): string[] {
  const dir = path.join(process.cwd(), "public", pasta);
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const andar = (d: string, rel: string) => {
    for (const nome of readdirSync(d)) {
      const cheio = path.join(d, nome);
      const r = `${rel}/${nome}`;
      if (statSync(cheio).isDirectory()) andar(cheio, r);
      else if (extensoes.some((e) => nome.toLowerCase().endsWith(e))) out.push(r);
    }
  };
  andar(dir, `/${pasta}`);
  return out.sort();
}

/**
 * Lista os arquivos opcionais que existem em /public. É assim que o site decide,
 * sem mexer no código, entre splat e prévia procedural, modelo real e prédio gerado etc.
 * Roda no servidor: em desenvolvimento a cada requisição; em produção, no build.
 */
export function lerManifesto(): Manifesto {
  return {
    splats: listar("splats", [".spz", ".ply", ".splat", ".ksplat", ".sog", ".glb"]),
    modelos: listar("models", [".glb", ".gltf"]),
    hdri: listar("hdri", [".hdr", ".exr"]),
    vistas: listar("vistas", [".jpg", ".jpeg", ".png", ".webp"]),
    marca: listar("brand", [".svg", ".png", ".webp"]),
    texturas: listar("textures", [".jpg", ".jpeg", ".png", ".webp", ".ktx2"]),
  };
}
