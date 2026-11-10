# PROMPT — Site 3D interativo do Live ZP Connect

> Coloque este arquivo e a pasta `referencias/` na raiz do projeto e diga ao Claude Code:
> **"Leia PROMPT-COMPLETO-site-3D.md, abra todas as imagens de referencias/ e execute, fase por fase."**

---

## 0. Dados do projeto

| Campo | Valor |
|---|---|
| Empreendimento | **Live ZP Connect** (também anunciado como "Live ZP Studios Connect") |
| Incorporadora | ZP Empreendimentos |
| Localização | Bairro Saraiva / Santa Maria, Uberlândia – MG *(confirmar endereço exato)* |
| Tipologias | Studios e/ou 1 quarto, entregues mobiliados *(confirmar metragens e plantas)* |
| Lazer citado em anúncios | Portaria 24 h, 2 elevadores, coffee living, coworking, lavanderia, área gourmet, piscina, salão de festas *(confirmar)* |
| Nº de andares | ~13 andares tipo, contados no render + térreo e cobertura *(confirmar)* |
| Unidades por andar | A CONFIRMAR |
| Orientação da fachada principal | A CONFIRMAR |
| WhatsApp comercial | (34) 99898-5445 |
| Situação da obra | A CONFIRMAR (há anúncios de locação, então pode já estar entregue) |

---

## 1. Referências visuais — leia antes de tudo

A pasta `referencias/` tem os renders oficiais. **Abra e estude cada imagem antes de modelar.** O 3D precisa ser reconhecível como este prédio e estes ambientes.

| Arquivo | O que mostra | Use para |
|---|---|---|
| `01-fachada-esquina.png` | Torre inteira vista da esquina, à noite | Volumetria, cores, sacadas, coroamento, embasamento |
| `02-portaria-entrada.png` | Portaria de baixo para cima | Hall de vidro, painel iluminado, vasos e palmeiras |
| `03-sala-varanda.png` | Sala integrada à varanda | Materiais e iluminação da sala |
| `04-banheiro.png` | Bancada do banheiro | Materiais do banheiro |
| `05-quarto.png` | Quarto | Materiais e iluminação do quarto |
| `06-varanda.png` | Varanda | Jardim vertical, guarda-corpo, forro |
| `07-cozinha.png` | Cozinha e bar | Marcenaria, revestimento, pendentes |

Copie a pasta para `/public/referencias/`. As imagens também aparecem no site (ver 6.6, "Foto do decorado").

---

## 1.1 Estratégia de realismo — "como se a pessoa estivesse lá" (PRIORIDADE MÁXIMA)

Modelo feito por código nunca chega ao nível dos renders. Por isso o **interior é feito com Gaussian Splatting**: milhões de pontos com cor e luz reais "assados", que ficam fotorrealistas e por onde se anda livremente no navegador.

**Camadas de realismo (use sempre a melhor disponível):**

| Nível | Fonte do interior | Arquivos | Quando |
|---|---|---|---|
| 1 — Real | Captura do apartamento/decorado real (vídeo de celular ou câmera 360° → splat) | `/public/splats/real/[comodo].spz` | Se o prédio já estiver pronto (melhor resultado) |
| 2 — Renders | Mundos gerados no **World Labs Marble** a partir dos renders oficiais de `referencias/` | `/public/splats/[comodo].spz` + `[comodo]-collider.glb` | Padrão para começar |
| 3 — Fallback | Interior procedural (seção 8) | — | Só se não houver splat, e sempre para o modo maquete |

**Renderização dos splats:**
- Use **Spark** (`@sparkjsdev/spark`, renderer de Gaussian Splatting para three.js da World Labs, com LoD/streaming), integrado ao React Three Fiber com `SparkRenderer` + `SplatMesh`. Consulte https://sparkjs.dev/docs e o repositório oficial para a API da versão instalada.
- O `WebGLRenderer` deve ser criado com `antialias: false` (o antisserrilhado não melhora splats e custa desempenho).
- Carregue a versão **500K** no celular e a **2M** no desktop (escolha automática + troca manual na qualidade).
- O pós-processamento pesado (AO, bloom) fica **desligado dentro dos splats**: a luz já vem assada.

