# Liwo — onde continuar

Estado em 12/11/2026 (branch `maxi-liwo`; versão anterior estável em `maxi-liwo-estavel`).

## Feito até aqui
- Interiores 3D navegáveis nos finais 01 a 06, com modelos 3D de terceiros (licenças em `CREDITOS.md`),
  iluminação indireta pré-calculada (`scripts/assar-luz.ts`), madeiras fotográficas e banhos revestidos.
- Desempenho: HDRI noturno removido (−1,5 MB na primeira visita), árvores detalhadas só perto da câmera
  (150 m no computador, 60 m no celular, nenhuma vista de dentro do apartamento).

## Próximas etapas, em ordem
1. **Área de lazer (ainda não trabalhada)** — `components/three/Lazer.tsx` só tem água, quadra e playground
   como volumes simples, mais os cartões com as imagens oficiais. Fazer: água da piscina com reflexo e
   transparência, deque com a textura de madeira já existente (`public/texturas/okoume-*`), espreguiçadeiras
   e mobiliário externo (buscar com `/home/claude/modelos/buscar.py`, mesmo fluxo dos interiores),
   paisagismo e iluminação noturna. Posições: planta oficial `public/referencias/plantas/pavimento-lazer.jpg`
   (conversão de pixels para metros em `scripts/gerar-dados.mjs`). Academia, gourmet e salão só têm uma
   imagem oficial cada: interior deles é estimativa e deve ser marcado como tal.
2. **Interiores** — marcenaria da cozinha e armários ainda são caixas lisas; cuba e cooktop com modelo só na
   planta 01 (levar para 03 e 06 com `m.troca`, como em `mobiliaFinal01`); box e chuveiro; tomadas e
   interruptores; finais 02 e 04 seguem os renders oficiais e não receberam modelos.
3. **Fachada e entorno** — sem mudanças desde a fase 2 (`lib/procedural/torre.ts`, `sitio.ts`, `Entorno.tsx`).
4. **Medição em aparelho real** — nunca foi feita; os números vêm de GPU por software.

## Como medir
- `node scripts/_peso.mjs <url>`: bytes da primeira visita e tempo para entrar no apartamento.
- `node scripts/_perfil.mjs <url>`: uso de CPU no carregamento, triângulos por quadro e por grupo (celular emulado).
- `node scripts/_comparar.mjs <url> <prefixo>`: capturas da 1301 sempre nos mesmos nove ângulos.
- Atenção: `scripts/medir.mjs` e os números de triângulos de `_comparar.mjs` somam dois quadros; o valor
  por quadro é a metade.

## Depende da Maxi
Projeto de interiores ou arquivo 3D do decorado; memorial de acabamentos; referências e projeto da área de
lazer; projeto de paisagismo e fachada; norte do terreno; entorno real.
