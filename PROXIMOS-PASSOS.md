# Liwo — onde continuar

Estado em 12/11/2026 (branch `maxi-liwo`; a versão publicada antes desta etapa está guardada em
`maxi-liwo-estavel`, commit 7521e98 — para voltar: publicar esse commit no projeto `liwo-maxi` da Vercel).

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
- Vegetação do prédio e da cidade com sombreamento macio (copas e moitas sem facetas).
- Desempenho: HDRI noturno removido (−1,5 MB na primeira visita), árvores detalhadas só perto da câmera.

## Próximas etapas, em ordem
1. **Espaços internos do lazer** (gourmet, salão, academia, coworking, sauna, lounge, brinquedoteca): no 3D
   são só marcadores com a imagem oficial. Modelar o interior só com projeto da Maxi — hoje seria invenção.
2. **Fachada** — volumetria sem mudanças desde a fase 2 (`torre.ts`, `sitio.ts`); falta o projeto de
   fachada para detalhar caixilhos, brises e materiais.
3. **Finais 02 e 04** — seguem os renders oficiais com móveis procedurais; trocar por modelos como nos demais.
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
