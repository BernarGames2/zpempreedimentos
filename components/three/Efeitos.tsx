"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { Qualidade } from "@/lib/store";

/**
 * Pós-processamento: oclusão de ambiente (só no nível alto), bloom leve nos LEDs,
 * antisserrilhado SMAA e vinheta sutil. No nível baixo, e dentro dos splats, fica desligado.
 */
export function Efeitos({ qualidade, interior }: { qualidade: Qualidade; interior: boolean }) {
  if (qualidade === "baixo") return null;
  const bloom = <Bloom mipmapBlur intensity={interior ? 0.55 : 0.75} luminanceThreshold={0.92} luminanceSmoothing={0.2} radius={0.72} />;
  if (qualidade === "alto") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={interior ? 0.5 : 1.6} intensity={interior ? 2.2 : 1.6} distanceFalloff={1} halfRes quality="medium" />
        {bloom}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {bloom}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
      <Vignette eskil={false} offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}
