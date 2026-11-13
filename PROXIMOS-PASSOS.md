# Liwo — onde continuar

Estado em 13/11/2026 (branch `maxi-liwo`; a versão publicada antes desta etapa está guardada em
`maxi-liwo-estavel`, commit 7e366c6 — para voltar: publicar esse commit no projeto `liwo-maxi` da Vercel).

## Feito até aqui
- Interiores 3D navegáveis nos finais 01 a 06, com modelos 3D de terceiros (licenças em `CREDITOS.md`),
  iluminação indireta pré-calculada (`scripts/assar-luz.ts`), madeiras fotográficas e banhos revestidos.
- Cozinhas dos finais 01, 03 e 06 com cuba e cooktop em modelo 3D sobre a bancada (`m.bancadaCozinha` em
  `lib/procedural/mobilia.ts`); box com perfis e chuveiro de teto; espelhos de interruptor junto às portas.
- Área de lazer (`components/three/Lazer.tsx`, medidas em `lib/procedural/lazer.ts`): água com fundo
  simulado, cáusticas, reflexo e luz subaquática à noite; borda, prainha e guarda-corpo de vidro;
  espreguiçadeiras de imersão, pufe, planta e mesa; quadra de pickleball com rede; playground com coberturas
  de ripas e montes; luzes embutidas no forro do terraço; enquadramentos de apresentação
  (`CAM_LAZER` em `lib/poses.ts`) que tiram da frente as árvores da floreira (`Predio.tsx`).
- Mapa de luz por planta (`scripts/assar-mapa.ts`, lido em `lib/luzVolume.ts`): sombra de contato e cantos
  escurecidos em paredes, revestimentos, tapetes, pisos e forros, calculados com a forma real dos modelos 3D.
  **Rodar de novo sempre que mudar planta ou mobília** (`npx tsx scripts/assar-mapa.ts`); face que mudar
  sem novo cálculo fica neutra, sem erro.
- Árvores e moitas de perto com cartões de folhas (`copaFolhas` em `components/three/Entorno.tsx`), só no
  nível de qualidade alto (o ajuste automático volta aos volumes lisos se o aparelho não acompanhar; as
  moitas da torre e as do celular ficam sempre lisas). No nível alto a oclusão em tela (N8AO) fica só no
  interior: do lado de fora ela pintava as folhas de preto.
- Finais 02 e 04 com camas, cadeiras, cubas, bacias, lavadora, cuba e cooktop em modelo 3D (sofá, mesas e
  geladeira retrô seguem procedurais porque copiam o render oficial).
- Céu com cúmulos que têm relevo (topo claro, base em sombra) e andam devagar (`Ceu.tsx`); de dia as janelas
  "acesas" da torre viram vidro (antes o laranja da luz interna parecia madeira); moitas da torre mais
  redondas. No nível baixo o céu volta às nuvens simples.
- Paisagem: grama mais escura e saturada com manchas de 30 a 90 m (mais viva ou mais seca) que não somem
  de longe, sombra difusa sob cada copa pintada no chão, árvores de calçada a cada ~13 m (modelo detalhado
  só até 90 m no computador e 120 m no nível alto, para não pesar), arbustos nos jardins da frente das casas
  até 320 m do prédio e névoa do dia começando a 400 m (antes 200 m, desbotava a cidade).
- Entorno com o que é público do bairro: o Liwo fica no Parque Sul Karaíba, microbairro da Zona Sul com
  parque linear de árvores adultas, ciclovias e jardins entre as vias (Udicult, 04/06/2025; página do Liwo
  em construtoramaxi.com.br). No 3D o parque linear fica em frente ao Liwo, com caminho e ciclovia (a posição
  exata não é pública); perto do prédio as casas são sobrados de alto padrão em lotes de 20 m, muitas com
  piscina, e parte das quadras é condomínio fechado com muro. Coordenadas do mapa oficial: -18.950311,
  -48.256407. O norte do terreno continua sem confirmação (sem acesso ao mapa daqui).
- Desempenho: HDRI noturno removido (−1,5 MB na primeira visita), árvores detalhadas só perto da câmera.

## Próximas etapas, em ordem
1. **Espaços internos do lazer** (gourmet, salão, academia, coworking, sauna, lounge, brinquedoteca): no 3D
   são só marcadores com a imagem oficial. Modelar o interior só com projeto da Maxi — hoje seria invenção.
2. **Fachada** — volumetria sem mudanças desde a fase 2 (`torre.ts`, `sitio.ts`); falta o projeto de
   fachada para detalhar caixilhos, brises e materiais.
3. **Entorno real** — o acesso ao OpenStreetMap é bloqueado nesta máquina. Com o arquivo `.osm` exportado em
   openstreetmap.org (botão Exportar, área em volta da Rua João Severiano Rodrigues da Cunha, 1855), dá para
   trocar a cidade procedural por ruas e prédios reais.
4. **Medição em aparelho real** — nunca foi feita; os números vêm de GPU por software.

## Como medir
- `node scripts/_peso.mjs <url>`: bytes da primeira visita e tempo para entrar no apartamento.
- `node scripts/_perfil.mjs <url>`: uso de CPU no carregamento, triângulos por quadro e por grupo (celular emulado).
- `node scripts/_comparar.mjs <url> <prefixo>`: capturas da 1301 sempre nos mesmos nove ângulos.
- `node scripts/_lazer.mjs <url> <prefixo> [celular]`: piscina, quadra e playground de dia e de noite.
- `node scripts/_maquete.mjs <url> <unidade> <nome>`: maquete (vista de cima) de qualquer unidade.
- Atenção: `scripts/medir.mjs` e os números de triângulos de `_comparar.mjs` somam dois quadros; o valor
  por quadro é a metade.

## Depende da Maxi
Projeto de interiores ou arquivo 3D do decorado; memorial de acabamentos; projeto da área de lazer
(profundidade da piscina, mobiliário, iluminação); projeto de paisagismo e fachada; norte do terreno;
entorno real.
