/** Tipos de todos os dados editáveis em `data/empreendimento.json`. */

export type Status = "disponivel" | "reservada" | "vendida" | "alugada";
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Modo = "venda" | "locacao" | "ambos";

export interface Empreendimento {
  nome: string;
  incorporadora: string;
  endereco: string;
  whatsapp: string;
  /** Rumo (graus, sentido horário a partir do norte) para onde a fachada da frente aponta. */
  orientacaoNorteGraus: number;
  latitude: number;
  longitude: number;
  /** Muda os textos e o que o painel mostra. */
  modo: Modo;
  /** Quantidade de andares clicáveis da torre (andares-tipo + cobertura). */
  andares: number;
  /** Número do primeiro andar da torre (6 quando os pavimentos 1 a 5 são embasamento). Padrão: 1. */
  primeiroAndar?: number;
  peDireito: number;
  terreo: Lazer[];
  cobertura: Lazer[];
  tipos: TipoPlanta[];
  unidades: Unidade[];
  textos: Record<string, string>;
  localizacao: Localizacao;
  /** Enquanto `ativo` for verdadeiro o site mostra o selo "Dados de demonstração". */
  demonstracao: { ativo: boolean; campos: string[] };
  /** Conteúdo das seções, sempre de fonte oficial (site da incorporadora). */
  fonte?: { nome: string; url: string; consultadoEm: string };
  galeria?: Foto[];
  comercial?: { titulo: string; texto: string; itens: string[]; fotos: Foto[] };
  obra?: { geral: number; etapas: { nome: string; pct: number }[]; conclusao: string };
  ficha?: { rotulo: string; valor: string }[];
  historico?: { ano: string; nomes: string }[];
  /** Aviso de protótipo: o site é uma proposta, não o site oficial. */
  proposta?: { autor: string; aviso: string };
}

export interface Foto {
  src: string;
  alt: string;
  larg: number;
  alt2: number;
  rotulo?: string;
}

export interface Unidade {
  numero: string;
  andar: number;
  /** Posição no andar (1 a 6), no sentido da planta do pavimento-tipo. */
  posicao: number;
  tipo: string;
  /** A lateral tem as sacadas corridas. */
  fachada: "frente" | "lateral" | "fundos";
  areaPrivativa: number;
  preco: number | null;
  aluguel: number | null;
  status: Status;
  vista?: string;
}

export interface TipoPlanta {
  id: string;
  nome: string;
  /** Agrupa tipos no filtro (ex.: "3 suítes"). */
  grupo?: string;
  /** Descrição oficial da planta (ex.: "3 quartos, sendo 1 suíte"). */
  descricao?: string;
  /** Imagem da planta oficial. */
  plantaImagem?: string;
  /** false = ainda sem interior 3D (mostra só a planta oficial; nada é inventado). */
  interior3d?: boolean;
  /** Planta espelhada de outro tipo: a mobília é a do tipo-base, espelhada no eixo x. */
  espelhoDe?: string;
  quartos: number;
  vagas: number | null;
  mobiliado: boolean;
  comodos: Comodo[];
  portas: Abertura[];
  janelas: Abertura[];
}

export type TipoAbertura = "porta" | "porta-correr" | "vao" | "janela" | "guarda-corpo";

/** Vão em uma parede. `p1` e `p2` ficam sobre a aresta de um cômodo (planta em metros, x/z). */
export interface Abertura {
  id: string;
  tipo: TipoAbertura;
  p1: Vec2;
  p2: Vec2;
  /** Altura do vão acima do peitoril. */
  altura: number;
  peitoril: number;
  /** Cômodos ligados pelo vão (usado para o caminho da câmera). "exterior" e "hall" não são visitáveis. */
  liga?: [string, string];
}

export interface Enquadramento {
  posicao: Vec3;
  olhar: Vec3;
}

export interface SplatComodo {
  desktop: string;
  mobile: string;
  collider: string;
  spawn: Vec3;
  olhar: Vec3;
  areaSegura: { centro: Vec3; raio: number };
}

export interface SplatTransform {
  posicao: Vec3;
  rotacaoY: number;
  escala: number;
  /** Os .spz do Marble vêm com o eixo Y para baixo; 180 corrige. Use 0 se a captura já vier em pé. */
  rotacaoX?: number;
}

export interface Comodo {
  id: string;
  nome: string;
  poligono: Vec2[];
  piso: "porcelanato-cinza" | "externo";
  area: number;
  /** Sem render oficial deste cômodo: mobília segue só a planta ilustrada. */
  semRender?: boolean;
  fotoDecorado?: string;
  /** Câmera que reproduz o enquadramento da foto oficial (coordenadas da planta). */
  enquadramento: Enquadramento;
  splat?: SplatComodo;
  /** Posição e escala do splat ajustáveis aqui, sem mexer no código. */
  splatTransform?: SplatTransform;
}

export interface Lazer {
  id: string;
  nome: string;
  etiqueta: string;
  destaques: string[];
  /** Imagem oficial do espaço. */
  imagem?: string;
  descricao: string;
  itens: string[];
  /** Centro do volume no prédio (metros; y é a base). */
  posicao: Vec3;
  tamanho: Vec3;
  camera: Enquadramento;
  /** Sem posição conhecida no prédio: aparece só na lista, não no 3D. */
  sem3d?: boolean;
  /** GLB opcional em /public/models; sem ele o site mostra um volume ilustrativo. */
  modelo?: string;
}

export interface Localizacao {
  bairro: string;
  cidade: string;
  uf: string;
  mapaEmbedUrl?: string;
  pontos: { nome: string; tempo: string; confirmado: boolean }[];
}

/** Arquivos opcionais encontrados em /public (lidos no servidor). */
export interface Manifesto {
  splats: string[];
  modelos: string[];
  hdri: string[];
  vistas: string[];
  marca: string[];
  texturas: string[];
}
