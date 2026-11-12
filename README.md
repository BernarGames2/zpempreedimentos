# Liwo · Maxi Construtora: site 3D (protótipo de proposta)

Protótipo de site 3D para o **Liwo**, da Maxi Construtora e Incorporadora (Parque Sul Karaíba, Uberlândia).
O visitante escolhe a unidade na fachada, vê a planta oficial e entra no apartamento em 3D.

> **Não é o site oficial.** É uma proposta comercial feita por Bernardo Oliveira. O site não é indexado
> por buscadores (`robots: noindex`) e mostra o aviso de protótipo na tela.

Feito a partir da base do site da ZP Empreendimentos (branch `main` deste repositório, que continua intacta).
O Liwo vive na branch **`maxi-liwo`**.

## O que vem de fonte oficial e o que é demonstração

| Item | Origem |
|---|---|
| Imagens (fachadas, aérea, interiores, lazer, Working), plantas, metragens, tipologias, 24 pavimentos, lazer de 921,38 m², ficha técnica, estágio da obra, endereço, WhatsApp | Site da Maxi, [construtoramaxi.com.br/projetos/liwo](https://construtoramaxi.com.br/projetos/liwo/), consultado em 11/11/2026 |
| Planta 3D do apartamento de 102 m² (finais 02 e 04) | Medida sobre a planta oficial (escala pelas cotas) |
| Plantas 3D de 91, 77 e 76 m² (finais 01, 03, 05 e 06) | Paredes detectadas na imagem da planta oficial (82,4 px/m, conferido pelas cotas do Dorm. 1); mobília pelo desenho da planta |
| **Entorno (ruas, quadras, casas, prédios, árvores, skyline)** | **Ilustrativo**: reproduz o padrão do bairro, não o entorno real |
| Posição dos espaços de lazer no 5º pavimento | Medida sobre a planta oficial do pavimento de lazer |
| Forma da torre (frente com varandas em onda, laterais em terracota, terço central recuado, embasamento com floreiras) | Plantas e renders oficiais |
| **Disponibilidade, numeração das unidades, orientação solar** | **Demonstração** (selo "Dados de demonstração" na tela) |
| Preços | Não informados (o site mostra "Consulte") |

Os dados ficam em `data/empreendimento.json`, gerado por `npm run dados` (`scripts/gerar-dados.mjs`).
Cada número tem a fonte comentada no script.

## O que tem interior 3D

- **102 m², 3 suítes (finais 02 e 04)**: planta oficial *e* três renders oficiais (living, cozinha e suíte
  master); a foto oficial abre pelo botão "Foto do decorado", sobre o 3D, com o controle 3D ↔ Foto.
- **91 m², 3 quartos sendo 1 suíte (finais 01 e 05)**: planta oficial medida; sem render oficial, os
  materiais são os neutros da paleta do Liwo.
- **77 e 76 m², 2 suítes (finais 03 e 06)**: plantas oficiais medidas do mesmo jeito; mobília pelo desenho.
- **Garden e coberturas**: ainda só a planta oficial e a vista do andar (falta medir; o projeto não inventa ambientes).

Acabamento do interior (fase 2): luz do dia por padrão dentro do apartamento, sombras de contato
assadas no piso (paredes e móveis), oclusão nas paredes, reflexos de um ambiente neutro, texturas com
relevo em tecidos e paredes, guarnições e folhas de porta, esquadrias, peitoris, corrimão e marcenaria
com juntas e puxadores. A porta de entrada é uma folha fechada (o hall do andar não é modelado).
Tudo continua gerado por código: não há modelos 3D de mobiliário de terceiros.

Iluminação indireta pré-calculada: `npx tsx scripts/assar-luz.ts` gera, para cada planta, um volume de
sondas (`public/luz/*.json`, ~40 KB) com a luz do céu que entra pelas janelas e a luz das luminárias,
já com três rebatimentos nas paredes. O site lê o volume como textura 3D e modula a luz ambiente de
paredes, pisos, móveis e modelos. Rode de novo sempre que mudar plantas ou mobília.
Os móveis com modelo 3D de terceiros estão em `public/modelos/` (licenças em `CREDITOS.md`).

Ao entrar, o visitante já está andando dentro do apartamento (o 3D é o padrão, não a foto):
joystick e arrastar para olhar no celular; W A S D ou setas, mouse e rodinha (zoom) no computador;
tocar ou clicar no chão leva até o ponto; abas e minimapa trocam de cômodo; paredes e móveis têm colisão.

Cômodos sem render oficial (banhos, lavabo, suítes 1 e 2, varanda) seguem só a planta ilustrada, com peças neutras.

## Rodar

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build && npm start
npm test             # Playwright (celular 390×844 e desktop 1440×900), GPU por software
```

Links diretos: `/?unidade=1802` (unidade) e `/?unidade=1802&comodo=quarto` (passeio no cômodo).

## Pedir à Maxi para chegar à versão final

1. Tabela de vendas: numeração real dos finais, disponibilidade e (se quiserem mostrar) preços.
2. Renders de interiores das outras tipologias, para ganharem passeio 3D.
3. Modelo 3D do arquiteto (Crosara Arquitetura), se puderem ceder: `public/models/predio.glb`
   com malhas `unidade_<número>` substitui a torre feita por código sem mudar nada no site.
4. Orientação do terreno (norte), para o estudo de sol ficar exato.
5. Panorâmicas 360° ou acesso ao decorado, para o passeio fotorrealista (Gaussian Splatting, já suportado em `public/splats/`).

## Tecnologia

Next.js 16, React 19, TypeScript, Three.js com React Three Fiber e Drei, pós-processamento
(`@react-three/postprocessing`), Spark para splats, Zustand, Tailwind, Playwright. Tudo gratuito e de código aberto.
Prédio, interiores e texturas são gerados por código (sem arquivos 3D pesados para baixar).
