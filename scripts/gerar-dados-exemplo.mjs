// Gera data/empreendimento.json com DADOS DE DEMONSTRAÇÃO.
// Rode `node scripts/gerar-dados-exemplo.mjs` para recriar o arquivo de exemplo.
// Preços, aluguéis, metragens, plantas, status e lazer são fictícios até a ZP confirmar.
import { writeFileSync } from "node:fs";

const ANDARES = 13;
const PE = 2.88;
const TOPO = 5.2 + ANDARES * PE;

// Sorteio determinístico: o arquivo sai igual toda vez.
let semente = 20261110;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 2 ** 32);

function planta({ id, nome, quartos, d }) {
  // d = medidas-chave da planta (metros). Fachada em +z.
  const { xq, zq, zb, xs, xc, zc, zs, zv, xb } = d;
  const meioQ = (zq + zv) / 2;
  const foto = (n) => `/referencias/${n}.png`;
  const splat = (c, spawn, olhar, raio) => ({
    desktop: `/splats/${c}.spz`,
    mobile: `/splats/${c}-500k.spz`,
    collider: `/splats/${c}-collider.glb`,
    spawn,
    olhar,
    areaSegura: { centro: spawn, raio },
  });
  const r2 = (n) => Math.round(n * 100) / 100;
  const camSala = [[r2(xc - 0.45), 1.6, r2(zs * 0.5)], [xq, 1.48, r2(zs * 0.52)]];
  const camCoz = [[r2(xq + 1.2), 1.6, r2(zs * 0.5)], [xs, 1.42, r2(zs * 0.56)]];
  const camQuarto = [[r2(xq - 0.35), 1.6, r2(meioQ)], [0, 1.3, r2(meioQ)]];
  const camBanho = [[r2((xb + xq) / 2 + 0.35), 1.6, r2(zb - 0.35)], [r2((xb + xq) / 2 + 0.35), 1.3, 0]];
  const camVar = [[r2(xs - 0.75), 1.6, r2((zs + zv) / 2)], [xq, 1.35, r2((zs + zv) / 2 - 0.05)]];
  return {
    id,
    nome,
    quartos,
    vagas: 1,
    mobiliado: true,
    comodos: [
      {
        id: "sala", nome: "Sala", piso: "porcelanato-cinza",
        poligono: [[xq, 0], [xs, 0], [xs, zc], [xc, zc], [xc, zs], [xq, zs]],
        area: r2((xs - xq) * zs - (xs - xc) * (zs - zc)),
        fotoDecorado: foto("03-sala-varanda"),
        enquadramento: { posicao: camSala[0], olhar: camSala[1] },
        splat: splat("sala", camSala[0], camSala[1], 1.6),
        splatTransform: { posicao: camSala[0], rotacaoY: 90, escala: 1, rotacaoX: 180 },
      },
      {
        id: "cozinha", nome: "Cozinha", piso: "porcelanato-cinza",
        poligono: [[xc, zc], [xs, zc], [xs, zs], [xc, zs]],
        area: r2((xs - xc) * (zs - zc)),
        fotoDecorado: foto("07-cozinha"),
        enquadramento: { posicao: camCoz[0], olhar: camCoz[1] },
        // A cozinha fica no mesmo mundo da sala (o Marble recebe as fotos 03 e 07 juntas).
        splat: splat("sala", camCoz[0], camCoz[1], 1.6),
        splatTransform: { posicao: camSala[0], rotacaoY: 90, escala: 1, rotacaoX: 180 },
      },
      {
        id: "quarto", nome: "Quarto", piso: "porcelanato-cinza",
        poligono: [[0, zq], [xq, zq], [xq, zv], [0, zv]],
        area: r2(xq * (zv - zq)),
        fotoDecorado: foto("05-quarto"),
        enquadramento: { posicao: camQuarto[0], olhar: camQuarto[1] },
        splat: splat("quarto", camQuarto[0], camQuarto[1], 1.2),
        splatTransform: { posicao: camQuarto[0], rotacaoY: 90, escala: 1, rotacaoX: 180 },
      },
      {
        id: "banheiro", nome: "Banheiro", piso: "porcelanato-cinza",
        poligono: [[xb, 0], [xq, 0], [xq, zb], [xb, zb]],
        area: r2((xq - xb) * zb),
        fotoDecorado: foto("04-banheiro"),
        enquadramento: { posicao: camBanho[0], olhar: camBanho[1] },
        splat: splat("banheiro", camBanho[0], camBanho[1], 0.9),
        splatTransform: { posicao: camBanho[0], rotacaoY: 0, escala: 1, rotacaoX: 180 },
      },
      {
        id: "varanda", nome: "Varanda", piso: "externo",
        poligono: [[xq, zs], [xs, zs], [xs, zv], [xq, zv]],
        area: r2((xs - xq) * (zv - zs)),
        fotoDecorado: foto("06-varanda"),
        enquadramento: { posicao: camVar[0], olhar: camVar[1] },
        splat: splat("varanda", camVar[0], camVar[1], 1.1),
        splatTransform: { posicao: camVar[0], rotacaoY: 90, escala: 1, rotacaoX: 180 },
      },
    ],
    portas: [
      { id: "entrada", tipo: "porta", p1: [r2(xs - 0.95), 0], p2: [r2(xs - 0.1), 0], altura: 2.1, peitoril: 0, liga: ["sala", "hall"] },
      { id: "sala-quarto", tipo: quartos > 0 ? "porta-correr" : "vao", p1: [xq, r2(zq + 0.1)], p2: [xq, r2(zq + 0.85)], altura: 2.1, peitoril: 0, liga: ["sala", "quarto"] },
      { id: "quarto-banheiro", tipo: "porta", p1: [r2(xq - 0.8), zb], p2: [r2(xq - 0.1), zb], altura: 2.1, peitoril: 0, liga: ["quarto", "banheiro"] },
      { id: "sala-cozinha-a", tipo: "vao", p1: [xc, zc], p2: [xc, zs], altura: 2.6, peitoril: 0, liga: ["sala", "cozinha"] },
      { id: "sala-cozinha-b", tipo: "vao", p1: [xc, zc], p2: [xs, zc], altura: 2.6, peitoril: 0, liga: ["sala", "cozinha"] },
      { id: "sala-varanda", tipo: "vao", p1: [r2(xq + 0.2), zs], p2: [xc, zs], altura: 2.4, peitoril: 0, liga: ["sala", "varanda"] },
      { id: "cozinha-varanda", tipo: "vao", p1: [xc, zs], p2: [xs, zs], altura: 2.4, peitoril: 0, liga: ["cozinha", "varanda"] },
    ],
    janelas: [
      { id: "janela-quarto", tipo: "janela", p1: [0.8, zv], p2: [2.4, zv], altura: 1.3, peitoril: 1.0, liga: ["quarto", "exterior"] },
      { id: "guarda-corpo", tipo: "guarda-corpo", p1: [xq, zv], p2: [xs, zv], altura: 2.6, peitoril: 0, liga: ["varanda", "exterior"] },
    ],
  };
}

