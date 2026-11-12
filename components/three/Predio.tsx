"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { emp } from "@/lib/dados";
import { P } from "@/lib/procedural/predio";
import { construirSitio, contornoLote, geoFolhaPendente } from "@/lib/procedural/sitio";
import { construirTorre, pecasVazias, type Mat, type Onda, type Plano } from "@/lib/procedural/torre";
import { Instancias } from "./Instancias";
import { materiaisExterior, materiaisSitio } from "./materiais";

const SOMBRA: Partial<Record<Mat, boolean>> = { concreto: true, concretoClaro: true, terracota: true, grafite: true, muro: true };
const ORDEM: Partial<Record<Plano, number>> = { grade: 2, brilho: 3, cone: 3, spot: 1 };

function extrudar(pontos: [number, number][], altura: number, y0 = 0): THREE.BufferGeometry {
  const s = new THREE.Shape(pontos.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: altura, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

/** Junta as lajes em onda (ou as fitas de LED) em uma geometria só: uma chamada de desenho. */
function fundirOndas(ondas: Onda[]): THREE.BufferGeometry | null {
  if (ondas.length === 0) return null;
  const gs = ondas.map((o) => extrudar(o.contorno, o.y1 - o.y0, o.y0));
  const g = mergeGeometries(gs, false);
  gs.forEach((x) => x.dispose());
  // Triângulos degenerados da triangulação saem com normal (0,0,0); no shader isso vira NaN
  // e o bloom espalha o NaN pela tela inteira (tela preta). Troca por uma normal válida.
  const n = g?.attributes.normal as THREE.BufferAttribute | undefined;
  if (n) for (let i = 0; i < n.count; i++) if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) < 1e-6) n.setXYZ(i, 0, 1, 0);
  return g;
}

