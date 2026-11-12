# Créditos dos modelos 3D de mobiliário

Arquivos em `public/modelos/` (GLB com compressão meshopt e texturas WebP), usados no passeio dos
apartamentos de planta final 01. Todos permitem uso comercial.

| Arquivo | Modelo original | Autor | Licença | Adaptações |
|---|---|---|---|---|
| `sofa.glb` | [GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa) | © 2021 Wayfair, LLC | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | variante cinza, tom mais fechado, texturas reduzidas a 1024 px |
| `luminaria.glb` | [IridescenceLamp](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/IridescenceLamp) | © 2022 Wayfair, LLC | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | sem transmissão/iridescência, malha simplificada, texturas a 512 px |
| `mesa-centro.glb` | [coffee_table_round_01](https://polyhaven.com/a/coffee_table_round_01) | Poly Haven | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | texturas a 512 px |
| `mesa-lateral.glb` | [side_table_01](https://polyhaven.com/a/side_table_01) | Poly Haven | CC0 | texturas a 512 px |
| `aparador.glb` | [modern_wooden_cabinet](https://polyhaven.com/a/modern_wooden_cabinet) | Poly Haven | CC0 | malha simplificada, texturas a 1024 px |
| `planta-grande.glb` | [potted_plant_02](https://polyhaven.com/a/potted_plant_02) | Poly Haven | CC0 | malha simplificada, texturas a 1024 px |
| `planta-pequena.glb` | [potted_plant_04](https://polyhaven.com/a/potted_plant_04) | Poly Haven | CC0 | malha simplificada, texturas a 512 px |
| `vaso-a.glb` | [ceramic_vase_02](https://polyhaven.com/a/ceramic_vase_02) | Poly Haven | CC0 | malha simplificada, texturas a 256 px |
| `vaso-b.glb` | [ceramic_vase_04](https://polyhaven.com/a/ceramic_vase_04) | Poly Haven | CC0 | malha simplificada, texturas a 256 px |

A CC BY 4.0 exige crédito ao autor e indicação de que houve alterações: o crédito está no rodapé do site.
O roteiro de preparação está em `scripts/otimizar-modelos.mjs` (usa `@gltf-transform`, `meshoptimizer` e
`sharp`, instalados à parte; não são dependências do site).

Camas, cadeiras de jantar, mesas de jantar e armários continuam gerados por código: não encontrei
modelos de licença livre, com qualidade e estilo compatíveis com os renders oficiais, para essas peças.