const tipos = [
  planta({ id: "studio", nome: "Studio", quartos: 0, d: { xq: 3.1, zq: 2.3, zb: 2.3, xb: 0.9, xs: 6.6, xc: 5.4, zc: 1.6, zs: 3.8, zv: 5.2 } }),
  planta({ id: "1q", nome: "1 quarto", quartos: 1, d: { xq: 3.6, zq: 2.5, zb: 2.5, xb: 1.1, xs: 8.1, xc: 6.9, zc: 1.8, zs: 4.1, zv: 5.6 } }),
];

// Posições no andar: 1 e 2 na frente, 3 e 4 na lateral (sacadas corridas), 5 e 6 nos fundos.
const POSICOES = [
  { tipo: "studio", fachada: "frente", area: 32 },
  { tipo: "1q", fachada: "frente", area: 41 },
  { tipo: "studio", fachada: "lateral", area: 32 },
  { tipo: "1q", fachada: "lateral", area: 41 },
  { tipo: "studio", fachada: "frente", area: 32 },
  { tipo: "1q", fachada: "frente", area: 41 },
];

const unidades = [];
for (let andar = 1; andar <= ANDARES; andar++) {
  POSICOES.forEach((p, i) => {
    const s = rnd();
    const status = s < 0.52 ? "disponivel" : s < 0.66 ? "reservada" : s < 0.84 ? "vendida" : "alugada";
    const basePreco = p.tipo === "studio" ? 268000 : 334000;
    const baseAluguel = p.tipo === "studio" ? 1900 : 2350;
    unidades.push({
      numero: `${andar}${String(i + 1).padStart(2, "0")}`,
      andar,
      posicao: i + 1,
      tipo: p.tipo,
      fachada: p.fachada,
      areaPrivativa: p.area,
      preco: basePreco + (andar - 1) * 2500 + (p.fachada === "lateral" ? 6000 : 0),
      aluguel: baseAluguel + (andar - 1) * 30 + (p.fachada === "lateral" ? 80 : 0),
      status,
    });
  });
}