/** Torre, embasamento e entorno gerados por código a partir das plantas e renders oficiais do Liwo. */
export function Predio({ fonte, artificial, semTorre = false }: { fonte: string; artificial: number; semTorre?: boolean }) {
  const torre = useMemo(() => (semTorre ? pecasVazias() : construirTorre(emp)), [semTorre]);
  const sitio = useMemo(() => construirSitio(), []);
  const mats = useMemo(() => materiaisExterior(), []);
  const ms = useMemo(() => materiaisSitio(fonte, emp.nome), [fonte]);

  useEffect(() => {
    mats.ajustarLuz(artificial);
    ms.ajustarLuz(artificial);
  }, [mats, ms, artificial]);

  const geos = useMemo(() => {
    const { x0, x1, z0, z1 } = P.lote;
    const calcada: [number, number][] = [[x0 - 3, z0 - 3], [x1 + 3, z0 - 3], [x1 + 3, z1 + 4.4], [x0 - 3, z1 + 4.4]];
    return {
      caixa: new THREE.BoxGeometry(1, 1, 1),
      plano: new THREE.PlaneGeometry(1, 1),
      disco: new THREE.CircleGeometry(0.5, 16),
      // o volume do Working fica atrás das grades de concreto e das vitrines do térreo
      podio: extrudar(contornoLote().map(([x, z]) => [x * 0.985, z * 0.985] as [number, number]), P.podio - P.vitrine, P.vitrine),
      calcada: extrudar(calcada, 0.14),
      tronco: new THREE.CylinderGeometry(0.13, 0.2, 1, 7).translate(0, 0.5, 0),
      copa: new THREE.IcosahedronGeometry(1, 1),
      arbusto: new THREE.IcosahedronGeometry(1, 0),
      pendente: geoFolhaPendente(),
    };
  }, []);

  const ondas = useMemo(() => ({ lajes: fundirOndas(torre.ondas), fitas: fundirOndas(torre.fitas) }), [torre]);
  useEffect(() => () => {
    ondas.lajes?.dispose();
    ondas.fitas?.dispose();
  }, [ondas]);

  const entorno = useMemo(() => {
    const q = new THREE.Quaternion();
    const troncos: THREE.Matrix4[] = [];
    const copas: THREE.Matrix4[] = [];
    sitio.arvores.forEach((a, i) => {
      const h = 2.8 * a.escala;
      troncos.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x, a.y, a.z), q, new THREE.Vector3(1.1 * a.escala, h, 1.1 * a.escala)));
      const giro = new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 0.7, i * 1.3, 0));
      copas.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x, a.y + h + 1.4 * a.escala, a.z), giro, new THREE.Vector3(2.6 * a.escala, 2.1 * a.escala, 2.6 * a.escala)));
      copas.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x + 1.1 * a.escala, a.y + h + 0.7 * a.escala, a.z + 0.6 * a.escala), giro, new THREE.Vector3(1.7 * a.escala, 1.4 * a.escala, 1.7 * a.escala)));
    });
    const vizinhos = sitio.vizinhos.map((v) => new THREE.Matrix4().compose(new THREE.Vector3(v.x, v.alt / 2, v.z), q, new THREE.Vector3(v.larg, v.alt, v.prof)));
    return { troncos, copas, vizinhos };
  }, [sitio]);

  const caixas = useMemo(() => {
    const out = {} as Record<Mat, THREE.Matrix4[]>;
    (Object.keys(torre.caixas) as Mat[]).forEach((k) => (out[k] = [...torre.caixas[k], ...sitio.pecas.caixas[k]]));
    return out;
  }, [torre, sitio]);
  const planos = useMemo(() => {
    const out = {} as Record<Plano, THREE.Matrix4[]>;
    (Object.keys(torre.planos) as Plano[]).forEach((k) => (out[k] = [...torre.planos[k], ...sitio.pecas.planos[k]]));
    return out;
  }, [torre, sitio]);
  const arbustos = useMemo(() => [...torre.arbustos, ...sitio.pecas.arbustos], [torre, sitio]);
  const pendentes = useMemo(() => [...torre.pendentes, ...sitio.pecas.pendentes], [torre, sitio]);

  const matPainel = { vitrine: ms.vitrine, perfurado: ms.perfurado, letreiro: ms.letreiro, escuro: ms.escuro };
  const { x1, z1 } = P.lote;

  return (
    <group name="predio">
      {(Object.keys(caixas) as Mat[]).map((k) => (
        <Instancias key={k} geometria={geos.caixa} material={mats.caixas[k]} matrizes={caixas[k]} sombra={SOMBRA[k] ?? false} recebeSombra />
      ))}
      {(Object.keys(planos) as Plano[]).map((k) => (
        <Instancias key={k} geometria={k === "spot" ? geos.disco : geos.plano} material={mats.planos[k]} matrizes={planos[k]} ordem={ORDEM[k] ?? 0} />
      ))}
      {ondas.lajes && <mesh geometry={ondas.lajes} material={mats.laje} castShadow receiveShadow name="lajes_em_onda" />}
      {ondas.fitas && <mesh geometry={ondas.fitas} material={mats.fita} name="fitas_led" />}
      <Instancias geometria={geos.arbusto} material={ms.arbusto} matrizes={arbustos} />
      <Instancias geometria={geos.pendente} material={ms.pendente} matrizes={pendentes} />

      <mesh geometry={geos.podio} material={ms.podio} castShadow receiveShadow />
      {sitio.paineis.map((p, i) => (
        <mesh key={i} position={p.posicao} rotation={[0, p.rotY, 0]} material={matPainel[p.tipo]} renderOrder={p.tipo === "letreiro" ? 2 : 0}>
          <planeGeometry args={p.tamanho} />
        </mesh>
      ))}

      {/* Entorno */}
      <mesh geometry={geos.calcada} material={ms.calcada} position={[0, -0.02, 0]} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} material={ms.grama} receiveShadow>
        <circleGeometry args={[1500, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z1 + 9.6]} material={ms.asfalto} receiveShadow>
        <planeGeometry args={[680, 10]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x1 + 40, 0.004, 0]} material={ms.asfalto2} receiveShadow>
        <planeGeometry args={[9, 680]} />
      </mesh>
      <Instancias geometria={geos.tronco} material={ms.tronco} matrizes={entorno.troncos} sombra />
      <Instancias geometria={geos.copa} material={ms.copa} matrizes={entorno.copas} sombra />
      <Instancias geometria={geos.caixa} material={ms.vizinho} matrizes={entorno.vizinhos} />
    </group>
  );
}
