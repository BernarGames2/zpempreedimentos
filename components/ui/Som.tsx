"use client";

import { useEffect, useRef } from "react";
import { useExp } from "@/lib/store";
import { IcoMudo, IcoSom } from "./Icones";

/**
 * Áudio ambiente discreto, gerado no navegador (sem arquivos): um "ar" suave dentro do
 * apartamento e o rumor da cidade na varanda. Desligado por padrão.
 */
export function BotaoSom() {
  const som = useExp((s) => s.som);
  const comodo = useExp((s) => s.comodoAtual);
  const audio = useRef<{ ctx: AudioContext; ganho: GainNode; filtro: BiquadFilterNode } | null>(null);

  useEffect(() => {
    if (!som) {
      audio.current?.ganho.gain.setTargetAtTime(0, audio.current.ctx.currentTime, 0.3);
      return;
    }
    if (!audio.current) {
      const ctx = new AudioContext();
      const n = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let ultimo = 0;
      for (let i = 0; i < n; i++) {
        ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02; // ruído marrom
        d[i] = ultimo * 3.2;
      }
      const fonte = ctx.createBufferSource();
      fonte.buffer = buf;
      fonte.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = "lowpass";
      const ganho = ctx.createGain();
      ganho.gain.value = 0;
      fonte.connect(filtro).connect(ganho).connect(ctx.destination);
      fonte.start();
      audio.current = { ctx, ganho, filtro };
    }
    const a = audio.current;
    void a.ctx.resume();
    const fora = comodo === "varanda";
    a.filtro.frequency.setTargetAtTime(fora ? 900 : 260, a.ctx.currentTime, 0.5);
    a.ganho.gain.setTargetAtTime(fora ? 0.09 : 0.04, a.ctx.currentTime, 0.5);
  }, [som, comodo]);

  useEffect(
    () => () => {
      void audio.current?.ctx.close();
      audio.current = null;
    },
    [],
  );

  return (
    <button type="button" onClick={() => useExp.getState().set({ som: !som })} aria-pressed={som} aria-label={som ? "Desligar som ambiente" : "Ligar som ambiente"} className={`btn btn-linha justify-start ${som ? "btn-ativo" : ""}`} data-testid="botao-som">
      {som ? <IcoSom /> : <IcoMudo />} <span className="max-sm:sr-only">Som</span>
    </button>
  );
}
