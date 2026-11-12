// Gera data/empreendimento.json do Liwo (Maxi Construtora). Rode `npm run dados`.
//
// FONTE: tudo o que descreve o empreendimento vem do site oficial
// (https://construtoramaxi.com.br/projetos/liwo/, consultado em 11/11/2026):
// tipologias, metragens, pavimentos, lazer, ficha técnica, obra, endereço e contato.
// A planta do apartamento de 102 m² (finais 02 e 04) foi medida sobre a planta oficial.
//
// DEMONSTRAÇÃO (não confirmado pela Maxi): disponibilidade das unidades, numeração,
// orientação solar. Preços não são informados: o site mostra "Consulte".
import { writeFileSync } from "node:fs";

const PRIMEIRO = 6; // pavimentos 1 a 4: Working; 5: lazer; 6 a 23: tipo; 24: coberturas
const TIPO_ATE = 23;
const COBERTURA = 24;
const PE = 3.06;
const Y_LAZER = 18.4; // piso do 5º pavimento (ver P.podio em lib/procedural/predio.ts)

let semente = 20261111;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const r2 = (n) => Math.round(n * 100) / 100;

// ── Planta do final 02 (102 m², 3 suítes), em metros. x: ao longo da fachada; z: da entrada (0) à fachada.
const L02 = 10.8; // largura total (para espelhar o final 04)
const ret = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const areaDe = (pol) => r2(Math.abs(pol.reduce((s, [x, z], i) => { const [x2, z2] = pol[(i + 1) % pol.length]; return s + x * z2 - x2 * z; }, 0)) / 2);
const comodo = (id, nome, poligono, posicao, olhar, extra = {}) => ({ id, nome, piso: "porcelanato-cinza", poligono, area: areaDe(poligono), enquadramento: { posicao, olhar }, ...extra });
const porta = (id, tipo, p1, p2, liga, altura = 2.1, peitoril = 0) => ({ id, tipo, p1, p2, altura, peitoril, liga });

