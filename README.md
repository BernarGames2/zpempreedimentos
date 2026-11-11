# Live ZP Connect — site 3D interativo

Site de lançamento do **Live ZP Connect** (ZP Empreendimentos, Uberlândia – MG). O visitante vê o prédio em 3D, escolhe uma unidade na fachada, entra no apartamento (maquete e passeio em primeira pessoa), compara cada cômodo com a foto oficial do decorado, estuda o sol, visita o lazer e fala com a ZP pelo WhatsApp.

> **Dados de demonstração.** Preços, aluguéis, metragens, plantas, status, lazer e endereço do arquivo `data/empreendimento.json` são exemplos. O site mostra o selo "Dados de demonstração" até você trocar os dados e pôr `demonstracao.ativo` em `false`.

## Como rodar

```bash
npm install
```

```bash
npm run dev
```

Abra `http://localhost:3000`. Para a versão de produção:

```bash
npm run build
```

```bash
npm start
```

Requer Node 20.9 ou mais novo.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes Playwright (celular 390×844 e desktop 1440×900) com capturas em `tests/capturas/` |
| `npm run typecheck` | Checagem de tipos |
| `npm run models` | Otimiza os `.glb` de `modelos-originais/` para `public/models/` |
| `npm run comparativo` | Gera o comparativo 3D × render oficial em `docs/comparativo/` |
| `npm run dados-exemplo` | Recria o JSON de demonstração |
| `npm run splat-teste` | Cria um splat sintético para testar o caminho Spark |
| `npm run modelo-teste` | Cria um `predio.glb` de teste com malhas `unidade_NNNN` |

## Onde trocar cada coisa (sem mexer no código)

Tudo o que é conteúdo fica em `data/` e `public/`. O site detecta sozinho os arquivos opcionais de `public/` (em produção, na hora do build — depois de adicionar arquivos, faça um novo build ou deploy).

| Quero trocar | Onde |
|---|---|
| Unidades, preços, aluguéis, status | `data/empreendimento.json` → `unidades` |
| Venda, locação ou os dois | `modo`: `"venda"`, `"locacao"` ou `"ambos"` |
| Plantas e cômodos | `tipos` (polígonos em metros, portas e janelas) |
| Lazer | `terreo` e `cobertura` |
| Textos do site | `textos` |
| WhatsApp | `whatsapp` |
| Orientação do terreno | `orientacaoNorteGraus` (para onde aponta a fachada da frente; 0 = norte, 90 = leste) |
| Fotos do decorado | `public/referencias/` e o campo `fotoDecorado` de cada cômodo |
| Interiores fotorrealistas (splats) | `public/splats/` e `public/splats/real/` |
| Modelo 3D do arquiteto | `public/models/predio.glb`, `public/models/apto-[tipo].glb` |
| Vista real das janelas | `public/vistas/andar-NN.jpg` (panorâmica 360°) |
| Céu/reflexos | `public/hdri/*.hdr` |
| Logo | `public/brand/logo.svg` (ou `.png`) |
| Tirar o selo de demonstração | `demonstracao.ativo: false` |

O JSON é validado ao iniciar. Se faltar um campo ou houver um valor errado, o erro diz o caminho exato, por exemplo: `data/empreendimento.json → "unidades[12].status": esperado um de disponivel | reservada | vendida | alugada`.

### Unidades

Cada unidade tem `numero`, `andar`, `posicao` (1 a 6 no andar), `tipo` (id de `tipos`), `fachada`, `areaPrivativa`, `preco`, `aluguel` (use `null` para "Consulte") e `status`. As seis posições do prédio procedural são: 1 e 2 na frente, 3 e 4 na lateral (sacadas corridas), 5 e 6 nos fundos.

### Plantas

Cada cômodo é um polígono em metros (`[x, z]`), com paredes alinhadas aos eixos. A fachada do apartamento fica no lado de maior `z`. `portas` e `janelas` são vãos sobre as arestas; `liga` diz quais cômodos a porta conecta (é o que a câmera usa para andar entre eles). `enquadramento` é a câmera que reproduz a foto oficial do cômodo.

O mobiliário procedural espera os cômodos `sala`, `cozinha`, `quarto`, `banheiro` e `varanda`, e se ajusta às medidas de cada um.

## Interiores fotorrealistas (Gaussian Splatting)

O passeio usa sempre a melhor camada disponível para cada cômodo:

1. **Captura real** em `public/splats/real/[comodo].spz` (melhor resultado);
2. **Mundo gerado a partir dos renders** em `public/splats/[comodo].spz`;
3. **Interior procedural**, com o aviso "Prévia simplificada" (é o que aparece hoje, porque `public/splats` está vazio).

A maquete usa sempre o interior procedural.

