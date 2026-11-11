"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { amortecer, clamp } from "@/lib/easing";
import { mobiliar } from "@/lib/procedural/mobilia";
import { caminho, comodoEm, livre, montarPlanta, resolverColisao } from "@/lib/procedural/planta";
import { ALTURA_OLHO } from "@/lib/poses";
import { splatsDoTipo } from "@/lib/splats";
import { poseCamera, useExp } from "@/lib/store";
import type { TipoPlanta, Vec2 } from "@/lib/types";

const RAIO = 0.2;
const VEL_ANDAR = 1.7;
const VEL_ABA = 3.1;

/** Colisor exportado do Marble para o cômodo em splat (preenchido por SplatComodo). */
export const colisorSplat: { malha: THREE.Object3D | null; centro: THREE.Vector3; raio: number; ativo: boolean } = {
  malha: null,
  centro: new THREE.Vector3(),
  raio: 0,
  ativo: false,
};

interface Props {
  tipo: TipoPlanta;
  ativo: boolean;
  /** Modo "Ver a vista": só gira o olhar, sem andar. */
  soOlhar?: boolean;
}

function anguloCurto(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Passeio em primeira pessoa: arrastar gira o olhar, tocar/clicar no chão leva até o ponto
 * (anel-alvo no piso), WASD/setas andam, com colisão em paredes e móveis.
 */
export function Passeio({ tipo, ativo, soOlhar = false }: Props) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const planta = useMemo(() => montarPlanta(tipo), [tipo]);
  const barreiras = useMemo(() => [...planta.barreiras, ...mobiliar(tipo).obstaculos], [planta, tipo]);
  const anel = useRef<THREE.Mesh>(null);
  const e = useRef({
    guinada: 0,
    arfagem: 0,
    x: 0,
    z: 0,
    rota: [] as Vec2[],
    vel: VEL_ANDAR,
    olhar: null as { guinada: number; arfagem: number } | null,
    teclas: new Set<string>(),
    parado: 0,
    andado: 0,
    iniciado: false,
    ultimoComodo: null as string | null,
    ultimoDestino: 0,
    alvoAnel: null as Vec2 | null,
    prazo: 0,
    fisico: null as string | null,
    pedirFoto: false,
    ultimoPedido: 0,
  });
  const raio = useMemo(() => new THREE.Raycaster(), []);
  const piso = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Ao ativar, assume a orientação com que a câmera chegou.
  useEffect(() => {
    const s = e.current;
    if (!ativo) {
      s.iniciado = false;
      s.rota = [];
      s.teclas.clear();
      return;
    }
    const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    s.guinada = eu.y;
    s.arfagem = eu.x;
    s.x = camera.position.x;
    s.z = camera.position.z;
    s.iniciado = true;
    s.fisico = null;
    s.pedirFoto = !soOlhar;
    // No celular em pé, um campo de visão maior compensa a tela estreita.
    const cam = camera as THREE.PerspectiveCamera;
    if (!soOlhar && cam.isPerspectiveCamera) {
      cam.fov = cam.aspect < 0.9 ? 88 : 70;
      cam.updateProjectionMatrix();
    }
    s.ultimoComodo = useExp.getState().comodo;
    s.ultimoPedido = useExp.getState().pedidoComodo;
    s.ultimoDestino = useExp.getState().destino?.n ?? 0;
  }, [ativo, camera, soOlhar]);

  useEffect(() => {
    if (!ativo) return;
    const el = gl.domElement;
    const s = e.current;
    let baixo: { x: number; y: number; id: number } | null = null;
    let arrastou = false;

    const noPiso = (ev: PointerEvent): Vec2 | null => {
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raio.setFromCamera(ndc, camera);
      const p = new THREE.Vector3();
      if (!raio.ray.intersectPlane(piso, p)) return null;
      if (p.distanceTo(camera.position) > 9) return null;
      if (!comodoEm(tipo, p.x, p.z) || !livre(p.x, p.z, RAIO, barreiras)) return null;
      if (colisorSplat.ativo && Math.hypot(p.x - colisorSplat.centro.x, p.z - colisorSplat.centro.z) > colisorSplat.raio) return null;
      return [p.x, p.z];
    };
    // Qualquer movimento do visitante troca a foto oficial pelo 3D navegável.
    const fecharFoto = () => {
      s.pedirFoto = false;
      if (useExp.getState().foto.aberta) useExp.getState().setFoto({ aberta: false });
    };
    const aoDescer = (ev: PointerEvent) => {
      baixo = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      arrastou = false;
      el.setPointerCapture?.(ev.pointerId);
    };
    const aoMover = (ev: PointerEvent) => {
      if (baixo && ev.pointerId === baixo.id) {
        const dx = ev.clientX - baixo.x;
        const dy = ev.clientY - baixo.y;
        if (!arrastou && Math.hypot(dx, dy) < 6) return;
        arrastou = true;
        fecharFoto();
        s.olhar = null;
        const k = (ev.pointerType === "touch" ? 0.0052 : 0.0034);
        s.guinada += dx * k;
        s.arfagem = clamp(s.arfagem + dy * k, -1.15, 1.15);
        baixo.x = ev.clientX;
        baixo.y = ev.clientY;
        s.alvoAnel = null;
      } else if (!soOlhar && ev.pointerType !== "touch") {
        s.alvoAnel = noPiso(ev);
        el.style.cursor = s.alvoAnel ? "pointer" : "grab";
      }
    };
    const aoSubir = (ev: PointerEvent) => {
      if (!baixo || ev.pointerId !== baixo.id) return;
      el.releasePointerCapture?.(ev.pointerId);
      baixo = null;
      if (arrastou || soOlhar) return;
      const p = noPiso(ev);
      if (!p) return;
      fecharFoto();
      s.rota = caminho(tipo, [s.x, s.z], p);
      s.vel = VEL_ANDAR;
      s.olhar = null;
      s.alvoAnel = p;
      s.parado = 0;
    };
    const digitando = () => {
      const a = document.activeElement;
      return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement;
    };
    const TECLAS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    const aoTeclar = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (!TECLAS.includes(k) || digitando() || soOlhar) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      ev.preventDefault();
      fecharFoto();
      s.teclas.add(k);
      s.rota = [];
      s.olhar = null;
    };
    const aoSoltar = (ev: KeyboardEvent) => s.teclas.delete(ev.key.toLowerCase());
    const limpar = () => s.teclas.clear();

    el.addEventListener("pointerdown", aoDescer);
    el.addEventListener("pointermove", aoMover);
    el.addEventListener("pointerup", aoSubir);
    el.addEventListener("pointercancel", aoSubir);
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("keyup", aoSoltar);
    window.addEventListener("blur", limpar);
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("pointerdown", aoDescer);
      el.removeEventListener("pointermove", aoMover);
      el.removeEventListener("pointerup", aoSubir);
      el.removeEventListener("pointercancel", aoSubir);
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("keyup", aoSoltar);
      window.removeEventListener("blur", limpar);
      el.style.cursor = "";
    };
  }, [ativo, soOlhar, gl, camera, tipo, barreiras, raio, piso]);

  useFrame((estadoR3F, dtBruto) => {
    const s = e.current;
    if (!ativo || !s.iniciado) {
      if (anel.current) anel.current.visible = false;
      return;
    }
    const dt = Math.min(dtBruto, 0.25);
    const loja = useExp.getState();

    if (!soOlhar) {
      // Aba de cômodo: desliza até o enquadramento da foto oficial.
      if (loja.comodo && loja.pedidoComodo !== s.ultimoPedido) {
        s.ultimoPedido = loja.pedidoComodo;
        s.ultimoComodo = loja.comodo;
        const c = tipo.comodos.find((x) => x.id === loja.comodo);
        if (c) {
          loja.set({ comodoAtual: c.id });
          s.pedirFoto = true;
          const comSplat = Boolean(c.splat && splatsDoTipo.atual[c.id]);
          const alvo = c.splat && comSplat ? c.splat : { spawn: c.enquadramento.posicao, olhar: c.enquadramento.olhar };
          const [px, , pz] = alvo.spawn;
          const [ox, oy, oz] = alvo.olhar;
          if (comSplat || loja.usandoSplat) {
            // Cada cômodo em splat é um mundo separado: fade de 400 ms e a câmera nasce no spawn.
            const dd = Math.hypot(ox - px, oz - pz);
            const g = Math.atan2(-(ox - px), -(oz - pz));
            const a = Math.atan2(oy - ALTURA_OLHO, dd);
            s.rota = [];
            loja.set({ veu: true });
            window.setTimeout(() => {
              s.x = px;
              s.z = pz;
              s.guinada = g;
              s.arfagem = a;
              s.olhar = null;
              useExp.getState().set({ comodoAtual: c.id });
              window.setTimeout(() => useExp.getState().set({ veu: false }), 250);
            }, 400);
            return;
          }
          s.rota = caminho(tipo, [s.x, s.z], [px, pz]);
          s.vel = VEL_ABA;
          s.parado = 0;
          // tempo máximo do deslize: passou disso, corta direto para o enquadramento
          let comp = 0;
          let ant: Vec2 = [s.x, s.z];
          for (const p of s.rota) {
            comp += Math.hypot(p[0] - ant[0], p[1] - ant[1]);
            ant = p;
          }
          s.prazo = comp / VEL_ABA + 0.9;
          const d = Math.hypot(ox - px, oz - pz);
          s.olhar = { guinada: Math.atan2(-(ox - px), -(oz - pz)), arfagem: Math.atan2(oy - ALTURA_OLHO, d) };
          s.alvoAnel = null;
        }
      }
      // Clique no minimapa.
      if (loja.destino && loja.destino.n !== s.ultimoDestino) {
        s.ultimoDestino = loja.destino.n;
        const { x, z } = loja.destino;
        if (comodoEm(tipo, x, z)) {
          const [fx, fz] = resolverColisao(x, z, RAIO, barreiras);
          s.rota = caminho(tipo, [s.x, s.z], [fx, fz]);
          s.vel = VEL_ANDAR * 1.3;
          s.pedirFoto = false;
          if (loja.foto.aberta) loja.setFoto({ aberta: false });
          s.olhar = null;
          s.parado = 0;
        }
      }

      let mx = 0;
      let mz = 0;
      if (s.teclas.size > 0) {
        const f = (s.teclas.has("w") || s.teclas.has("arrowup") ? 1 : 0) - (s.teclas.has("s") || s.teclas.has("arrowdown") ? 1 : 0);
        const l = (s.teclas.has("d") || s.teclas.has("arrowright") ? 1 : 0) - (s.teclas.has("a") || s.teclas.has("arrowleft") ? 1 : 0);
        const sn = Math.sin(s.guinada);
        const cs = Math.cos(s.guinada);
        mx = (-sn * f + cs * l) * VEL_ANDAR * dt;
        mz = (-cs * f - sn * l) * VEL_ANDAR * dt;
      } else if (s.rota.length > 0) {
        const [tx, tz] = s.rota[0] as Vec2;
        const dx = tx - s.x;
        const dz = tz - s.z;
        const d = Math.hypot(dx, dz);
        const passo = s.vel * dt;
        if (d <= Math.max(passo, 0.03)) {
          mx = dx;
          mz = dz;
          s.rota.shift();
        } else {
          mx = (dx / d) * passo;
          mz = (dz / d) * passo;
          // sem alvo de olhar, a câmera vira aos poucos para onde anda
          if (!s.olhar && s.rota.length > 1) s.guinada += anguloCurto(s.guinada, Math.atan2(-dx, -dz)) * Math.min(1, dt * 2.2);
        }
      }

      if (mx !== 0 || mz !== 0) {
        const antes: Vec2 = [s.x, s.z];
        let [nx, nz] = resolverColisao(s.x + mx, s.z + mz, RAIO, barreiras);
        if (colisorSplat.ativo) {
          // área segura do splat: fora dela a reconstrução degrada
          const dx = nx - colisorSplat.centro.x;
          const dz = nz - colisorSplat.centro.z;
          const d = Math.hypot(dx, dz);
          if (d > colisorSplat.raio) {
            nx = colisorSplat.centro.x + (dx / d) * colisorSplat.raio;
            nz = colisorSplat.centro.z + (dz / d) * colisorSplat.raio;
          }
          if (colisorSplat.malha) {
            const dir = new THREE.Vector3(nx - s.x, 0, nz - s.z);
            const comp = dir.length();
            if (comp > 1e-4) {
              raio.set(new THREE.Vector3(s.x, 0.9, s.z), dir.normalize());
              raio.far = comp + RAIO;
              if (raio.intersectObject(colisorSplat.malha, true).length > 0) {
                nx = s.x;
                nz = s.z;
              }
            }
          }
        }
        s.x = nx;
        s.z = nz;
        const avanco = Math.hypot(s.x - antes[0], s.z - antes[1]);
        s.andado += avanco;
        // travou no caminho: corta direto para o destino (com véu)
        if (s.vel === VEL_ABA && s.rota.length > 0) s.prazo -= dt;
        const atrasou = s.vel === VEL_ABA && s.rota.length > 0 && s.prazo < 0;
        if ((s.rota.length > 0 && avanco < Math.hypot(mx, mz) * 0.25) || atrasou) {
          s.parado += dt;
          if (s.parado > 0.45 || atrasou) {
            const fim = s.rota[s.rota.length - 1] as Vec2;
            s.rota = [];
            s.parado = 0;
            if (s.vel === VEL_ABA) {
              loja.set({ veu: true });
              window.setTimeout(() => {
                s.x = fim[0];
                s.z = fim[1];
                if (s.olhar) {
                  s.guinada = s.olhar.guinada;
                  s.arfagem = s.olhar.arfagem;
                }
                useExp.getState().set({ veu: false });
              }, 320);
            }
          }
        } else s.parado = 0;
      }
      if (s.rota.length === 0) s.alvoAnel = s.teclas.size > 0 ? null : s.alvoAnel;
    }

    if (s.olhar) {
      s.guinada += anguloCurto(s.guinada, s.olhar.guinada) * (1 - Math.exp(-4.5 * dt));
      s.arfagem = amortecer(s.arfagem, s.olhar.arfagem, 4.5, dt);
      if (s.rota.length === 0 && Math.abs(anguloCurto(s.guinada, s.olhar.guinada)) < 0.004) s.olhar = null;
    }

    // Chegou ao enquadramento: mostra a foto oficial do cômodo (o 3D fica logo atrás).
    if (s.pedirFoto && !soOlhar && s.rota.length === 0 && !s.olhar && !loja.veu) {
      s.pedirFoto = false;
      const c = tipo.comodos.find((x) => x.id === loja.comodoAtual);
      if (c?.fotoDecorado && !loja.usandoSplat && !loja.foto.aberta) loja.setFoto({ aberta: true, mix: 1 });
    }

    // leve "respiração" e balanço do passo, para dar sensação de presença
    const t = estadoR3F.clock.elapsedTime;
    const vivo = loja.movimentoReduzido ? 0 : 1;
    const y = soOlhar ? camera.position.y : ALTURA_OLHO + vivo * (Math.sin(t * 1.25) * 0.005 + Math.sin(s.andado * 7) * 0.008);
    if (!soOlhar) camera.position.set(s.x, y, s.z);
    camera.rotation.set(s.arfagem, s.guinada, 0, "YXZ");

    poseCamera.x = s.x;
    poseCamera.z = s.z;
    poseCamera.guinada = s.guinada;
    if (!soOlhar) {
      // A aba escolhida fica em destaque até a câmera entrar de fato em outro cômodo
      // (a cozinha, por exemplo, é vista a partir da sala).
      const onde = comodoEm(tipo, s.x, s.z)?.id ?? null;
      if (onde && onde !== s.fisico) {
        const primeira = s.fisico === null;
        s.fisico = onde;
        if (!primeira && s.rota.length === 0 && onde !== loja.comodoAtual) loja.set({ comodoAtual: onde });
        if (!primeira && s.rota.length > 0 && s.vel !== VEL_ABA && onde !== loja.comodoAtual) loja.set({ comodoAtual: onde });
      }
    }

    const a = anel.current;
    if (a) {
      a.visible = Boolean(s.alvoAnel) && !soOlhar;
      if (s.alvoAnel) {
        a.position.set(s.alvoAnel[0], 0.012, s.alvoAnel[1]);
        const pulso = 1 + Math.sin(t * 5) * 0.06;
        a.scale.setScalar(pulso);
      }
    }
  });

  return (
    <mesh ref={anel} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={8}>
      <ringGeometry args={[0.2, 0.27, 40]} />
      <meshBasicMaterial color="#ffe1ae" transparent opacity={0.9} depthTest={false} toneMapped={false} />
    </mesh>
  );
}
