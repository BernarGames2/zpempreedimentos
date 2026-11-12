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
| Posição dos espaços de lazer no 5º pavimento | Medida sobre a planta oficial do pavimento de lazer |
| Forma da torre (frente com varandas em onda, laterais em terracota, terço central recuado, embasamento com floreiras) | Plantas e renders oficiais |
| **Disponibilidade, numeração das unidades, orientação solar** | **Demonstração** (selo "Dados de demonstração" na tela) |
| Preços | Não informados (o site mostra "Consulte") |

Os dados ficam em `data/empreendimento.json`, gerado por `npm run dados` (`scripts/gerar-dados.mjs`).
Cada número tem a fonte comentada no script.

## O que tem interior 3D

Só o apartamento de **102 m² com 3 suítes (finais 02 e 04)**. Ele tem planta oficial *e* três renders
oficiais de interiores (living, cozinha e suíte master), então o 3D segue os dois. As outras tipologias
(91, 77, 76, 97 m² e coberturas) mostram a planta oficial no painel da unidade, sem 3D: não há render
de interiores delas, e o projeto não inventa ambientes.

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
