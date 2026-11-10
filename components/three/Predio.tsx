"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { emp } from "@/lib/dados";
import { P, alturaTorre, meioW } from "@/lib/procedural/predio";
import { construirSitio, contornoLote, folhasPalmeira } from "@/lib/procedural/sitio";
import { barrasLogoZP, construirTorre, type Mat, type Plano } from "@/lib/procedural/torre";
import { Instancias } from "./Instancias";
import { materiaisExterior, materiaisSitio } from "./materiais";

const SOMBRA: Partial<Record<Mat, boolean>> = { branco: true, areia: true, grafite: true, granito: true, muro: true };
const ORDEM: Partial<Record<Plano, number>> = { grade: 2, brilho: 3, cone: 3, spot: 1 };

function geoFolha(): THREE.BufferGeometry {
  // Plano com a base na origem, dobrado em "V" e arqueado para baixo.
  const g = new THREE.PlaneGeometry(1, 1, 2, 8);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, -Math.abs(x) * 0.5 - y * y * 0.45);
  }
  g.computeVertexNormals();
  return g;
}

function geoVaso(): THREE.BufferGeometry {
  const perfil = [
    [0.0, 0], [0.2, 0], [0.24, 0.1], [0.3, 0.5], [0.36, 0.9], [0.38, 1.15], [0.35, 1.25], [0.33, 1.25],
  ].map(([r, y]) => new THREE.Vector2(r as number, y as number));
  return new THREE.LatheGeometry(perfil, 20);
}

function geoFolhaLarga(): THREE.BufferGeometry {
  // Folha larga recortada (costela-de-adão), com a base na origem.
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.5, 0.1, 0.62, 0.6, 0.32, 0.95);
  s.lineTo(0.2, 0.78);
  s.lineTo(0.14, 1.02);
  s.lineTo(0, 0.86);
  s.lineTo(-0.14, 1.02);
  s.lineTo(-0.2, 0.78);
  s.lineTo(-0.32, 0.95);
  s.bezierCurveTo(-0.62, 0.6, -0.5, 0.1, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, -p.getY(i) * p.getY(i) * 0.35 + Math.abs(p.getX(i)) * 0.15);
  g.computeVertexNormals();
  return g;
}

function geoLogo(): THREE.BufferGeometry {
  const partes = barrasLogoZP().map((b) => {
    const g = new THREE.BoxGeometry(b.tamanho[0], b.tamanho[1], 0.09);
    g.rotateZ(b.giro);
    g.translate(b.centro[0], b.centro[1], 0);
    return g;
  });
  const g = mergeGeometries(partes);
  partes.forEach((x) => x.dispose());
  return g;
}

