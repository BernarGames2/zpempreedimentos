"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { Qualidade } from "@/lib/store";

/**
 * Pós-processamento: oclusão de ambiente (nível alto, só no interior), bloom leve nos LEDs,
 * antisserrilhado SMAA e vinheta sutil. No nível baixo, e dentro dos splats, fica desligado.
 */
export function Efeitos({ qualidade, interior }: { qualidade: Qualidade; interior: boolean }) {
  const bloom = <Bloom mipmapBlur intensity={interior ? 0.22 : 0.75} luminanceThreshold={interior ? 0.985 : 0.92} luminanceSmoothing={interior ? 0.08 : 0.2} radius={0.72} />;
  // Oclusão em tela só no interior (mais leve que antes: as paredes e pisos já têm o mapa de luz calculado).
  // Lá fora ela pintava de preto os cartões de folhas das copas; o nível alto mostra as folhas no lugar dela.
  if (qualidade === "alto" && interior) {
    return (
      <EffectComposer key="alto-interior" multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={0.5} intensity={1.3} distanceFalloff={1} halfRes quality="low" />
        {bloom}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    );
  }
  if (qualidade === "alto") {
    return (
      <EffectComposer key="alto" multisampling={0} enableNormalPass={false}>
        {bloom}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    );
  }
  if (qualidade === "medio") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {bloom}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    );
  }
  // baixo: sem pós-processamento (o renderer faz o tone mapping direto)
  return null;
}