### Caminho A — a partir dos renders (World Labs Marble)

1. Crie uma conta em https://marble.worldlabs.ai.
2. Crie um mundo por cômodo:

   | Mundo | Imagens |
   |---|---|
   | `sala` (serve também à cozinha) | `03-sala-varanda.png` + `07-cozinha.png` |
   | `varanda` | `06-varanda.png` + `03-sala-varanda.png` |
   | `quarto` | `05-quarto.png` |
   | `banheiro` | `04-banheiro.png` |

3. Teste em Draft; se ficar bom, gere de novo na melhor qualidade.
4. Exporte de cada mundo e salve em `public/splats/`:
   - SPZ 2M → `sala.spz`
   - SPZ 500K → `sala-500k.spz`
   - Collider mesh (GLB) → `sala-collider.glb`
5. Faça o build. O site carrega o arquivo de 500K fora do nível de qualidade alto (celular) e o de 2M no nível alto.

Com uma foto só, o Marble inventa o que não aparece no render. Perto do ângulo da foto fica muito realista; longe, menos. Por isso cada cômodo tem uma **área segura** no JSON (`splat.areaSegura`), e a câmera não sai dela.

### Caminho B — captura real

Filme cada cômodo do decorado em 4K, devagar, na altura do peito, com as luzes acesas. Converta em splat (Marble, Polycam, Scaniverse, Luma) e salve como `.spz` ou `.ply` em `public/splats/real/`. Essa pasta tem prioridade.

### Ajuste de posição

Para cada cômodo, no JSON:

- `splatTransform.posicao`, `rotacaoY` (graus) e `escala` encaixam o mundo na planta. `rotacaoX` vem com 180, que põe em pé os arquivos do Marble (eixo Y para baixo); use 0 se a sua captura já estiver em pé.
- `splat.spawn` e `splat.olhar` são onde a câmera nasce e para onde olha.
- `splat.areaSegura` é o centro e o raio (m) da região bem reconstruída.

Quando colocar os arquivos, peça ao Claude Code: "Os splats estão em /public/splats. Siga a seção 1.1 do PROMPT-COMPLETO-site-3D.md."

Para conferir o caminho antes de ter os arquivos reais, `npm run splat-teste` cria uma sala sintética (`npm run splat-teste -- --apagar` remove).

### Automação pela API da World Labs