**Navegação dentro do splat:**
- Use o `[comodo]-collider.glb` (exportado do Marble) como malha invisível para colisão, para o raycast do "tocar no chão para andar" e para limitar a câmera à área bem reconstruída.
- Defina para cada cômodo, no JSON, uma "área segura" (raio/caixa) em volta do ponto de captura. Fora dela o splat degrada; impeça a câmera de sair dessa área.
- Cada cômodo pode ser um mundo separado. A troca entre cômodos (abas ou portas) é um fade rápido para branco quente de 400 ms, com o próximo splat pré-carregado.
- Câmera com movimento suave e leve "respiração" (balanço mínimo) para dar sensação de presença; FOV 70°, altura 1,60 m.
- Áudio ambiente opcional e discreto por cômodo (desligado por padrão, com botão de som).

**Automação opcional:** se existir `WORLDLABS_API_KEY` no `.env`, crie `npm run gerar-mundos`, que envia as imagens de `referencias/` à API da World Labs (consulte https://docs.worldlabs.ai), baixa os `.spz` e os colliders e os coloca nas pastas certas. Se não houver chave, apenas documente o processo manual no README.

---

## 2. Seu papel e o padrão de qualidade

Você é um desenvolvedor sênior de experiências 3D para a web, no nível de estúdios que fazem sites de lançamento de alto padrão. O resultado precisa parecer um produto de agência premium, não um demo de three.js. Cada transição de câmera deve ser suave, cada clique deve ter resposta visual imediata, e nada pode travar no celular.

Antes de escrever código, leia este arquivo inteiro, abra as referências e monte um plano curto. Depois execute **uma fase por vez** (seção 13), e só avance quando os critérios daquela fase passarem.

---

## 3. O produto

Um site em que o interessado:

1. vê o prédio Live ZP Connect em 3D, gira e aproxima;
2. filtra e escolhe uma unidade na própria fachada, vendo preço e situação;
3. entra no apartamento: primeiro em modo **maquete** (teto removido, vista de cima), depois em modo **passeio** em primeira pessoa;
4. compara cada cômodo do 3D com a **foto oficial do decorado**;
5. vê a **posição do sol** em cada horário e a **vista da janela** naquele andar;
6. visita as áreas de lazer;
7. fala com a ZP pelo WhatsApp com a unidade já citada na mensagem, ou compartilha o link exato da unidade e do cômodo.

---

## 4. Stack (não troque sem me perguntar)

- **Next.js** (App Router) + **TypeScript** estrito + **Tailwind CSS**
- **three.js**, **@react-three/fiber**, **@react-three/drei**, **@react-three/postprocessing**
- **@sparkjsdev/spark** para os interiores em Gaussian Splatting
- **zustand** para o estado da experiência
- **framer-motion** para a interface 2D
- **@gltf-transform/cli** para otimizar modelos
- **Playwright** para testes e capturas de tela
- Versões estáveis mais recentes e compatíveis entre si.

### Estrutura de pastas

```
/app                      páginas e layout
/components/three         cenas, câmera, controles, materiais
/components/ui            header, painéis, filtros, abas, minimapa
/lib/store.ts             estado global (zustand)
/lib/procedural           geração do prédio e dos apartamentos por código
/data/empreendimento.json todos os dados editáveis
/public/referencias       renders oficiais (fotos do decorado)
/public/splats            [comodo].spz, [comodo]-500k.spz, [comodo]-collider.glb (interiores fotorrealistas)
/public/splats/real       capturas reais, se houver (têm prioridade)
/public/models            predio.glb, apto-[tipo].glb, moveis/*.glb (opcionais)
/public/hdri              céu noturno/fim de tarde (.hdr)
/public/textures          texturas PBR
/public/vistas            panorâmicas 360° da vista por altura (opcionais)
/scripts/optimize-models  pipeline de otimização
/tests                    testes Playwright
```

---

## 5. Dados — `data/empreendimento.json`

Crie tipos TypeScript para tudo e valide o JSON na inicialização (erro claro se faltar campo).

```ts
type Status = "disponivel" | "reservada" | "vendida" | "alugada";

interface Empreendimento {
  nome: string; incorporadora: string; endereco: string;
  whatsapp: string; orientacaoNorteGraus: number;
  modo: "venda" | "locacao" | "ambos";      // muda os textos e o que o painel mostra
  andares: number; peDireito: number; terreo: Lazer[]; cobertura: Lazer[];
  tipos: TipoPlanta[]; unidades: Unidade[]; textos: Record<string, string>;
}
interface Unidade {
  numero: string; andar: number; posicao: number; tipo: string;
  fachada: "frente" | "lateral";           // a lateral tem as sacadas corridas
  areaPrivativa: number; preco: number | null; aluguel: number | null;
  status: Status; vista?: string;
}
interface TipoPlanta {
  id: string; nome: string; quartos: number; vagas: number; mobiliado: boolean;
  comodos: Comodo[]; portas: Abertura[]; janelas: Abertura[];
}
interface Comodo {
  id: string; nome: string; poligono: [number, number][];
  piso: "porcelanato-cinza" | "externo"; area: number;
  fotoDecorado?: string; // ex.: "/referencias/05-quarto.png"
  splat?: { desktop: string; mobile: string; collider: string;
            spawn: [number, number, number]; olhar: [number, number, number];
            areaSegura: { centro: [number, number, number]; raio: number } };
  // posição e escala do splat ajustáveis aqui, sem mexer no código
  splatTransform?: { posicao: [number, number, number]; rotacaoY: number; escala: number };
}
```

Ligue as fotos aos cômodos: sala → `03`, banheiro → `04`, quarto → `05`, varanda → `06`, cozinha → `07`.

**Regra de ouro:** não invente preço, aluguel, metragem, disponibilidade nem número de andares. Use dados de exemplo plausíveis para um studio de alto padrão e mostre o selo **"Dados de demonstração"** no site enquanto houver qualquer campo de exemplo.

---

## 6. A experiência 3D — máquina de estados

Implemente como uma máquina de estados explícita no `store.ts`. Cada estado define câmera, controles e interface. As transições de câmera usam curvas suaves (`easeInOutCubic`, 1,2 s a 2 s), nunca saltos.

### 6.1 `INTRO`
- Tela de carregamento: logo ZP, "Live ZP Connect" e barra de progresso real.
- Ao terminar, a câmera faz em 4 s uma subida cinematográfica da portaria (enquadramento de `02`) até a vista de esquina da torre inteira (enquadramento de `01`). O botão "Pular" fica sempre visível.

### 6.2 `PREDIO`
- Controles de órbita com limites: não atravessa o chão, não entra no prédio e tem zoom mínimo e máximo. Amortecimento suave. Toque com 1 dedo gira, pinça faz zoom.
- A vista inicial reproduz o ângulo de `01-fachada-esquina.png`.
- Cada unidade é um objeto clicável separado (no modelo real, malhas nomeadas `unidade_1201`).
- **Hover/toque:** a unidade ganha um contorno suave e um rótulo flutuante ("1201 · Studio · 32 m²").
- **Status** como vidro tingido discreto, nunca cor chapada: disponível em verde-esmeralda, reservada em âmbar, vendida/alugada em cinza fosco. O botão "Ver status" liga e desliga essa camada, para o prédio também poder ser visto com a aparência original.
- **Filtros** (barra lateral no desktop, gaveta inferior no celular): tipo, faixa de andar, faixa de preço/aluguel e "só disponíveis". As unidades fora do filtro ficam com 15% de opacidade. Mostre o contador.

### 6.3 `UNIDADE`
- A câmera voa até ficar de frente para a unidade escolhida.
- Painel com número, andar, tipo, área, mobiliado, vagas, preço e/ou aluguel (ou "Consulte"), status, posição solar e botões:
  - **Entrar no apartamento**
  - **Ver a vista deste andar**
  - **Falar no WhatsApp**, com a mensagem "Olá! Tenho interesse na unidade 1201 do Live ZP Connect. Pode me passar mais informações?"
  - **Compartilhar**, que copia o link direto `/?unidade=1201`.
- Setas para ir à unidade de cima, de baixo e às do lado.

### 6.4 `ENTRANDO` (transição)
- A câmera se aproxima da sacada da unidade, passa pelo guarda-corpo de grade e entra pela porta de vidro da varanda. O exterior desaparece com fade e o interior aparece no lugar. Carregue o interior em segundo plano assim que a unidade for selecionada.

### 6.5 `MAQUETE`
- Vista isométrica de cima, girando em volta do apartamento, com o teto removido e as paredes cortadas a 1,20 m, mostrando o mobiliário.
- **Pontos de interesse** pulsantes em cada cômodo. Ao passar o mouse, mostram o nome e a área. Ao clicar, levam ao passeio já dentro daquele cômodo.
- Botão "Mostrar medidas".

### 6.6 `PASSEIO` (primeira pessoa, fotorrealista)
- **Cada cômodo é mostrado pelo seu splat** (seção 1.1). O interior procedural só aparece se o cômodo não tiver splat, com o aviso "Prévia simplificada".
- A câmera nasce no `spawn` do cômodo, olhando para `olhar`, que deve reproduzir o enquadramento da foto oficial.
- Câmera a 1,60 m com campo de visão de 70°.
- **Celular:** tocar no chão move a câmera até o ponto (anel-alvo no piso, estilo Matterport); arrastar gira o olhar.
- **Desktop:** WASD/setas, arrastar para olhar e clique no chão para ir até o ponto.
- Colisão com paredes e móveis.
- **Abas inferiores** com os cômodos (Sala, Cozinha, Quarto, Banheiro, Varanda): ao tocar, a câmera desliza até o cômodo e para no **mesmo enquadramento da foto oficial** daquele cômodo.
- **Botão "Foto do decorado"**: em cada cômodo com `fotoDecorado`, mostra o render oficial com uma transição suave (crossfade) a partir da câmera 3D no mesmo ângulo. Inclua um controle deslizante "3D ↔ Foto" para comparar.
- **Minimapa** no canto: planta 2D com ponto e cone de visão. Clicar leva até o ponto.
- Botões fixos: "Maquete", "Voltar ao prédio", "Agendar visita".
- A URL acompanha o cômodo: `/?unidade=1201&comodo=sala`.

### 6.7 Estudo de sol (em `UNIDADE`, `MAQUETE` e `PASSEIO`)
- Controle deslizante de 6h às 18h que move o sol de verdade, usando a latitude de Uberlândia (-18,9°) e a orientação no JSON.
- O botão "Noite" acende toda a iluminação artificial (é como nos renders oficiais).
- Texto automático, por exemplo: "Sol da manhã na varanda".

### 6.8 Vista da janela
- Se houver uma panorâmica em `/public/vistas` para aquela altura, use-a nas janelas e no modo "Ver a vista" em 360°.
- Se não houver, use um céu azul de fim de tarde com luzes de cidade ao longe (como em `03`, `06` e `07`) e o aviso "Vista ilustrativa".

### 6.9 `LAZER`
- Pontos clicáveis no térreo e na cobertura para cada item de lazer do JSON (coffee living, coworking, lavanderia, área gourmet, piscina, salão de festas).
- A câmera voa até o espaço e abre um cartão escuro com etiqueta ("Cobertura · Exclusivo para moradores"), título, três destaques, descrição curta, lista de itens e os botões "Voltar ao prédio" e "Agendar visita".
- Se um espaço não tiver modelo, mostre um volume elegante com o nome e o aviso "Imagem ilustrativa".

---

## 7. Como modelar o prédio (seguir `01` e `02`)

Gere a torre por código reproduzindo fielmente os renders. Use as medidas aproximadas abaixo e ajuste comparando com `01`.

**Volume:**
- Torre retangular esbelta, com ~13 andares tipo e pé-direito de 2,88 m, sobre um embasamento mais largo de 1 a 2 pavimentos.
- Duas fachadas visíveis na esquina: a **frente** (esquerda no render), mais estreita, e a **lateral** (direita), mais longa.

**Cores e materiais:**
- Pintura branco-gelo como cor dominante.
- Faixa vertical recuada em **areia/bege quente** no centro da frente, onde ficam os vãos das sacadas.
- Detalhes em **grafite**.

**Fachada da frente:**
- **Caixas de sacada em balanço grafite**, empilhadas em coluna à esquerda, com spots embutidos no forro (pontos de luz quente).
- Pequenas janelas quadradas com caixilho escuro e janelas maxim-ar espalhadas pelas faixas brancas.
- Vãos de sacada com guarda-corpo de grade escura e luz quente vinda de dentro.

**Fachada lateral:**
- **Sacadas corridas** em todos os andares, com borda de laje em **revestimento cinza texturizado** (granito/textura) e **guarda-corpo de grade metálica preta quadriculada** (a mesma de `06`).
- Uma **faixa vertical grafite** no centro, de cima a baixo.
- Spots quentes no forro de cada sacada.
- Logo **"ZP"** em relevo no alto.

**Coroamento:**
- Platibanda branca grossa em balanço, como uma "tampa", e cobertura com guarda-corpo de vidro escuro (área de lazer).

**Embasamento e portaria (ver `02`):**
- Muro branco alto com **painel decorativo vazado de desenho geométrico angular**, iluminado por trás.
- Letreiro **"LIVE ZP connect"** em metal escovado.
- Balizadores e uplights quentes lavando o muro, portão de garagem grafite e palmeiras (areca/imperial) com iluminação de baixo para cima.
- **Hall de entrada** com pé-direito duplo em vidro e caixilho preto, porta pivotante com puxador longo, painel ao lado com **relevo de arcos curvos iluminados em LED quente**, vasos brancos altos com costela-de-adão e forro com spots.

**Ambiente:**
- Noite com céu azul profundo (como em `01` e `02`), rua com asfalto, calçada e árvores.
- Use instancing para sacadas, janelas, grades e spots.

---

## 8. Como modelar os interiores (seguir `03` a `07`)

Estilo **industrial-contemporâneo escuro e aconchegante**, igual para todos os cômodos:

| Elemento | Especificação |
|---|---|
| Paredes | Grafite fosco; uma parede de destaque em **cimento queimado** na sala |
| Painéis | **Madeira clara com textura ondulada/escovada em relevo** (normal map forte), na sala, no banheiro e no quarto |
| Piso | Porcelanato cinza-claro de placas grandes; tapete patchwork de couro na sala; tapete felpudo verde-oliva no quarto |
| Teto | Branco, com **trilhos pretos de spots** na sala e na cozinha e spots embutidos quadrados no quarto e no banheiro |
| Varanda | **Jardim vertical** cobrindo a parede inteira (samambaias e folhagens), forro de **madeira clara** com sanca de LED, guarda-corpo de **grade preta quadriculada**, porcelanato, poltrona de couro caramelo com estrutura de madeira, mesa preta baixa |
| Sala | Sofá cinza-claro de linho com almofadas, mesa alta redonda com banquetas pretas de assento de madeira, fita de LED quente sob o painel |
| Cozinha | Marcenaria **preta fosca**, prateleiras de **madeira escura**, backsplash de **pastilha hexagonal preta**, pendentes industriais de gaiola com lâmpada filamento, geladeira inox, balcão-bar em madeira com TV no painel |
| Quarto | Cama baixa com **LED sob a base**, roupa de cama grafite com almofadas amarelas, pendente de **globo dourado**, painel de madeira subindo pela parede e pelo teto com **frisos de LED lineares**, armário de **vidro fumê**, cortina cinza, quadro preto e branco |
| Banheiro | Nicho em madeira ondulada com spots, **espelho redondo** grande, **cuba quadrada preta** de apoio, bancada de **granito preto (São Gabriel)**, prateleira de madeira com LED abaixo, toalhas grafite, portas grafite |

**Iluminação interna:** quente (2700 K), com destaque para sancas, fitas e spots. Os renders oficiais são noturnos com céu azul ao fundo; reproduza esse clima no modo "Noite".

**Mobiliário:** use GLB CC0 de `/public/models/moveis` se existirem; se não, crie as peças por código com cantos arredondados e bons materiais, nada de caixas cruas. Ponha nos objetos a mesma composição e posição vistas nas fotos, para a câmera do passeio poder reproduzir cada enquadramento.

---

## 9. Realismo visual

- Renderer com `ACESFilmicToneMapping`, saída sRGB e luzes físicas.
- HDRI noturno/fim de tarde (CC0, Poly Haven) para reflexos, mais uma luz direcional como sol (modo dia) com sombras suaves (PCFSoft) sem serrilhado.
- Materiais PBR com texturas CC0: madeira (com normal map de relevo para o efeito ondulado), cimento queimado, porcelanato, granito preto, metal preto, inox, vidro escuro, couro, linho e folhagem (cards de folhas instanciados com alpha para o jardim vertical).
- Muitas luzes pontuais pequenas (spots) são caras: no exterior, simule-as com emissivo + bloom e texturas de luz (cookies); no interior, use poucas luzes reais e complete com emissivos e mapas de luz.
- Pós-processamento: oclusão de ambiente (N8AO), bloom leve nos LEDs, antisserrilhado SMAA e vinheta sutil.
- **Três níveis de qualidade** (alto/médio/baixo), escolhidos automaticamente pelo `PerformanceMonitor` do drei, com troca manual no menu.
- Na fase 4, renderize capturas do 3D nos mesmos ângulos de `01`, `03` e `05` e coloque-as **lado a lado com os renders oficiais**. Ajuste cores, materiais e luz até ficarem o mais parecidas possível, e me mostre o comparativo.

---

## 10. Modelos reais (do arquiteto)

- Se `/public/models/predio.glb` ou `/public/models/apto-[tipo].glb` existirem, use-os no lugar do procedural, sem mudar mais nada no código.
- **Convenção de nomes** nas malhas: `unidade_1201`, `comodo_sala`, `lazer_piscina`, `janela_*`, `teto_*` (escondido no modo maquete).
- Crie `npm run models`, que roda o gltf-transform com: dedupe, prune, weld, compressão meshopt ou Draco e texturas em KTX2 (ou WebP) de no máximo 2048 px, e gera um relatório de tamanho antes e depois.
- No README, explique como converter SketchUp, Revit, 3ds Max ou FBX em .glb pelo Blender (os renders da ZP provavelmente vêm de um modelo 3ds Max/V-Ray ou SketchUp/Lumion) e como nomear as malhas.

---

## 11. O site em volta do 3D

- **Identidade ZP:**
  - Fundo **azul-marinho quase preto** (#141824 a #1B2030), como o fundo da marca ZP.
  - Cinza claro do logo para textos secundários e **dourado-âmbar quente** (cor das luzes dos renders) nos destaques e botões.
  - Madeira como textura de apoio.
  - Títulos em sans geométrica elegante (ex.: Montserrat ou Outfit em pesos leves, combinando com o logo); textos em Inter.
  - Logo em `/public/brand/` se existir; se não, escreva "ZP Empreendimentos" em texto.
- **Header fixo e transparente:** logo à esquerda; à direita "Unidades", "Decorado", "Lazer", "Localização" e o botão "Agendar visita".
- A experiência 3D ocupa a primeira tela inteira. Abaixo dela vêm as seções:
  - conceito "Live Connect" (morar conectado, prático e mobiliado);
  - galeria do decorado com os renders de `referencias/`;
  - lazer;
  - localização (mapa e tempo até a UFU, o Center Shopping e as avenidas João Naves de Ávila e Rondon Pacheco, que confirmo depois);
  - a incorporadora;
  - formulário e rodapé.
- **Formulário:** nome, WhatsApp e unidade de interesse (já preenchida se veio do 3D), com um seletor "Quero comprar / Quero alugar". Ao enviar, abra o WhatsApp com a mensagem pronta e registre o lead (com um ponto de integração para planilha ou e-mail, desligado por padrão).
- **Métricas para a ZP** (prontas para Google Analytics/Meta Pixel, desligadas por padrão): unidade vista, entrou no apartamento, abriu foto do decorado, tempo no passeio, clicou no WhatsApp e compartilhou.

---

## 12. Desempenho, celular, acessibilidade e SEO

**Metas (medir e me reportar):**
- 60 fps no desktop e ≥ 30 fps em celular intermediário (ex.: Galaxy A54) no nível médio.
- Primeira interação em < 4 s no 4G.
- JavaScript inicial < 300 KB gzip, fora o 3D sob demanda.
- Prédio < 8 MB e cada interior < 15 MB depois da otimização.
- < 200 chamadas de desenho no exterior.
- As imagens de referência no site em WebP/AVIF responsivas.

**Celular primeiro:**
- Painéis abrem como gaveta inferior arrastável, alvos de toque ≥ 44 px, `devicePixelRatio` limitado a 1,5 e nada de hover obrigatório.
- Pause a renderização quando a aba estiver oculta ou o 3D fora da tela.

**Acessibilidade e alternativas:**
- Com `prefers-reduced-motion`, troque os voos de câmera por cortes com fade.
- A interface 2D funciona por teclado e tem rótulos.
- Sem WebGL, mostre a versão 2D: render da fachada, tabela de unidades com filtros e galeria do decorado.

**SEO:**
- Conteúdo das seções renderizado no servidor.
- H1 "Studios mobiliados no Saraiva, Uberlândia" *(ajustar quando confirmarmos a tipologia)*.
- Metadados, Open Graph com `01-fachada-esquina.png` e dados estruturados (schema.org).

---

## 13. Execução em fases (obrigatório)

Ao final de **cada** fase:
1. rode `npm run build` sem erros nem avisos de tipo;
2. rode os testes Playwright, que tiram capturas em 390×844 (celular) e 1440×900 (desktop);
3. **abra e analise você mesmo as capturas**, comparando com os renders de `referencias/` e corrigindo o que estiver feio, diferente ou quebrado;
4. me mande um resumo de 5 linhas com o que ficou pronto.

| Fase | Entrega | Pronto quando |
|---|---|---|
| 1 | Projeto, tipos, JSON de exemplo, prédio procedural fiel a `01`/`02` e órbita | Uma captura no ângulo de `01` é reconhecível como o Live ZP Connect |
| 2 | Unidades clicáveis, status, filtros, painel, WhatsApp e link direto | Abrir `/?unidade=1201` foca a unidade certa; filtros funcionam |
| 3 | Passeio com **splats via Spark** (usando os `.spz` de `/public/splats`), collider, área segura, troca entre cômodos; interior procedural para a maquete e como reserva; entrada pela varanda, abas e minimapa | Dentro de cada cômodo a imagem parece uma foto, dá para andar no celular a ≥ 30 fps, e a câmera não sai da área bem reconstruída |
| 4 | Realismo: HDRI, PBR, pós-processamento, sol, modo noite, vista, níveis de qualidade e comparativo 3D × render | O comparativo lado a lado fica convincente |
| 5 | "Foto do decorado" com o controle 3D ↔ Foto, lazer, seções do site, formulário e métricas | O fluxo completo, da fachada ao WhatsApp, funciona |
| 6 | Desempenho, alternativa sem WebGL, acessibilidade e SEO | Metas da seção 12 medidas e cumpridas |
| 7 | README, `npm run models` e instruções de deploy na Vercel | Eu consigo trocar dados, fotos e modelos sozinho lendo o README |

---

## 14. Critérios finais de aceite

- [ ] Nenhum erro no console nem no build.
- [ ] O prédio 3D é reconhecível como o Live ZP Connect dos renders.
- [ ] Dentro do apartamento, cada cômodo com splat parece uma foto real e responde ao toque sem engasgos.
- [ ] Os cômodos 3D têm os mesmos materiais e a mesma atmosfera dos renders.
- [ ] Todas as transições de câmera são suaves.
- [ ] Funciona com uma mão no celular, da fachada ao WhatsApp.
- [ ] Nenhum dado inventado aparece como real; o selo "Dados de demonstração" aparece enquanto houver exemplo.
- [ ] Trocar o JSON muda unidades, preços e status sem mexer no código.
- [ ] Um `predio.glb` com malhas bem nomeadas substitui o procedural sem mexer no código.
- [ ] Links diretos de unidade e de cômodo funcionam.

## 15. Relatório final

Ao terminar, me entregue:
1. o que foi feito e como rodar;
2. as metas de desempenho medidas;
3. o comparativo 3D × renders oficiais;
4. **a lista exata do que pedir à ZP**: acesso a um apartamento pronto ou decorado para captura real, todos os renders e panorâmicas 360° do estúdio de renderização, tabela de unidades com preços e/ou aluguéis, plantas em DWG/PDF, modelo 3D do arquiteto, orientação do terreno, lista confirmada do lazer, fotos de drone por altura, logo em vetor e situação da obra;
5. os próximos passos sugeridos.


---

# APÊNDICE — Passos manuais para os interiores realistas

> Claude Code: esta parte é para eu (Bernardo) fazer fora do código. Na fase 3, se `/public/splats` estiver vazio, me lembre destes passos e siga com o interior procedural até eu colocar os arquivos.


O site usa **Gaussian Splatting** para o interior: em vez de um modelo 3D "de jogo", cada cômodo vira uma cena feita de milhões de pontos com a cor e a luz reais. Visto pelo celular, parece uma foto em que dá para andar.

Há dois caminhos. Comece pelo A, que funciona hoje só com as fotos que você já tem.

---

## Caminho A — a partir dos renders da ZP (World Labs Marble)

1. Crie uma conta em **https://marble.worldlabs.ai**.
2. Para cada cômodo, crie um mundo:

   | Mundo | Imagens a enviar |
   |---|---|
   | `sala` | `03-sala-varanda.png` + `07-cozinha.png` (juntas: o Marble aceita de 2 a 8 fotos da mesma cena) |
   | `varanda` | `06-varanda.png` + `03-sala-varanda.png` |
   | `quarto` | `05-quarto.png` |
   | `banheiro` | `04-banheiro.png` |
   | `portaria` | `02-portaria-entrada.png` (opcional; o Marble é mais fraco em exteriores) |

3. Gere primeiro em **Marble 1.0 Draft** (rápido e barato) para testar. Se ficar bom, gere de novo em **Marble 1.1 Plus** (melhor qualidade).
4. Exporte de cada mundo:
   - **Gaussian splat SPZ 2M** → salve como `sala.spz`
   - **Gaussian splat SPZ 500K** → salve como `sala-500k.spz`
   - **Collider mesh (GLB)** → salve como `sala-collider.glb`
5. Coloque tudo em `/public/splats/` no projeto.

**Limite:** com uma foto só, o Marble "imagina" as partes que não aparecem no render (atrás da câmera, outros cantos). Perto do ângulo da foto fica muito realista; longe dele, menos. O site limita a câmera a essa área boa. Quanto mais fotos do mesmo cômodo, melhor, então peça à ZP **todos os renders** e, se o estúdio tiver, as **panorâmicas 360°** (o Marble aceita 360° e o resultado melhora muito).

---

## Caminho B — captura real (o mais realista de todos)

Se o Live ZP Connect já estiver pronto, peça para visitar um apartamento decorado ou mobiliado.

1. Filme cada cômodo com o celular, andando devagar, em 4K, com a câmera na altura do peito. Dê uma volta completa no cômodo e depois filme os cantos de perto. Use luz acesa e cortinas abertas, sem pessoas e sem espelhos virados para você.
2. Transforme o vídeo em splat com um destes:
   - **World Labs Marble** (aceita vídeo de walkthrough), ou
   - um app de captura de splats para celular (Polycam, Scaniverse, Luma ou similares).
3. Exporte em `.spz` ou `.ply` e coloque em `/public/splats/real/`. O site dá prioridade a essa pasta.

Com uma câmera 360° (Insta360, por exemplo) o resultado é ainda melhor e mais rápido de capturar.

---

## Depois

Diga ao Claude Code: **"Os splats estão em /public/splats. Siga a seção 1.1 do PROMPT-COMPLETO-site-3D.md."** Ele ajusta posição, escala e o ponto de partida de cada cômodo no `data/empreendimento.json`.
