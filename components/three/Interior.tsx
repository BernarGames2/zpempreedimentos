"use client";

import { Html, Line } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { area } from "@/lib/formato";
import { useGLTF } from "@react-three/drei";
import { moveisGlb } from "@/lib/controles";
import { carregarLuz, comLuzVolume, luzNoite } from "@/lib/luzVolume";
import { acabamentos } from "@/lib/procedural/acabamento";
import { sorteio, tela } from "@/lib/procedural/canvas";
import { mobiliar, type MatInt, type Modelo, type Prim } from "@/lib/procedural/mobilia";
import { CORTE, PE_LIVRE, limitesPlanta, montarPlanta, type Planta, type Ret } from "@/lib/procedural/planta";
import { texCartaoFolhas } from "@/lib/procedural/texturasInterior";
import { useExp } from "@/lib/store";
import type { Comodo, TipoPlanta } from "@/lib/types";
import { matGrade } from "./materiais";
import { COR_LUZ_QUENTE, materiaisInterior } from "./materiaisInterior";

const SEM_UV: MatInt[] = ["tv", "quadroDegrade", "quadroFormas", "livros"];

/** Caixa com UV em metros, para as texturas não esticarem. */
function caixaUV(w: number, h: number, d: number, emMetros: boolean): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!emMetros) return g;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f] as [number, number];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * du, uv.getY(i) * dv);
    }
  }
  return g;
}

function geoPrim(p: Prim, corte: boolean): THREE.BufferGeometry | null {
  let { pos, tam } = p;
  if (corte) {
    if (p.camada === "teto" || p.camada === "alto") return null;
    if (p.camada === "parede") {
      const y0 = pos[1] - tam[1] / 2;
      const y1 = Math.min(pos[1] + tam[1] / 2, CORTE);
      if (y1 - y0 < 0.01) return null;
      pos = [pos[0], (y0 + y1) / 2, pos[2]];
      tam = [tam[0], y1 - y0, tam[2]];
    }
  }
  let g: THREE.BufferGeometry;
  if (p.forma === "caixa") g = caixaUV(tam[0], tam[1], tam[2], !SEM_UV.includes(p.mat));
  else if (p.forma === "arred") {
    const r = Math.min(p.raio ?? 0.04, Math.min(tam[0], tam[1], tam[2]) / 2 - 0.001);
    g = new RoundedBoxGeometry(tam[0], tam[1], tam[2], 3, Math.max(0.002, r));
  } else if (p.forma === "cilindro") g = new THREE.CylinderGeometry(tam[0] / 2, tam[0] / 2, tam[1], tam[0] > 0.5 ? 56 : 20);
  else g = new THREE.SphereGeometry(tam[0] / 2, 18, 12);
  if (p.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2])));
  g.translate(pos[0], pos[1], pos[2]);
  // a fusão exige todas indexadas ou nenhuma: a caixa arredondada não tem índice
  if (g.index) {
    const semIndice = g.toNonIndexed();
    g.dispose();
    return semIndice;
  }
  return g;
}

function fundir(prims: Prim[], corte: boolean): Partial<Record<MatInt, THREE.BufferGeometry>> {
  const porMat = new Map<MatInt, THREE.BufferGeometry[]>();
  for (const p of prims) {
    const g = geoPrim(p, corte);
    if (!g) continue;
    const lista = porMat.get(p.mat) ?? [];
    lista.push(g);
    porMat.set(p.mat, lista);
  }
  const out: Partial<Record<MatInt, THREE.BufferGeometry>> = {};
  for (const [mat, gs] of porMat) {
    const g = mergeGeometries(gs, false);
    gs.forEach((x) => x.dispose());
    if (g) out[mat] = g;
  }
  return out;
}