Não foi criada: o projeto não tem `WORLDLABS_API_KEY`. O processo é o manual acima. Se você conseguir uma chave, ponha em `.env` e peça o script `npm run gerar-mundos` (consulte https://docs.worldlabs.ai).

## Modelos reais do arquiteto

Se existirem, substituem o procedural sem mudar o código:

- `public/models/predio.glb` substitui a torre;
- `public/models/apto-[tipo].glb` (por exemplo `apto-studio.glb`, `apto-1q.glb`) substitui o interior.

### Convenção de nomes das malhas

| Nome | Efeito |
|---|---|
| `unidade_1201` | Unidade clicável (uma malha por unidade, com o número do JSON) |
| `comodo_sala` | Piso/volume do cômodo |
| `lazer_piscina` | Espaço de lazer |
| `janela_*` | Vidros |
| `teto_*` | Escondido no modo maquete |

O modelo deve estar em **metros**, com o térreo em `y = 0`, o centro da torre na origem, a frente virada para `+Z` e a lateral das sacadas corridas para `+X`. No apartamento, a origem é o canto da planta do JSON e a fachada fica em `+Z`. A planta do JSON continua valendo para colisão, abas e minimapa, então mantenha as duas coerentes.

### Converter para .glb pelo Blender

1. **SketchUp:** exporte `.dae` (Collada) ou use a extensão de importação `.skp` do Blender; **Revit:** exporte `.fbx` ou `.ifc`; **3ds Max:** exporte `.fbx` (converta materiais V-Ray para Standard/PBR antes); **FBX:** `File > Import > FBX`.
2. No Blender, confira a escala (1 unidade = 1 m) e aplique as transformações (`Ctrl+A > All Transforms`).
3. Separe uma malha por unidade e renomeie no Outliner (`unidade_1201`, `teto_sala`...).
4. Troque materiais de render por Principled BSDF com texturas de até 2048 px.
5. `File > Export > glTF 2.0 (.glb)`, com "Apply Modifiers" e sem câmeras e luzes.
6. Salve em `modelos-originais/` e rode `npm run models`.

`npm run models` roda o gltf-transform (dedup, prune, weld, compressão meshopt, texturas WebP de no máximo 2048 px), grava em `public/models/` e mostra o tamanho antes e depois, com as metas (prédio < 8 MB, cada interior < 15 MB).

## Vista das janelas

Sem panorâmicas, o site usa um céu de fim de tarde com luzes de cidade e avisa "Vista ilustrativa". Para a vista real, salve panorâmicas 360° equirretangulares (fotos de drone) como `public/vistas/andar-05.jpg`, `andar-12.jpg`... O site usa a do andar mais próximo. O centro da imagem deve apontar para onde olha a fachada da frente.

## Métricas e leads (desligados por padrão)

Copie `.env.example` para `.env.local` e preencha o que quiser:

- `NEXT_PUBLIC_GA_ID` e `NEXT_PUBLIC_META_PIXEL_ID` ligam Google Analytics e Meta Pixel. Eventos: `unidade_vista`, `entrou_no_apartamento`, `abriu_foto_decorado`, `tempo_no_passeio`, `clicou_whatsapp`, `compartilhou`, `lazer_visto`, `lead_enviado`.
- `LEAD_WEBHOOK_URL` recebe um POST JSON a cada formulário enviado (planilha, Zapier, Make, e-mail). Sem ela, o lead segue só pelo WhatsApp e nada é guardado.
- `NEXT_PUBLIC_SITE_URL` é o endereço público (Open Graph, sitemap, dados estruturados).

## Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Em https://vercel.com/new, importe o repositório. O framework (Next.js) é detectado sozinho; não precisa configurar build.
3. Em **Settings > Environment Variables**, adicione `NEXT_PUBLIC_SITE_URL` (e as opcionais de métricas e leads).
4. Deploy. A cada push, a Vercel publica de novo.

Arquivos grandes (`.spz`, `.glb`, panorâmicas) vão em `public/` no próprio repositório. Se passarem de 100 MB cada, use Git LFS ou um armazenamento externo.

## Como o projeto está organizado

```
app/                      páginas, layout, API de lead, robots e sitemap
components/three/         cenas, câmera, controles, materiais, splats
components/ui/            header, painéis, filtros, abas, minimapa
components/secoes/        seções do site abaixo do 3D
lib/store.ts              máquina de estados da experiência (zustand)
lib/procedural/           prédio, planta, mobiliário e texturas gerados por código
data/empreendimento.json  todos os dados editáveis
public/                   referências, splats, modelos, HDRI, vistas, marca
scripts/                  otimização de modelos, comparativo, dados de exemplo
tests/                    testes Playwright
docs/comparativo/         3D × renders oficiais, lado a lado
```

Estados da experiência: `INTRO → PREDIO → UNIDADE → ENTRANDO → MAQUETE ⇄ PASSEIO`, mais `VISTA` e `LAZER`. As transições permitidas estão em `TRANSICOES` (`lib/store.ts`).

Links diretos: `/?unidade=1201` e `/?unidade=1201&comodo=sala`. Parâmetros de apoio: `?q=alto|medio|baixo` fixa a qualidade, `?semwebgl=1` mostra a versão 2D, `?debug=1` expõe o estado em `window.__zp`.

## Desempenho medido

Medido neste repositório com `node scripts/medir.mjs` (site em produção local):

| Meta | Resultado |
|---|---|
| JavaScript inicial < 300 KB gzip | **249 KB** (o 3D, 438 KB, é baixado sob demanda) |
| < 200 chamadas de desenho no exterior | **152** no nível médio com pós-processamento; **100** no nível baixo |
| Prédio < 8 MB | Procedural: 0 MB de modelo (cerca de 81 mil triângulos) |
| Interior < 15 MB | Procedural: 0 MB; splats dependem dos arquivos exportados (500K ≈ 10 a 15 MB) |
| Imagens em WebP/AVIF responsivas | Sim, via `next/image` |
| `devicePixelRatio` ≤ 1,5 no celular | Sim |
| Pausa com a aba oculta ou o 3D fora da tela | Sim |

**Não medido aqui:** 60 fps no desktop, ≥ 30 fps em celular intermediário e primeira interação < 4 s no 4G. O ambiente de desenvolvimento só tem GPU por software, que não representa aparelhos reais. Meça em um Galaxy A54 (ou similar) e em um desktop com o painel Performance do Chrome; o site já ajusta a qualidade sozinho se o aparelho não acompanhar.

## Limitações conhecidas

- O interior procedural é uma prévia: tem a composição e os materiais dos renders, mas não chega ao realismo deles. O realismo "de foto" depende dos splats.
- As texturas (madeira, cimento, granito, folhagem) são geradas por código, porque o ambiente de desenvolvimento não tinha acesso ao Poly Haven. Os HDRIs em `public/hdri` são CC0 (Poly Haven, via repositório drei-assets).
- O three.js está fixado em 0.180: a oclusão de ambiente (N8AO) falha com versões mais novas.
- As plantas só aceitam paredes alinhadas aos eixos.
