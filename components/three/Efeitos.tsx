"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { type BloomEffect, ToneMappingMode } from "postprocessing";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Qualidade } from "@/lib/store";

/**
 * Bloom com os valores de dentro/fora trocados no próprio efeito. Mudar as props recriava o efeito (e o
 * passe inteiro do pós-processamento era recompilado ao entrar no apartamento).
 */
function BloomCena({ interior }: { interior: boolean }) {
  const ref = useRef<BloomEffect>(null);
  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    b.intensity = interior ? 0.22 : 0.75;
    b.luminanceMaterial.threshold = interior ? 0.985 : 0.92;
    b.luminanceMaterial.smoothing = interior ? 0.08 : 0.2;
  }, [interior]);
  return <Bloom ref={ref} mipmapBlur intensity={0.75} luminanceThreshold={0.92} luminanceSmoothing={0.2} radius={0.72} />;
}

/**
 * Pós-processamento: oclusão de ambiente (nível alto, só no interior), bloom leve nos LEDs,
 * antisserrilhado SMAA e vinheta sutil. No nível baixo, e dentro dos splats, fica desligado.
 */
export function Efeitos({ qualidade, interior }: { qualidade: Qualidade; interior: boolean }) {
  const bloom = <BloomCena interior={interior} />;
  // a oclusão passa os primeiros quadros ligada (ainda atrás da tela de carregamento) só para compilar os
  // shaders dela; ao entrar no apartamento ela já está pronta
  const [aquecido, setAquecido] = useState(false);
  const quadros = useRef(0);
  useFrame(() => {
    if (!aquecido && ++quadros.current > 3) setAquecido(true);
  });
  // Oclusão em tela só no interior (mais leve que antes: as paredes e pisos já têm o mapa de luz calculado).
  // Lá fora ela pintava de preto os cartões de folhas das copas; o nível alto mostra as folhas no lugar dela.
  // É o mesmo compositor dentro e fora: o passe só liga e desliga (trocar de compositor recompilava tudo).
  if (qualidade === "alto") {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO enabled={interior || !aquecido} aoRadius={0.5} intensity={1.3} distanceFalloff={1} halfRes quality="low" />
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