function geoPiso(c: Comodo, y: number, paraBaixo: boolean): THREE.BufferGeometry {
  const s = new THREE.Shape(c.poligono.map(([x, z]) => new THREE.Vector2(x, paraBaixo ? z : -z)));
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(paraBaixo ? Math.PI / 2 : -Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Cartões de folhas que dão volume ao jardim vertical. */
function geoJardim(js: { x: number; z0: number; z1: number; y1: number }[], corte: boolean): THREE.BufferGeometry | null {
  const r = sorteio(303);
  const gs: THREE.BufferGeometry[] = [];
  for (const j of js) {
    const topo = corte ? Math.min(j.y1, CORTE) : j.y1;
    const n = Math.round((j.z1 - j.z0) * topo * 24);
    for (let i = 0; i < n; i++) {
      const s = 0.26 + r() * 0.3;
      const g = new THREE.PlaneGeometry(s, s);
      g.translate(0, s / 2, 0);
      g.rotateX(0.5 + r() * 0.9);
      g.rotateY(Math.PI / 2 + (r() - 0.5) * 1.5);
      g.translate(j.x + 0.07, 0.05 + r() * (topo - 0.15), j.z0 + 0.05 + r() * (j.z1 - j.z0 - 0.1));
      gs.push(g);
    }
  }
  if (gs.length === 0) return null;
  const g = mergeGeometries(gs, false);
  gs.forEach((x) => x.dispose());
  return g;
}

/**
 * Sombras de contato "assadas" numa textura vista de cima: oclusão ao longo das paredes e debaixo de cada
 * móvel. Custa uma chamada de desenho e funciona em qualquer nível de qualidade (sem pós-processamento).
 */
function sombrasDoPiso(tipo: TipoPlanta, planta: Planta, obstaculos: Ret[]): { tex: THREE.CanvasTexture; x: number; z: number; w: number; h: number } {
  const l = limitesPlanta(tipo);
  const m = 0.4;
  const ppm = 44;
  const [w, h] = [l.x1 - l.x0 + 2 * m, l.z1 - l.z0 + 2 * m];
  const [c, g] = tela(Math.ceil(w * ppm), Math.ceil(h * ppm));
  const longe = c.width * 3; // o retângulo é desenhado fora da tela: só a sombra borrada dele cai dentro
  g.shadowOffsetX = longe;
  g.fillStyle = "#000";
  const sombra = (r: Ret, borrao: number, alfa: number, folga = 0) => {
    g.shadowColor = `rgba(0,0,0,${alfa})`;
    g.shadowBlur = borrao * ppm;
    g.fillRect((r.x0 - folga - l.x0 + m) * ppm - longe, (r.z0 - folga - l.z0 + m) * ppm, (r.x1 - r.x0 + 2 * folga) * ppm, (r.z1 - r.z0 + 2 * folga) * ppm);
  };
  for (const b of planta.paredes) if (b.y0 < 0.01 && b.y1 > 0.3) sombra(b, 0.42, 0.5, 0.02);
  for (const o of obstaculos) {
    sombra(o, 0.34, 0.42, 0.03);
    sombra(o, 0.09, 0.5);
  }
  const tex = new THREE.CanvasTexture(c);
  return { tex, x: (l.x0 + l.x1) / 2, z: (l.z0 + l.z1) / 2, w, h };
}

/** Móvel de terceiros (GLB com meshopt e texturas WebP, baixado só ao entrar no apartamento que o usa). */
function ModeloGlb({ m }: { m: Modelo }) {
  const { scene } = useGLTF(`/modelos/${m.id}.glb`, false, true);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (malha.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        for (const mt of Array.isArray(malha.material) ? malha.material : [malha.material]) comLuzVolume(mt);
      }
    });
    return c;
  }, [scene]);
  return <primitive object={obj} position={m.pos} rotation={[0, m.rotY ?? 0, 0]} scale={m.escala ?? [1, 1, 1]} />;
}

interface Props {
  tipo: TipoPlanta;
  /** Maquete: sem teto e com as paredes cortadas a 1,20 m. */
  corte: boolean;
  artificial: number;
  fonte: string;
  /** Cômodos exibidos por splat no passeio (o procedural deles fica oculto). */
  oculto?: boolean;
  /** Cômodo em que a câmera está: só as luzes mais próximas dele ficam acesas. */
  comodo?: string | null;
}