const lazer = (id, nome, etiqueta, destaques, descricao, itens, posicao, tamanho, camPos) => ({
  id, nome, etiqueta, destaques, descricao, itens, posicao, tamanho,
  camera: { posicao: camPos, olhar: [posicao[0], posicao[1] + tamanho[1] / 2, posicao[2]] },
});

const dados = {
  nome: "Live ZP Connect",
  incorporadora: "ZP Empreendimentos",
  endereco: "Bairro Saraiva / Santa Maria, Uberlândia – MG (endereço a confirmar)",
  whatsapp: "(34) 99898-5445",
  orientacaoNorteGraus: 45,
  latitude: -18.9,
  longitude: -48.28,
  modo: "ambos",
  andares: ANDARES,
  peDireito: PE,
  terreo: [
    lazer("coffee-living", "Coffee living", "Térreo · Convivência",
      ["Pé-direito duplo", "Café e estar", "Wi-fi"],
      "Um lounge logo na chegada para receber visitas, tomar um café e esperar a carona.",
      ["Sofás e poltronas", "Bancada de café", "Vista para o jardim da portaria"],
      [-7.5, 0, 12.2], [4.2, 6.4, 2.6], [-9.5, 2.2, 24]),
    lazer("coworking", "Coworking", "Térreo · Trabalho",
      ["Mesas compartilhadas", "Internet rápida", "Sala de reunião"],
      "Um espaço para trabalhar ou estudar sem sair do prédio.",
      ["Bancadas com tomadas", "Cabine para chamadas", "Climatização"],
      [-8.6, 5.2, 3.0], [4.2, 3.0, 5.4], [-24, 12, 12]),
    lazer("lavanderia", "Lavanderia", "Térreo · Praticidade",
      ["Lava e seca", "Uso compartilhado", "Bancada de apoio"],
      "Lavanderia coletiva equipada, para o apartamento ficar livre para o que importa.",
      ["Máquinas lava e seca", "Bancada para dobrar roupas", "Área de espera"],
      [-8.6, 5.2, -5.0], [4.2, 3.0, 4.4], [-24, 11, -14]),
  ],
  cobertura: [
    lazer("piscina", "Piscina", "Cobertura · Exclusivo para moradores",
      ["Vista aberta", "Deck molhado", "Solário"],
      "Piscina na cobertura com a cidade no horizonte.",
      ["Piscina com borda", "Deck com espreguiçadeiras", "Ducha"],
      [1.2, TOPO + 0.15, 4.2], [7.0, 0.9, 6.0], [20, TOPO + 12, 22]),
    lazer("area-gourmet", "Área gourmet", "Cobertura · Exclusivo para moradores",
      ["Churrasqueira", "Bancada gourmet", "Mesa para grupos"],
      "Para receber amigos com a melhor vista do prédio.",
      ["Churrasqueira e cooktop", "Mesa comunitária", "Pergolado"],
      [1.6, TOPO + 0.15, -2.6], [7.0, 2.9, 4.2], [22, TOPO + 9, -4]),
    lazer("salao-de-festas", "Salão de festas", "Cobertura · Exclusivo para moradores",
      ["Ambiente fechado", "Copa de apoio", "Integrado ao gourmet"],
      "Salão envidraçado para comemorações em qualquer clima.",
      ["Copa equipada", "Mobiliário solto", "Fechamento em vidro"],
      [0.6, TOPO + 0.15, -7.2], [8.0, 3.1, 3.6], [16, TOPO + 9, -24]),
  ],
  tipos,
  unidades,
  textos: {
    h1: "Studios mobiliados no Saraiva, Uberlândia",
    chamada: "Escolha a sua unidade na fachada, entre no apartamento e veja o sol em cada horário.",
    conceitoTitulo: "Live Connect: morar conectado",
    conceitoTexto: "Apartamentos compactos e entregues mobiliados, com tudo o que o dia a dia pede a poucos passos: trabalho, café, lavanderia e lazer na cobertura.",
    conceito1Titulo: "Conectado",
    conceito1Texto: "Coworking e coffee living no térreo e a cidade na porta.",
    conceito2Titulo: "Prático",
    conceito2Texto: "Portaria 24 h, dois elevadores e lavanderia compartilhada.",
    conceito3Titulo: "Mobiliado",
    conceito3Texto: "Marcenaria, iluminação e eletros prontos para morar ou alugar.",
    decoradoTitulo: "O decorado",
    decoradoTexto: "Madeira clara em relevo, grafite e luz quente. Estas são as imagens oficiais do projeto de interiores.",
    lazerTitulo: "Lazer e serviços",
    lazerTexto: "Do térreo à cobertura, espaços para trabalhar, receber e descansar.",
    localizacaoTitulo: "Localização",
    localizacaoTexto: "Entre o Saraiva e o Santa Maria, perto da UFU e das principais avenidas de Uberlândia.",
    incorporadoraTitulo: "ZP Empreendimentos",
    incorporadoraTexto: "A ZP Empreendimentos assina o Live ZP Connect. Fale com a equipe comercial para conhecer o projeto, as condições e a disponibilidade.",
    contatoTitulo: "Agende uma visita",
    contatoTexto: "Deixe seu contato e continue a conversa no WhatsApp.",
    avisoLegal: "Imagens meramente ilustrativas. Valores, metragens, plantas e disponibilidade exibidos neste site são de demonstração e dependem de confirmação da incorporadora.",
  },
  localizacao: {
    bairro: "Saraiva / Santa Maria",
    cidade: "Uberlândia",
    uf: "MG",
    pontos: [
      { nome: "UFU – Campus Santa Mônica", tempo: "a confirmar", confirmado: false },
      { nome: "Center Shopping", tempo: "a confirmar", confirmado: false },
      { nome: "Av. João Naves de Ávila", tempo: "a confirmar", confirmado: false },
      { nome: "Av. Rondon Pacheco", tempo: "a confirmar", confirmado: false },
    ],
  },
  demonstracao: {
    ativo: true,
    campos: [
      "endereco", "orientacaoNorteGraus", "andares", "tipos (plantas e metragens)",
      "unidades (preço, aluguel, status, área)", "terreo e cobertura (lazer)", "localizacao.pontos",
    ],
  },
};

writeFileSync(new URL("../data/empreendimento.json", import.meta.url), `${JSON.stringify(dados, null, 2)}\n`);
console.log(`data/empreendimento.json: ${unidades.length} unidades, ${tipos.length} tipos.`);
