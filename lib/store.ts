import { create } from "zustand";
import { PRIMEIRO_ANDAR, ULTIMO_ANDAR, emp, grupoDe, temInterior, tipoDe, unidade } from "./dados";
import { registrar } from "./metricas";
import type { Unidade } from "./types";

/** Estados da experiência 3D. Cada um define câmera, controles e interface. */
export type Estado = "INTRO" | "PREDIO" | "UNIDADE" | "ENTRANDO" | "MAQUETE" | "PASSEIO" | "VISTA" | "LAZER";

/** Transições permitidas. Qualquer outra é recusada por `transicionar`. */
export const TRANSICOES: Record<Estado, readonly Estado[]> = {
  INTRO: ["PREDIO", "UNIDADE", "MAQUETE", "PASSEIO"],
  PREDIO: ["UNIDADE", "LAZER"],
  UNIDADE: ["PREDIO", "UNIDADE", "ENTRANDO", "VISTA", "LAZER"],
  ENTRANDO: ["MAQUETE", "PASSEIO", "UNIDADE"],
  MAQUETE: ["PASSEIO", "UNIDADE", "PREDIO"],
  PASSEIO: ["MAQUETE", "UNIDADE", "PREDIO"],
  VISTA: ["UNIDADE", "PREDIO"],
  LAZER: ["PREDIO", "LAZER", "UNIDADE"],
};

export type Qualidade = "alto" | "medio" | "baixo";
export type Negocio = "venda" | "locacao";

export interface Filtros {
  tipos: string[];
  andarMin: number;
  andarMax: number;
  negocio: Negocio;
  valorMax: number | null;
  soDisponiveis: boolean;
}

export const filtrosIniciais = (): Filtros => ({
  tipos: [],
  andarMin: PRIMEIRO_ANDAR,
  andarMax: ULTIMO_ANDAR,
  negocio: emp.modo === "locacao" ? "locacao" : "venda",
  valorMax: null,
  soDisponiveis: false,
});

export function passaFiltro(u: Unidade, f: Filtros): boolean {
  if (f.tipos.length > 0 && !f.tipos.includes(grupoDe(tipoDe(u)))) return false;
  if (u.andar < f.andarMin || u.andar > f.andarMax) return false;
  if (f.soDisponiveis && u.status !== "disponivel") return false;
  if (f.valorMax !== null) {
    const v = f.negocio === "venda" ? u.preco : u.aluguel;
    if (v === null || v > f.valorMax) return false;
  }
  return true;
}

export function filtroAtivo(f: Filtros): boolean {
  return f.tipos.length > 0 || f.andarMin > PRIMEIRO_ANDAR || f.andarMax < ULTIMO_ANDAR || f.valorMax !== null || f.soDisponiveis;
}

interface Experiencia {
  estado: Estado;
  unidadeSel: string | null;
  comodo: string | null;
  lazerSel: string | null;
  hover: string | null;
  filtros: Filtros;
  mostrarStatus: boolean;
  /** Hora do estudo de sol (6 a 18). */
  hora: number;
  /** Noite: toda a iluminação artificial acesa, como nos renders oficiais. */
  noite: boolean;
  qualidade: Qualidade;
  qualidadeAuto: boolean;
  medidas: boolean;
  foto: { aberta: boolean; mix: number };
  som: boolean;
  /** Progresso real do carregamento (0 a 1) e fim da preparação da cena. */
  carga: number;
  pronto: boolean;
  /** Véu branco quente usado nos cortes (entrada no apartamento, troca de splat). */
  veu: boolean;
  /** Câmera em voo: a interface evita cliques durante a transição. */
  emVoo: boolean;
  /** Pedido de caminhada vindo do minimapa (planta, metros). */
  destino: { x: number; z: number; n: number } | null;
  /** Cômodo em que a câmera está de fato durante o passeio. */
  comodoAtual: string | null;
  /** O cômodo atual está sendo exibido por splat? (senão, prévia simplificada) */
  usandoSplat: boolean;
  movimentoReduzido: boolean;
  /** Qual cena está montada na tela. Só muda com o véu fechado, para o corte não aparecer. */
  cena: "exterior" | "interior";
  /** Há panorâmicas reais em /public/vistas (senão a vista é ilustrativa). */
  vistaReal: boolean;
  /** Conta os pedidos de aba: pedir o mesmo cômodo de novo volta ao enquadramento da foto. */
  pedidoComodo: number;

  transicionar: (novo: Estado) => boolean;
  pularIntro: () => void;
  selecionar: (numero: string) => void;
  voltarPredio: () => void;
  entrar: () => void;
  maquete: () => void;
  passeio: (comodo?: string) => void;
  irComodo: (comodo: string) => void;
  verVista: () => void;
  abrirLazer: (id: string | null) => void;
  set: (parcial: Partial<Experiencia>) => void;
  setFiltros: (parcial: Partial<Filtros>) => void;
  limparFiltros: () => void;
  setFoto: (parcial: Partial<Experiencia["foto"]>) => void;
  caminharPara: (x: number, z: number) => void;
}

/** Destino inicial pedido pela URL (/?unidade=1201&comodo=sala), aplicado ao fim da introdução. */
export const linkInicial: { unidade: string | null; comodo: string | null } = { unidade: null, comodo: null };