/** Apartamento procedural: usado na maquete e como reserva quando o cômodo não tem splat. */
export function Interior({ tipo, corte, artificial, fonte, oculto = false, comodo = null }: Props) {
  const m = useMemo(() => materiaisInterior(fonte), [fonte]);
  const planta = useMemo(() => montarPlanta(tipo), [tipo]);
  const mob = useMemo(() => mobiliar(tipo, moveisGlb()), [tipo]);

  const prims = useMemo<Prim[]>(() => {
    const paredes: Prim[] = planta.paredes.map((b) => ({
      forma: "caixa", mat: "parede", camada: b.y0 >= CORTE ? "alto" : "parede",
      pos: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2],
      tam: [b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0],
    }));
    // rodapé branco nas duas faces de cada parede que nasce no piso
    const rodapes: Prim[] = planta.paredes
      .filter((b) => b.y0 < 0.01 && b.y1 > 0.3)
      .map((b) => ({
        forma: "caixa", mat: "laqueado", camada: "parede",
        pos: [(b.x0 + b.x1) / 2, 0.04, (b.z0 + b.z1) / 2],
        tam: [b.x1 - b.x0 + 0.024, 0.08, b.z1 - b.z0 + 0.024],
      }));
    const jardins: Prim[] = mob.jardins.map((j) => ({
      forma: "caixa", mat: "folhagem", camada: "parede",
      pos: [j.x + 0.03, j.y1 / 2, (j.z0 + j.z1) / 2], tam: [0.06, j.y1, j.z1 - j.z0],
    }));
    return [...paredes, ...rodapes, ...jardins, ...acabamentos(tipo, planta, mob), ...mob.prims];
  }, [tipo, planta, mob]);
  const sombras = useMemo(() => sombrasDoPiso(tipo, planta, mob.obstaculos), [tipo, planta, mob]);
  const matSombras = useMemo(() => new THREE.MeshBasicMaterial({ map: sombras.tex, transparent: true, depthWrite: false, toneMapped: false }), [sombras]);

  const geos = useMemo(() => fundir(prims, corte), [prims, corte]);
  const pisos = useMemo(() => tipo.comodos.map((c) => ({ c, g: geoPiso(c, c.piso === "externo" ? -0.03 : 0, false) })), [tipo]);
  const tetos = useMemo(() => mergeGeometries(tipo.comodos.map((c) => geoPiso(c, PE_LIVRE, true)), false), [tipo]);
  const jardim = useMemo(() => geoJardim(mob.jardins, corte), [mob, corte]);
  const matFolhas = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texCartaoFolhas(), color: "#8a9c7a", alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
    [],
  );
  const grade = useMemo(() => matGrade("#5a4129"), []);

  useEffect(() => m.ajustar(Math.max(artificial, 0.35)), [m, artificial]);
  useEffect(() => {
    void carregarLuz(tipo.id);
    return () => void carregarLuz(null);
  }, [tipo.id]);
  useEffect(() => luzNoite(artificial), [artificial]);
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g?.dispose());
      jardim?.dispose();
    },
    [geos, jardim],
  );
  useEffect(
    () => () => {
      sombras.tex.dispose();
      matSombras.dispose();
    },
    [sombras, matSombras],
  );

  // Luzes pontuais são caras: no máximo 4 acesas, as mais próximas do cômodo atual.
  const luzes = useMemo(() => {
    const c = tipo.comodos.find((x) => x.id === comodo);
    if (!c) return mob.luzes.filter((_, i) => i % 2 === 0).slice(0, 4);
    const [cx, cz] = centroide(c);
    return [...mob.luzes].sort((a, b) => Math.hypot(a.pos[0] - cx, a.pos[2] - cz) - Math.hypot(b.pos[0] - cx, b.pos[2] - cz)).slice(0, 4);
  }, [mob, tipo, comodo]);

  const guardas = planta.aberturas.filter((a) => a.tipo === "guarda-corpo");
  const janelas = planta.aberturas.filter((a) => a.tipo === "janela");

  return (
    <group name="interior" visible={!oculto}>
      {(Object.keys(geos) as MatInt[]).map((k) => (
        <mesh key={k} geometry={geos[k]} material={m.mats[k]} castShadow={k !== "led" && k !== "lampada" && k !== "vidro" && k !== "vidroFosco" && k !== "espelhoFume"} receiveShadow />
      ))}
      {pisos.map(({ c, g }) => (
        <mesh key={c.id} geometry={g} material={c.piso === "externo" ? m.pisoExterno : m.piso} receiveShadow name={`comodo_${c.id}`} />
      ))}
      <Suspense fallback={null}>
        <group name="moveis_glb">{mob.modelos?.map((mo, i) => <ModeloGlb key={`${mo.id}-${i}`} m={mo} />)}</group>
      </Suspense>
      {/* acima dos tapetes (1,6 cm) e abaixo de tudo o que tem volume */}
      <mesh position={[sombras.x, 0.02, sombras.z]} rotation={[-Math.PI / 2, 0, 0]} material={matSombras} renderOrder={1} name="sombras_de_contato">
        <planeGeometry args={[sombras.w, sombras.h]} />
      </mesh>
      {!corte && tetos && <mesh geometry={tetos} material={m.mats.teto} castShadow name="teto_apartamento" />}
      {jardim && <mesh geometry={jardim} material={matFolhas} castShadow />}
      {guardas.map((a) => {
        // guarda-corpo ao longo de x (final 02) ou de z (final 01): o gradil fica 5 cm para dentro da varanda
        const emX = Math.abs(a.p1[0] - a.p2[0]) < 1e-6;
        const larg = emX ? Math.abs(a.p2[1] - a.p1[1]) : Math.abs(a.p2[0] - a.p1[0]);
        const sala = tipo.comodos.find((c) => c.id === a.liga?.[0]);
        const centro = sala ? sala.poligono.reduce((s, p) => s + (emX ? p[0] : p[1]), 0) / sala.poligono.length : emX ? a.p1[0] + 1 : a.p1[1] - 1;
        const linha = emX ? a.p1[0] : a.p1[1];
        const d = Math.sign(centro - linha) * 0.05;
        const pos: [number, number, number] = emX ? [linha + d, 0.61, (a.p1[1] + a.p2[1]) / 2] : [(a.p1[0] + a.p2[0]) / 2, 0.61, linha + d];
        return (
          <mesh key={a.id} position={pos} rotation={[0, emX ? Math.PI / 2 : 0, 0]} material={grade} renderOrder={2}>
            <planeGeometry args={[larg, 0.94]} />
          </mesh>
        );
      })}
      {janelas.map((a) => {
        // janelas em paredes de x constante ficam giradas 90°
        const emX = Math.abs(a.p1[0] - a.p2[0]) < 1e-4;
        return (
          <mesh key={a.id} position={[(a.p1[0] + a.p2[0]) / 2, a.peitoril + a.altura / 2, (a.p1[1] + a.p2[1]) / 2]} rotation={[0, emX ? Math.PI / 2 : 0, 0]} material={m.mats.vidro}>
            <planeGeometry args={[emX ? Math.abs(a.p2[1] - a.p1[1]) : Math.abs(a.p2[0] - a.p1[0]), a.altura]} />
          </mesh>
        );
      })}
      {luzes.map((l, i) => (
        <pointLight key={i} position={l.pos} color={COR_LUZ_QUENTE} intensity={l.forca * (0.3 + 7.7 * artificial)} distance={l.alcance * 1.4} decay={1.5} />
      ))}
      {corte && <ExtrasMaquete tipo={tipo} />}
    </group>
  );
}

