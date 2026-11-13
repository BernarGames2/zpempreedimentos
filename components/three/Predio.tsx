"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { poseLazer } from "@/lib/poses";
import { useExp } from "@/lib/store";
import { toquePrincipal } from "@/lib/controles";
import { emp } from "@/lib/dados";
import { P } from "@/lib/procedural/predio";
import { construirSitio, contornoLote, geoFolhaPendente } from "@/lib/procedural/sitio";
import { construirTorre, pecasVazias, type Mat, type Onda, type Plano } from "@/lib/procedural/torre";
import { Instancias } from "./Instancias";
import { materiaisExterior, materiaisSitio } from "./materiais";
import { geoEspecie, geoMoitaFolhas, geoMoitaLisa, matFolhagem } from "./Entorno";

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
      arvore: geoEspecie("copa", true, false),
      arvoreFolhas: geoEspecie("copa", true, true),
      // no celular a moita fica lisa: os cartões recortados pesam no processador gráfico do aparelho
      arbusto: geoMoitaFolhas(),
      moitaLisa: geoMoitaLisa(),
      pendente: geoFolhaPendente(),
    };
  }, []);

  const ondas = useMemo(() => ({ lajes: fundirOndas(torre.ondas), fitas: fundirOndas(torre.fitas) }), [torre]);
  useEffect(() => () => {
    ondas.lajes?.dispose();
    ondas.fitas?.dispose();
  }, [ondas]);

  // árvores do embasamento com a mesma copa em tufos das árvores da cidade (antes: icosaedros lisos)
  const arvoresSitio = useMemo(
    () => sitio.arvores.map((a, i) => new THREE.Matrix4().compose(new THREE.Vector3(a.x, a.y, a.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3), new THREE.Vector3(1.25 * a.escala, 1.25 * a.escala, 1.25 * a.escala))),
    [sitio],
  );
  // folhas recortadas só no nível alto (e as moitas, só fora do celular): quem cai de nível volta ao liso
  const folhas = useExp((s) => s.qualidade) === "alto";
  const moitaFolhas = folhas && !toquePrincipal();
  const matArvore = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), []);
  const matsArvore = useMemo(() => (folhas ? [matArvore, matFolhagem()] : matArvore), [folhas, matArvore]);
  const matsMoita = useMemo(() => (moitaFolhas ? [ms.arbusto, matFolhagem()] : ms.arbusto), [moitaFolhas, ms]);
  // nos enquadramentos do lazer, as árvores da floreira que ficam entre a câmera e o espaço saem de cena
  // (corte de apresentação: sem isso uma copa a 3 m da câmera tapa meia tela)
  const estado = useExp((s) => s.estado);
  const lazerSel = useExp((s) => s.lazerSel);
  const aspecto = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const arvoresVisiveis = useMemo(() => {
    if (estado !== "LAZER" || !lazerSel) return arvoresSitio;
    const { pos, alvo } = poseLazer(lazerSel, aspecto);
    const f = alvo.clone().sub(pos);
    const dist = f.length();
    f.normalize();
    const abertura = Math.tan(THREE.MathUtils.degToRad(22.5)) * Math.max(aspecto, 1) * 1.1;
    const c = new THREE.Vector3();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    return arvoresSitio.map((m, i) => {
      const a = sitio.arvores[i];
      if (!a) return m;
      const s = 1.25 * a.escala;
      c.set(a.x, a.y + 3.9 * s, a.z).sub(pos);
      const t = c.dot(f);
      if (t <= 0 || t > dist * 0.9) return m;
      return c.addScaledVector(f, -t).length() < t * abertura + 2.6 * s ? zero : m;
    });
  }, [estado, lazerSel, aspecto, arvoresSitio, sitio]);

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
  // moitas da torre são vistas de longe (lisas); as do embasamento e do lazer, de perto (com folhas)
  const arbustosTorre = torre.arbustos;
  const arbustosSitio = sitio.pecas.arbustos;
  const pendentes = useMemo(() => [...torre.pendentes, ...sitio.pecas.pendentes], [torre, sitio]);

  const matPainel = { vitrine: ms.vitrine, perfurado: ms.perfurado, letreiro: ms.letreiro, escuro: ms.escuro };

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
      <Instancias geometria={geos.moitaLisa} material={ms.arbusto} matrizes={arbustosTorre} />
      <Instancias key={moitaFolhas ? "moita-folhas" : "moita-lisa"} geometria={moitaFolhas ? geos.arbusto : geos.moitaLisa} material={matsMoita} matrizes={arbustosSitio} />
      <Instancias geometria={geos.pendente} material={ms.pendente} matrizes={pendentes} />

      <mesh geometry={geos.podio} material={ms.podio} castShadow receiveShadow />
      {sitio.paineis.map((p, i) => (
        <mesh key={i} position={p.posicao} rotation={[0, p.rotY, 0]} material={matPainel[p.tipo]} renderOrder={p.tipo === "letreiro" ? 2 : 0}>
          <planeGeometry args={p.tamanho} />
        </mesh>
      ))}

      {/* Entorno */}
      <mesh geometry={geos.calcada} material={ms.calcada} position={[0, -0.02, 0]} receiveShadow />
      <Instancias key={folhas ? "arvore-folhas" : "arvore-lisa"} geometria={folhas ? geos.arvoreFolhas : geos.arvore} material={matsArvore} matrizes={arvoresVisiveis} sombra />
    </group>
  );
}