const final02 = {
  comodos: [
    comodo("sala", "Living", [[0, 0], [4.8, 0], [4.8, 6.26], [1.8, 6.26], [1.8, 1.15], [0, 1.15]], [4.05, 1.6, 1.5], [1.5, 1.3, 7.6], { fotoDecorado: "/referencias/sala-01.jpg" }),
    comodo("cozinha", "Cozinha", ret(0, 1.15, 1.8, 6.26), [1.45, 1.6, 5.95], [2.5, 1.2, 0.6], { fotoDecorado: "/referencias/sala-02.jpg" }),
    comodo("varanda", "Varanda gourmet", ret(0, 6.26, 4.8, 8.85), [4.1, 1.6, 6.55], [0.4, 0.9, 8.2], { piso: "externo" }),
    comodo("quarto", "Suíte master", [[4.8, 0], [8.9, 0], [8.9, 2.86], [7.4, 2.86], [7.4, 4.1], [6.25, 4.1], [6.25, 2.86], [4.8, 2.86]], [8.6, 1.6, 2.15], [4.9, 1.3, 1.0], { fotoDecorado: "/referencias/suite.jpg" }),
    comodo("banheiro", "Banho master", ret(7.4, 2.86, 10.8, 4.1), [7.75, 1.6, 3.5], [10.6, 1.15, 3.5], { semRender: true }),
    comodo("circ", "Circulação", ret(4.8, 4.1, 7.4, 5.3), [5.2, 1.6, 4.7], [7.3, 1.4, 4.7], { semRender: true }),
    comodo("lavabo", "Lavabo", ret(4.8, 2.86, 6.25, 4.1), [5.5, 1.6, 3.85], [5.5, 1.1, 2.95], { semRender: true }),
    comodo("suite1", "Suíte 1", ret(4.8, 5.3, 7.4, 8.6), [7.0, 1.6, 5.7], [5.0, 1.0, 7.6], { semRender: true }),
    comodo("banho1", "Banho 1", ret(7.4, 6.9, 9.1, 9.5), [8.25, 1.6, 7.2], [8.25, 1.1, 9.3], { semRender: true }),
    comodo("suite2", "Suíte 2", ret(7.4, 4.1, 10.8, 6.9), [7.8, 1.6, 6.5], [10.4, 1.0, 4.6], { semRender: true }),
    comodo("banho2", "Banho 2", ret(9.1, 6.9, 10.8, 9.5), [9.95, 1.6, 7.2], [9.95, 1.1, 9.3], { semRender: true }),
  ],
  portas: [
    porta("entrada", "porta", [0.15, 0], [1.05, 0], ["sala", "hall"]),
    porta("sala-cozinha", "vao", [1.8, 2.9], [1.8, 6.26], ["sala", "cozinha"], 2.6),
    porta("sala-varanda", "vao", [1.8, 6.26], [4.5, 6.26], ["sala", "varanda"], 2.4),
    porta("cozinha-varanda", "vao", [0.85, 6.26], [1.8, 6.26], ["cozinha", "varanda"], 2.4),
    porta("sala-circ", "vao", [4.8, 4.2], [4.8, 5.2], ["sala", "circ"], 2.3),
    porta("circ-lavabo", "porta", [5.2, 4.1], [6.05, 4.1], ["circ", "lavabo"]),
    porta("circ-quarto", "porta", [6.4, 4.1], [7.25, 4.1], ["circ", "quarto"]),
    porta("circ-suite1", "porta", [6.45, 5.3], [7.3, 5.3], ["circ", "suite1"]),
    porta("circ-suite2", "porta", [7.4, 4.25], [7.4, 5.1], ["circ", "suite2"]),
    porta("quarto-banheiro", "porta", [7.4, 3.0], [7.4, 3.85], ["quarto", "banheiro"]),
    porta("suite1-banho1", "porta", [7.4, 7.6], [7.4, 8.4], ["suite1", "banho1"]),
    porta("suite2-banho2", "porta", [9.5, 6.9], [10.3, 6.9], ["suite2", "banho2"]),
  ],
  janelas: [
    porta("janela-suite1", "janela", [5.3, 8.6], [6.9, 8.6], ["suite1", "exterior"], 1.3, 1.0),
    porta("janela-quarto", "janela", [8.9, 0.5], [8.9, 2.0], ["quarto", "exterior"], 1.3, 1.0),
    porta("janela-suite2", "janela", [10.8, 4.9], [10.8, 6.3], ["suite2", "exterior"], 1.3, 1.0),
    porta("janela-banheiro", "janela", [10.8, 3.3], [10.8, 3.9], ["banheiro", "exterior"], 0.6, 1.6),
    porta("janela-banho1", "janela", [7.9, 9.5], [8.6, 9.5], ["banho1", "exterior"], 0.6, 1.6),
    porta("janela-banho2", "janela", [9.6, 9.5], [10.3, 9.5], ["banho2", "exterior"], 0.6, 1.6),
    porta("guarda-corpo", "guarda-corpo", [0, 8.85], [4.8, 8.85], ["varanda", "exterior"], 2.6, 0),
  ],
};

/** Espelha a planta no eixo x (o final 04 é o final 02 espelhado). */
function espelhar(p) {
  const mx = (x) => r2(L02 - x);
  const pt = ([x, z]) => [mx(x), z];
  const v3 = ([x, y, z]) => [mx(x), y, z];
  return {
    comodos: p.comodos.map(({ fotoDecorado, ...c }) => ({ ...c, poligono: c.poligono.map(pt).reverse(), enquadramento: { posicao: v3(c.enquadramento.posicao), olhar: v3(c.enquadramento.olhar) } })),
    portas: p.portas.map((a) => ({ ...a, p1: pt(a.p1), p2: pt(a.p2) })),
    janelas: p.janelas.map((a) => ({ ...a, p1: pt(a.p1), p2: pt(a.p2) })),
  };
}

const semInterior = { interior3d: false, comodos: [], portas: [], janelas: [] };
const tipo = (id, nome, grupo, descricao, quartos, planta, resto) => ({ id, nome, grupo, descricao, plantaImagem: `/referencias/plantas/${planta}.jpg`, quartos, vagas: null, mobiliado: false, ...resto });