export const useExp = create<Experiencia>((set, get) => ({
  estado: "INTRO",
  unidadeSel: null,
  comodo: null,
  lazerSel: null,
  hover: null,
  filtros: filtrosIniciais(),
  mostrarStatus: false,
  hora: 16,
  noite: true,
  qualidade: "medio",
  qualidadeAuto: true,
  medidas: false,
  foto: { aberta: false, mix: 1 },
  som: false,
  carga: 0,
  pronto: false,
  veu: false,
  emVoo: false,
  destino: null,
  comodoAtual: null,
  usandoSplat: false,
  movimentoReduzido: false,
  cena: "exterior",
  vistaReal: false,
  pedidoComodo: 0,

  transicionar: (novo) => {
    const atual = get().estado;
    if (!TRANSICOES[atual].includes(novo)) {
      if (process.env.NODE_ENV !== "production") console.warn(`Transição recusada: ${atual} → ${novo}`);
      return false;
    }
    // emVoo já sobe aqui: a câmera sempre faz um voo ou corte ao mudar de estado e o baixa no fim.
    set({ estado: novo, hover: null, emVoo: true });
    return true;
  },

  pularIntro: () => {
    const s = get();
    if (s.estado !== "INTRO") return;
    const u = unidade(linkInicial.unidade);
    if (!u) {
      s.transicionar("PREDIO");
      return;
    }
    const c = temInterior(tipoDe(u)) ? tipoDe(u).comodos.find((x) => x.id === linkInicial.comodo) : undefined;
    if (c) {
      set({ unidadeSel: u.numero, comodo: c.id, comodoAtual: c.id });
      s.transicionar("PASSEIO");
      registrar("entrou_no_apartamento", { unidade: u.numero, origem: "link" });
    } else {
      set({ unidadeSel: u.numero });
      s.transicionar("UNIDADE");
      registrar("unidade_vista", { unidade: u.numero, origem: "link" });
    }
  },

  selecionar: (numero) => {
    const u = unidade(numero);
    if (!u) return;
    const s = get();
    if (s.estado === "INTRO") return;
    if (s.estado === "UNIDADE" && s.unidadeSel === numero) return;
    if (!TRANSICOES[s.estado].includes("UNIDADE")) return;
    set({ unidadeSel: numero, lazerSel: null, comodo: null, comodoAtual: null, medidas: false, foto: { aberta: false, mix: 1 } });
    s.transicionar("UNIDADE");
    registrar("unidade_vista", { unidade: numero, tipo: u.tipo, status: u.status });
  },

  voltarPredio: () => {
    const s = get();
    if (s.estado === "ENTRANDO" || s.estado === "INTRO") return;
    if (s.estado === "PREDIO") return;
    set({ unidadeSel: null, comodo: null, lazerSel: null, comodoAtual: null, foto: { aberta: false, mix: 1 }, medidas: false });
    set({ estado: "PREDIO", hover: null, emVoo: true });
  },

  entrar: () => {
    const s = get();
    if (s.estado !== "UNIDADE" || !s.unidadeSel) return;
    const alvo = unidade(s.unidadeSel);
    if (!alvo || !temInterior(tipoDe(alvo))) return;
    if (s.transicionar("ENTRANDO")) registrar("entrou_no_apartamento", { unidade: s.unidadeSel, origem: "painel" });
  },

  maquete: () => {
    const s = get();
    if (!s.unidadeSel) return;
    set({ foto: { aberta: false, mix: 1 } });
    s.transicionar("MAQUETE");
  },

  passeio: (comodo) => {
    const s = get();
    const u = unidade(s.unidadeSel);
    if (!u) return;
    const comodos = tipoDe(u).comodos;
    const c = comodos.find((x) => x.id === comodo) ?? comodos[0];
    if (!c) return;
    set({ comodo: c.id, comodoAtual: c.id });
    s.transicionar("PASSEIO");
  },

  irComodo: (comodo) => {
    const s = get();
    if (s.estado !== "PASSEIO") return;
    // Mesmo cômodo: zera antes, para o pedido valer de novo e a câmera voltar ao enquadramento da foto.
    set({ comodo, pedidoComodo: s.pedidoComodo + 1, destino: null, foto: { aberta: false, mix: 1 } });
  },

  verVista: () => {
    const s = get();
    if (s.estado === "UNIDADE") s.transicionar("VISTA");
  },

  abrirLazer: (id) => {
    const s = get();
    if (!TRANSICOES[s.estado].includes("LAZER")) return;
    if (s.estado === "LAZER" && s.lazerSel === id) return;
    set({ lazerSel: id, unidadeSel: null });
    s.transicionar("LAZER");
    if (id) registrar("lazer_visto", { lazer: id });
  },

  set: (parcial) => set(parcial),
  setFiltros: (parcial) => set((s) => ({ filtros: { ...s.filtros, ...parcial } })),
  limparFiltros: () => set({ filtros: filtrosIniciais() }),
  setFoto: (parcial) => set((s) => ({ foto: { ...s.foto, ...parcial } })),
  caminharPara: (x, z) => set((s) => ({ destino: { x, z, n: (s.destino?.n ?? 0) + 1 } })),
}));

// Métrica "tempo no passeio": mede do momento em que entra até sair do estado PASSEIO.
let inicioPasseio = 0;
useExp.subscribe((s, ant) => {
  if (s.estado === ant.estado) return;
  if (s.estado === "PASSEIO") inicioPasseio = Date.now();
  else if (ant.estado === "PASSEIO" && inicioPasseio > 0) {
    registrar("tempo_no_passeio", { segundos: Math.round((Date.now() - inicioPasseio) / 1000), unidade: ant.unidadeSel ?? "" });
    inicioPasseio = 0;
  }
});

/** Pose da câmera no passeio (planta), lida pelo minimapa a cada quadro sem passar pelo React. */
export const poseCamera = { x: 0, z: 0, guinada: 0 };

/** Unidade selecionada (ou undefined). */
export function useUnidadeSel(): Unidade | undefined {
  return unidade(useExp((s) => s.unidadeSel));
}