function centroide(c: Comodo): [number, number] {
  const xs = c.poligono.map((p) => p[0]);
  const zs = c.poligono.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
}

/** Pontos de interesse pulsantes e medidas, só na maquete. */
function ExtrasMaquete({ tipo }: { tipo: TipoPlanta }) {
  const medidas = useExp((s) => s.medidas);
  const passeio = useExp((s) => s.passeio);
  const emVoo = useExp((s) => s.emVoo);
  const [sobre, setSobre] = useState<string | null>(null);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {tipo.comodos.map((c) => {
        const [cx, cz] = centroide(c);
        const xs = c.poligono.map((p) => p[0]);
        const zs = c.poligono.map((p) => p[1]);
        const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
        return (
          <group key={c.id}>
            <Html position={[cx, CORTE + 0.15, cz]} center zIndexRange={[15, 5]}>
              <button
                type="button"
                disabled={emVoo}
                onClick={() => passeio(c.id)}
                onPointerEnter={() => setSobre(c.id)}
                onPointerLeave={() => setSobre(null)}
                onFocus={() => setSobre(c.id)}
                onBlur={() => setSobre(null)}
                aria-label={`Ir para ${c.nome}, ${area(c.area)}`}
                data-testid={`ponto-${c.id}`}
                className="group relative flex h-11 w-11 items-center justify-center"
              >
                <span className="pulso relative block h-4 w-4 rounded-full border-2 border-white bg-ambar shadow-lg" />
                <span className={`vidro pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-texto transition-opacity ${sobre === c.id || medidas ? "opacity-100" : "opacity-0 max-md:opacity-100"}`}>
                  {c.nome} · {area(c.area)}
                  {medidas && <span className="ml-1 text-ambar-claro">· {fmt(x1 - x0)} × {fmt(z1 - z0)} m</span>}
                </span>
              </button>
            </Html>
            {medidas && (
              <>
                <Line points={[[x0, CORTE + 0.03, z1 - 0.12], [x1, CORTE + 0.03, z1 - 0.12]]} color="#e8a94e" lineWidth={1.5} />
                <Line points={[[x0 + 0.12, CORTE + 0.03, z0], [x0 + 0.12, CORTE + 0.03, z1]]} color="#e8a94e" lineWidth={1.5} />
              </>
            )}
          </group>
        );
      })}
    </>
  );
}