const tipos = [
  tipo("final-01", "3 quartos", "3 quartos", "3 quartos, sendo 1 suíte", 3, "final-01", semInterior),
  tipo("final-02", "3 suítes", "3 suítes", "3 suítes", 3, "final-02", final02),
  tipo("final-03", "2 suítes", "2 suítes", "2 suítes, sendo 1 master", 2, "final-03", semInterior),
  tipo("final-04", "3 suítes", "3 suítes", "3 suítes", 3, "final-04", { espelhoDe: "final-02", ...espelhar(final02) }),
  tipo("final-05", "3 quartos", "3 quartos", "3 quartos, sendo 1 suíte", 3, "final-05", semInterior),
  tipo("final-06", "2 suítes", "2 suítes", "2 suítes, sendo 1 master", 2, "final-06", semInterior),
  tipo("garden", "Garden", "Garden", "2 suítes, sendo 1 master (unidade Garden)", 2, "garden", semInterior),
  tipo("cobertura-01", "Cobertura", "Coberturas", "4 suítes, sendo 1 master", 4, "cobertura", semInterior),
  tipo("cobertura-02", "Cobertura", "Coberturas", "3 suítes, sendo 1 master", 3, "cobertura", semInterior),
  tipo("cobertura-03", "Cobertura", "Coberturas", "3 suítes, sendo 1 master", 3, "cobertura", semInterior),
];

// Finais do pavimento-tipo (6º ao 23º), no sentido anti-horário visto de fora: 01 e 02 na frente,
// 03 na lateral direita, 04 e 05 nos fundos, 06 na lateral esquerda.
const FINAIS = [
  { tipo: "final-01", fachada: "frente", area: 91 },
  { tipo: "final-02", fachada: "frente", area: 102 },
  { tipo: "final-03", fachada: "lateral", area: 77 },
  { tipo: "final-04", fachada: "fundos", area: 102 },
  { tipo: "final-05", fachada: "fundos", area: 91 },
  { tipo: "final-06", fachada: "lateral", area: 76 },
];
const statusDemo = () => { const s = rnd(); return s < 0.62 ? "disponivel" : s < 0.76 ? "reservada" : "vendida"; };
const unidades = [];
for (let andar = PRIMEIRO; andar <= TIPO_ATE; andar++) {
  FINAIS.forEach((f, i) => {
    const garden = andar === PRIMEIRO && i === 5; // unidade Garden: final 06 do primeiro andar residencial
    unidades.push({
      numero: `${andar}${String(i + 1).padStart(2, "0")}`,
      andar,
      posicao: i + 1,
      tipo: garden ? "garden" : f.tipo,
      fachada: f.fachada,
      areaPrivativa: garden ? 97 : f.area,
      preco: null,
      aluguel: null,
      status: statusDemo(),
    });
  });
}
[["cobertura-01", "frente", 193], ["cobertura-02", "fundos", 177], ["cobertura-03", "fundos", 170]].forEach(([t, fachada, area], i) => {
  unidades.push({ numero: `${COBERTURA}0${i + 1}`, andar: COBERTURA, posicao: i + 1, tipo: t, fachada, areaPrivativa: area, preco: null, aluguel: null, status: statusDemo() });
});

// ── Lazer (5º pavimento). Posições medidas sobre a planta oficial do pavimento de lazer.
const lazer = (id, nome, descricao, posicao, tamanho, cam, extra = {}) => ({
  id, nome, etiqueta: "5º pavimento · Lazer", destaques: [], descricao, itens: [],
  imagem: `/referencias/lazer/${extra.foto ?? id}.jpg`,
  posicao: [posicao[0], Y_LAZER, posicao[1]], tamanho,
  camera: { posicao: cam, olhar: [posicao[0], Y_LAZER + 1, posicao[1]] },
  ...(extra.sem3d ? { sem3d: true } : {}),
});
// Posição na planta oficial do pavimento de lazer convertida para o mundo:
// x = (y_px − 400) / 27,6 + 1,6 e z = −(x_px − 475) / 27,6 (escala tirada do núcleo de elevadores).
const fora = (x, z, alt = 15, dist = 30) => { const d = Math.hypot(x - 1, z) || 1; return [r2(x + ((x - 1) / d) * dist), Y_LAZER + alt, r2(z + (z / d) * dist)]; };
const L = (id, nome, descricao, [x, z], tam, extra = {}) => lazer(id, nome, descricao, [x, z], tam, fora(x, z), extra);
const terreo = [
  L("piscina", "Piscina com deck", "Piscina com deck no pavimento de lazer, ao lado da sauna.", [-2.6, -17.6], [13.8, 0.4, 3.1]),
  L("sauna", "Sauna", "Sauna com deck e acesso à piscina.", [8.2, -12.9], [2.0, 2.6, 3.8]),
  L("salao-de-eventos", "Salão de eventos", "Salão de eventos com copa de apoio.", [-6.6, 5.4], [8.3, 3, 14.7], { foto: "salao-de-eventos" }),
  L("gourmet", "Espaço gourmet", "Espaço gourmet ao lado do salão de eventos.", [-6.3, -4.2], [7.8, 3, 4.2]),
  L("academia", "Academia", "Academia no pavimento de lazer.", [4.9, 10.3], [10.5, 3, 6.7]),
  L("coworking", "Coworking", "Coworking para os moradores.", [7.8, 0.9], [3.3, 3, 4.0]),
  L("jogos", "Lounge de jogos", "Lounge de jogos ao lado da piscina.", [2.0, -8.0], [5.8, 3, 5.6]),
  L("playground", "Playground", "Playground ao ar livre.", [12.7, 10.7], [4.5, 0.25, 5.8]),
  L("brinquedoteca", "Brinquedoteca", "Brinquedoteca ao lado do playground.", [12.7, 5.4], [4.5, 3, 4.6]),
  L("quadra", "Quadra de pickleball", "Quadra de pickleball descoberta.", [13.6, -11.8], [6.7, 0.2, 13.7]),
  lazer("bicicletario", "Bicicletário", "Bicicletário do empreendimento.", [0, 0], [1, 1, 1], [0, 40, 60], { sem3d: true }),
];