function extrudar(pontos: [number, number][], altura: number): THREE.BufferGeometry {
  const s = new THREE.Shape(pontos.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: altura, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Torre, embasamento, portaria e entorno gerados por código a partir dos renders 01 e 02. */
export function Predio({ fonte, artificial }: { fonte: string; artificial: number }) {
  const torre = useMemo(() => construirTorre(emp), []);
  const sitio = useMemo(() => construirSitio(), []);
  const mats = useMemo(() => materiaisExterior(), []);
  const ms = useMemo(() => materiaisSitio(fonte), [fonte]);

  useEffect(() => {
    mats.ajustarLuz(artificial);
    ms.ajustarLuz(artificial);
  }, [mats, ms, artificial]);

  const geos = useMemo(() => {
    const { x0, x1, z0, z1, chanfro } = P.lote;
    const calcada: [number, number][] = [
      [x0 - 0.6, z0 - 0.6], [x1 + 2.8, z0 - 0.6], [x1 + 2.8, z1 - chanfro + 1.2], [x1 - chanfro + 1.2, z1 + 2.8], [x0 - 0.6, z1 + 2.8],
    ];
    return {
      caixa: new THREE.BoxGeometry(1, 1, 1),
      plano: new THREE.PlaneGeometry(1, 1),
      disco: new THREE.CircleGeometry(0.5, 16),
      podio: extrudar(contornoLote(), P.podio),
      calcada: extrudar(calcada, 0.14),
      tronco: new THREE.CylinderGeometry(0.13, 0.2, 1, 8).translate(0, 0.5, 0),
      folha: geoFolha(),
      copa: new THREE.IcosahedronGeometry(1, 1),
      vaso: geoVaso(),
      folhaLarga: geoFolhaLarga(),
      logo: geoLogo(),
    };
  }, []);

  const entorno = useMemo(() => {
    const troncos: THREE.Matrix4[] = [];
    const folhas: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    sitio.palmeiras.forEach((p, i) => {
      troncos.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, p.altura, 1)));
      folhas.push(...folhasPalmeira(new THREE.Vector3(p.x, p.altura - 0.1, p.z), 100 + i));
    });
    const troncosArv: THREE.Matrix4[] = [];
    const copas: THREE.Matrix4[] = [];
    sitio.arvores.forEach((a, i) => {
      const h = 2.6 * a.escala;
      troncosArv.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x, 0, a.z), q, new THREE.Vector3(1.1 * a.escala, h, 1.1 * a.escala)));
      const giro = new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 0.7, i * 1.3, 0));
      copas.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x, h + 1.3 * a.escala, a.z), giro, new THREE.Vector3(2.3 * a.escala, 1.9 * a.escala, 2.3 * a.escala)));
      copas.push(new THREE.Matrix4().compose(new THREE.Vector3(a.x + 0.9 * a.escala, h + 0.6 * a.escala, a.z + 0.5 * a.escala), giro, new THREE.Vector3(1.5 * a.escala, 1.3 * a.escala, 1.5 * a.escala)));
    });
    const vasos = sitio.vasos.map((v) => new THREE.Matrix4().makeTranslation(v.x, 0, v.z));
    const folhasVaso: THREE.Matrix4[] = [];
    const e = new THREE.Euler();
    sitio.vasos.forEach((v, vi) => {
      for (let i = 0; i < 9; i++) {
        e.set(0.5 + ((i * 37) % 10) * 0.07, (i / 9) * Math.PI * 2 + vi, 0, "YXZ");
        const s = 0.75 + ((i * 53) % 10) * 0.05;
        folhasVaso.push(new THREE.Matrix4().compose(new THREE.Vector3(v.x, 1.2, v.z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(s, s * 1.25, s)));
      }
    });
    const vizinhos = sitio.vizinhos.map((v) => new THREE.Matrix4().compose(new THREE.Vector3(v.x, v.alt / 2, v.z), q, new THREE.Vector3(v.larg, v.alt, v.prof)));
    return { troncos, folhas, troncosArv, copas, vasos, folhasVaso, vizinhos };
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

  const T = alturaTorre(emp);
  const matPainel = { arcos: ms.arcos, trelica: ms.trelica, trelicaEscura: ms.trelicaEscura, hall: ms.hall, letreiro: ms.letreiro };
  const { x1, z1 } = P.lote;

  return (
    <group name="predio">
      {(Object.keys(caixas) as Mat[]).map((k) => (
        <Instancias key={k} geometria={geos.caixa} material={mats.caixas[k]} matrizes={caixas[k]} sombra={SOMBRA[k] ?? false} recebeSombra />
      ))}
      {(Object.keys(planos) as Plano[]).map((k) => (
        <Instancias key={k} geometria={k === "spot" ? geos.disco : geos.plano} material={mats.planos[k]} matrizes={planos[k]} ordem={ORDEM[k] ?? 0} />
      ))}

      <mesh geometry={geos.podio} material={ms.podio} castShadow receiveShadow />
      {sitio.paineis.map((p, i) => (
        <mesh key={i} position={p.posicao} rotation={[0, p.rotY, 0]} material={matPainel[p.tipo]}>
          <planeGeometry args={p.tamanho} />
        </mesh>
      ))}
      {/* Logo "ZP" em relevo no alto da fachada lateral */}
      <mesh geometry={geos.logo} material={ms.logo} position={[meioW + P.lateral.balanco + 0.14, T + 0.92, (P.lateral.faixa[0] + P.lateral.faixa[1]) / 2]} rotation={[0, Math.PI / 2, 0]} scale={1.15} />

      {/* Entorno */}
      <mesh geometry={geos.calcada} material={ms.calcada} position={[0, -0.02, 0]} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} material={ms.grama} receiveShadow>
        <circleGeometry args={[320, 48]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z1 + 8.2]} material={ms.asfalto} receiveShadow>
        <planeGeometry args={[640, 10.8]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x1 + 8.2, 0.004, 0]} material={ms.asfalto} receiveShadow>
        <planeGeometry args={[10.8, 640]} />
      </mesh>
      <Instancias geometria={geos.tronco} material={ms.tronco} matrizes={entorno.troncos} sombra />
      <Instancias geometria={geos.folha} material={ms.folha} matrizes={entorno.folhas} />
      <Instancias geometria={geos.tronco} material={ms.tronco} matrizes={entorno.troncosArv} />
      <Instancias geometria={geos.copa} material={ms.copa} matrizes={entorno.copas} />
      <Instancias geometria={geos.vaso} material={ms.vaso} matrizes={entorno.vasos} />
      <Instancias geometria={geos.folhaLarga} material={ms.copa} matrizes={entorno.folhasVaso} />
      <Instancias geometria={geos.caixa} material={ms.vizinho} matrizes={entorno.vizinhos} />
    </group>
  );
}
