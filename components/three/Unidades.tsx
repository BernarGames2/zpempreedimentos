"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { emp, tipoDe, unidade } from "@/lib/dados";
import { COR_STATUS, area } from "@/lib/formato";
import { geoUnidade } from "@/lib/procedural/predio";
import { filtroAtivo, passaFiltro, useExp } from "@/lib/store";

const VERT = /* glsl */ `
  attribute vec3 aCor;
  attribute float aAlfa;
  varying vec3 vCor;
  varying float vAlfa;
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    vCor = aCor;
    vAlfa = aAlfa;
    vec4 m = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vVista = normalize(cameraPosition - m.xyz);
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;

const FRAG = /* glsl */ `
  varying vec3 vCor;
  varying float vAlfa;
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    if (vAlfa < 0.004) discard;
    // vidro tingido: um pouco mais denso nas bordas rasantes
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vVista))), 2.0);
    gl_FragColor = vec4(vCor * (1.0 + 0.5 * fresnel), vAlfa * (0.8 + 0.5 * fresnel));
  }`;

const NAVY = new THREE.Color("#0c1020");

/** Unidades clicáveis: vidro tingido por status, filtro, contorno e rótulo flutuante. */
export function Unidades({ versao = 0 }: { versao?: number }) {
  const malha = useRef<THREE.InstancedMesh>(null);
  const estado = useExp((s) => s.estado);
  const hover = useExp((s) => s.hover);
  const sel = useExp((s) => s.unidadeSel);
  const filtros = useExp((s) => s.filtros);
  const mostrarStatus = useExp((s) => s.mostrarStatus);

  const { geos, donos, total } = useMemo(() => {
    const geos = emp.unidades.map((u) => geoUnidade(u, emp));
    const donos: number[] = [];
    geos.forEach((g, i) => g.caixas.forEach(() => donos.push(i)));
    return { geos, donos, total: donos.length };
    // `versao` muda quando um modelo real termina de ser lido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  const geometria = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute("aCor", new THREE.InstancedBufferAttribute(new Float32Array(total * 3), 3));
    g.setAttribute("aAlfa", new THREE.InstancedBufferAttribute(new Float32Array(total), 1));
    return g;
  }, [total]);

  useLayoutEffect(() => {
    const m = malha.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let i = 0;
    for (const g of geos) {
      for (const c of g.caixas) {
        mat.compose(new THREE.Vector3(...c.centro), q, new THREE.Vector3(...c.tamanho));
        m.setMatrixAt(i++, mat);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [geos]);

  // Cores e opacidades: status ligado/desligado e unidades fora do filtro a 15%.
  useEffect(() => {
    const cor = geometria.getAttribute("aCor") as THREE.InstancedBufferAttribute;
    const alfa = geometria.getAttribute("aAlfa") as THREE.InstancedBufferAttribute;
    const ativo = filtroAtivo(filtros);
    const c = new THREE.Color();
    const visivel = estado === "PREDIO" || estado === "UNIDADE";
    donos.forEach((dono, i) => {
      const u = emp.unidades[dono];
      if (!u) return;
      const passa = passaFiltro(u, filtros);
      const destaque = u.numero === hover || u.numero === sel;
      let a = 0;
      if (mostrarStatus) {
        c.set(COR_STATUS[u.status]);
        a = u.status === "disponivel" ? 0.36 : u.status === "reservada" ? 0.34 : 0.3;
        if (!passa) a *= 0.15;
      }
      if (ativo && !passa) {
        // fora do filtro: um véu escuro apaga a unidade na fachada
        c.lerp(NAVY, mostrarStatus ? 0.85 : 1);
        a = Math.max(a, 0.5);
      }
      if (destaque) a = Math.max(a, 0.12) + 0.14;
      if (!visivel) a = 0;
      cor.setXYZ(i, c.r, c.g, c.b);
      alfa.setX(i, a);
    });
    cor.needsUpdate = true;
    alfa.needsUpdate = true;
  }, [geometria, donos, filtros, mostrarStatus, hover, sel, estado]);

  const interativo = estado === "PREDIO" || estado === "UNIDADE";
  const numeroDe = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    if (e.instanceId === undefined) return null;
    const dono = donos[e.instanceId];
    return dono === undefined ? null : (emp.unidades[dono]?.numero ?? null);
  };

  const aoMover = (e: ThreeEvent<PointerEvent>) => {
    if (!interativo || e.pointerType === "touch") return;
    e.stopPropagation();
    const s = useExp.getState();
    if (s.emVoo) return;
    const n = numeroDe(e);
    if (n !== s.hover) s.set({ hover: n });
    document.body.style.cursor = "pointer";
  };
  const aoSair = () => {
    if (useExp.getState().hover) useExp.getState().set({ hover: null });
    document.body.style.cursor = "";
  };
  const aoClicar = (e: ThreeEvent<MouseEvent>) => {
    if (!interativo || e.delta > 8) return; // arrasto de órbita não seleciona
    e.stopPropagation();
    const s = useExp.getState();
    if (s.emVoo) return;
    const n = numeroDe(e);
    if (n) s.selecionar(n);
  };
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const emFoco = unidade(hover) ?? (estado === "UNIDADE" ? unidade(sel) : undefined);
  const geoFoco = emFoco ? geos[emp.unidades.indexOf(emFoco)] : undefined;

  return (
    <group name="unidades">
      <instancedMesh
        ref={malha}
        args={[geometria, material, total]}
        renderOrder={5}
        onPointerMove={aoMover}
        onPointerOut={aoSair}
        onClick={aoClicar}
      />
      {emFoco && geoFoco && <Contorno caixas={geoFoco.caixas} envolvente={geoFoco.envolvente} rotulo={`${emFoco.numero} · ${tipoDe(emFoco).nome} · ${area(emFoco.areaPrivativa)}`} cor={COR_STATUS[emFoco.status]} comRotulo={Boolean(hover)} />}
    </group>
  );
}

function Contorno({ caixas, envolvente, rotulo, cor, comRotulo }: {
  caixas: { centro: [number, number, number]; tamanho: [number, number, number] }[];
  envolvente: { centro: [number, number, number]; tamanho: [number, number, number] };
  rotulo: string;
  cor: string;
  comRotulo: boolean;
}) {
  const arestas = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  return (
    <>
      {caixas.map((c, i) => (
        <lineSegments key={i} geometry={arestas} position={c.centro} scale={[c.tamanho[0] + 0.06, c.tamanho[1] + 0.02, c.tamanho[2] + 0.06]} renderOrder={6}>
          <lineBasicMaterial color="#ffe2b0" transparent opacity={0.95} depthTest={false} toneMapped={false} />
        </lineSegments>
      ))}
      {comRotulo && (
        <Html position={[envolvente.centro[0], envolvente.centro[1] + envolvente.tamanho[1] / 2 + 0.5, envolvente.centro[2]]} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
          <div className="vidro -translate-y-4 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-texto shadow-lg" data-testid="rotulo-unidade">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cor }} />
            {rotulo}
          </div>
        </Html>
      )}
    </>
  );
}