const foto = (src, alt, larg, alt2, rotulo) => ({ src: `/referencias/${src}.jpg`, alt, larg, alt2, ...(rotulo ? { rotulo } : {}) });

const dados = {
  nome: "Liwo",
  incorporadora: "Maxi Construtora e Incorporadora",
  endereco: "Rua João Severiano Rodrigues da Cunha, 1855 – Parque Sul Karaíba, Uberlândia – MG",
  whatsapp: "(34) 99684-4424",
  orientacaoNorteGraus: 90,
  latitude: -18.957,
  longitude: -48.287,
  modo: "venda",
  andares: COBERTURA - PRIMEIRO + 1,
  primeiroAndar: PRIMEIRO,
  peDireito: PE,
  terreo,
  cobertura: [],
  tipos,
  unidades,
  textos: {
    h1: "Apartamentos de 76 a 193 m² no Parque Sul Karaíba, Uberlândia",
    chamada: "Escolha a unidade na fachada, veja a planta oficial e entre no apartamento em 3D.",
    conceitoTitulo: "Living e Working na mesma torre",
    conceitoTexto: "O Liwo é o primeiro empreendimento de uso misto da Maxi em Uberlândia. A torre reúne apartamentos e salas comerciais, com acessos independentes para quem mora e para quem trabalha, e fachada ativa no térreo.",
    conceito1Titulo: "Living",
    conceito1Texto: "Apartamentos de 76 a 193 m², com 1 a 4 suítes, do 6º ao 24º pavimento.",
    conceito2Titulo: "Working",
    conceito2Texto: "Salas comerciais de 34 a 78 m², nos pavimentos 1 a 4.",
    conceito3Titulo: "Lazer",
    conceito3Texto: "921 m² de lazer no 5º pavimento, com piscina, academia, coworking e quadra de pickleball.",
    decoradoTitulo: "Interiores",
    decoradoTexto: "Imagens oficiais do projeto de interiores, de Aline Borges. No 3D, o apartamento de 102 m² segue a planta oficial e estas imagens.",
    lazerTitulo: "Lazer no 5º pavimento",
    lazerTexto: "São 921,38 m² de área de lazer. As imagens são as oficiais do empreendimento.",
    localizacaoTitulo: "Localização",
    localizacaoTexto: "No Parque Sul Karaíba, uma região cercada por áreas verdes, serviços e conveniências.",
    incorporadoraTitulo: "Maxi Construtora e Incorporadora",
    incorporadoraTexto: "Fundada em 2010, a Maxi planeja, constrói e gerencia projetos imobiliários de alto padrão em Uberlândia. Faz parte do Grupo Bold.",
    contatoTitulo: "Fale com a equipe comercial",
    contatoTexto: "Deixe seu contato e continue a conversa no WhatsApp da Maxi.",
    avisoLegal: "Protótipo de proposta comercial. Não é o site oficial do empreendimento. Imagens, plantas, metragens, lazer, obra e ficha técnica: divulgação Maxi Construtora (construtoramaxi.com.br, consultado em 11/11/2026). A disponibilidade, a numeração das unidades e a orientação solar são de demonstração e dependem de confirmação da incorporadora. O prédio e o apartamento em 3D são representações aproximadas, feitas a partir das plantas e imagens oficiais.",
  },
  localizacao: {
    bairro: "Parque Sul Karaíba",
    cidade: "Uberlândia",
    uf: "MG",
    mapaEmbedUrl: "https://www.google.com/maps?q=Rua+Jo%C3%A3o+Severiano+Rodrigues+da+Cunha,+1855,+Uberl%C3%A2ndia+-+MG&output=embed",
    pontos: [],
  },
  demonstracao: {
    ativo: true,
    campos: ["disponibilidade das unidades", "numeração das unidades", "orientação solar da fachada", "preços (não informados)"],
  },
  fonte: { nome: "Maxi Construtora", url: "https://construtoramaxi.com.br/projetos/liwo/", consultadoEm: "11/11/2026" },
  galeria: [
    foto("fachada-diagonal", "Fachada do Liwo vista em diagonal, com as varandas em onda e o embasamento comercial", 860, 1080),
    foto("fachada-frontal", "Fachada frontal do Liwo, com 24 pavimentos", 860, 1080),
    foto("fachada-lazer", "Detalhe das varandas e do pavimento de lazer ao anoitecer", 1080, 691),
    foto("fachada-embasamento", "Embasamento do Liwo: térreo com fachada ativa e quatro pavimentos de salas comerciais", 1080, 691),
    foto("aereo", "Vista aérea do Liwo no Parque Sul Karaíba, cercado por áreas verdes", 1080, 607),
  ],
  comercial: {
    titulo: "Working: salas de 34 a 78 m²",
    texto: "Quatro pavimentos de salas comerciais, com lobby e acesso independentes do residencial.",
    itens: ["Pavimento 1: salas de 34 a 62 m²", "Pavimentos 2 e 3: salas de 34 a 68 m²", "Pavimento 4: salas de 34 a 78 m²"],
    fotos: [
      foto("lazer/lobby-comercial", "Lobby comercial do Liwo", 1080, 692, "Lobby comercial"),
      foto("lazer/sala-comercial", "Sala comercial do Liwo", 1080, 692, "Sala comercial"),
      foto("lazer/lobby-residencial", "Lobby residencial do Liwo", 1080, 692, "Lobby residencial"),
    ],
  },
  obra: {
    geral: 17,
    conclusao: "05/2029",
    etapas: [
      { nome: "Preparo do terreno", pct: 100 },
      { nome: "Fundação", pct: 100 },
      { nome: "Estrutura", pct: 14 },
      { nome: "Alvenaria", pct: 2 },
      { nome: "Instalações", pct: 0 },
      { nome: "Acabamento", pct: 0 },
    ],
  },
  ficha: [
    { rotulo: "Arquitetura", valor: "Crosara Arquitetura" },
    { rotulo: "Interiores", valor: "Aline Borges" },
    { rotulo: "Pavimentos", valor: "24" },
    { rotulo: "Área do terreno", valor: "3.200,58 m²" },
    { rotulo: "Área total construída", valor: "23.237,29 m²" },
    { rotulo: "Área de lazer total", valor: "921,38 m²" },
    { rotulo: "Vagas de garagem", valor: "1 a 3 vagas" },
    { rotulo: "Níveis de garagem", valor: "Subsolo -2, Subsolo -1 e Térreo" },
  ],
  historico: [
    { ano: "2017", nomes: "Vicenza" },
    { ano: "2018", nomes: "Provence" },
    { ano: "2020", nomes: "Absoluto e Concept" },
    { ano: "2023", nomes: "Essenza e Splendor" },
    { ano: "2024", nomes: "You" },
    { ano: "2026", nomes: "Grecco e Garnet" },
    { ano: "2027", nomes: "Leván" },
  ],
  proposta: { autor: "Bernardo Oliveira", aviso: "Protótipo de proposta para a Maxi · não é o site oficial" },
};

writeFileSync(new URL("../data/empreendimento.json", import.meta.url), `${JSON.stringify(dados, null, 2)}\n`);
console.log(`data/empreendimento.json: ${unidades.length} unidades, ${tipos.length} tipos, ${terreo.length} espaços de lazer.`);
