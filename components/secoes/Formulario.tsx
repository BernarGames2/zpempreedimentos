"use client";

import { useEffect, useState } from "react";
import { emp, unidade } from "@/lib/dados";
import { linkWhatsApp } from "@/lib/formato";
import { registrar } from "@/lib/metricas";
import { useExp } from "@/lib/store";
import { IcoWhats } from "../ui/Icones";

/** Formulário: abre o WhatsApp com a mensagem pronta e registra o lead (integração opcional). */
export function Formulario() {
  const sel = useExp((s) => s.unidadeSel);
  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [un, setUn] = useState("");
  const [interesse, setInteresse] = useState<"comprar" | "alugar">(emp.modo === "locacao" ? "alugar" : "comprar");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  // Unidade já preenchida se a pessoa veio do 3D.
  useEffect(() => {
    if (sel) setUn(sel);
  }, [sel]);

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (nome.trim().length < 2) return setErro("Informe seu nome.");
    if (fone.replace(/\D/g, "").length < 10) return setErro("Informe um WhatsApp com DDD.");
    if (un && !unidade(un)) return setErro(`A unidade ${un} não existe. Deixe em branco se ainda não escolheu.`);
    setErro("");
    const msg = `Olá! Meu nome é ${nome.trim()} e quero ${interesse} no ${emp.nome}${un ? ` (unidade ${un})` : ""}. Meu WhatsApp: ${fone}.`;
    registrar("lead_enviado", { unidade: un, interesse });
    registrar("clicou_whatsapp", { origem: "formulario", unidade: un });
    // registro do lead: só é encaminhado se LEAD_WEBHOOK_URL estiver configurado
    void fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome, whatsapp: fone, unidade: un || undefined, interesse }), keepalive: true }).catch(() => undefined);
    window.open(linkWhatsApp(emp, msg), "_blank", "noopener,noreferrer");
    setEnviado(true);
  };

  const campo = "h-12 w-full rounded-xl border border-white/15 bg-fundo px-4 text-texto placeholder:text-cinza/60";
  return (
    <form onSubmit={enviar} noValidate className="grid gap-4" data-testid="formulario">
      <div>
        <label htmlFor="f-nome" className="rotulo mb-1.5 block">Nome</label>
        <input id="f-nome" name="nome" autoComplete="name" required value={nome} onChange={(e) => setNome(e.target.value)} className={campo} placeholder="Seu nome" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-fone" className="rotulo mb-1.5 block">WhatsApp</label>
          <input id="f-fone" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required value={fone} onChange={(e) => setFone(e.target.value)} className={campo} placeholder="(34) 90000-0000" />
        </div>
        <div>
          <label htmlFor="f-unidade" className="rotulo mb-1.5 block">Unidade de interesse</label>
          <input id="f-unidade" name="unidade" inputMode="numeric" value={un} onChange={(e) => setUn(e.target.value.replace(/\D/g, "").slice(0, 5))} className={campo} placeholder="Ex.: 1201 (opcional)" />
        </div>
      </div>
      <fieldset>
        <legend className="rotulo mb-1.5">Interesse</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["comprar", "alugar"] as const).map((k) => (
            <label key={k} className={`btn btn-linha cursor-pointer ${interesse === k ? "btn-ativo" : ""}`}>
              <input type="radio" name="interesse" value={k} checked={interesse === k} onChange={() => setInteresse(k)} className="sr-only" />
              Quero {k}
            </label>
          ))}
        </div>
      </fieldset>
      {erro && <p role="alert" className="text-sm text-[#ff9a8a]">{erro}</p>}
      <button type="submit" className="btn btn-ambar !min-h-12 text-base"><IcoWhats /> Continuar no WhatsApp</button>
      <p className="text-xs text-cinza" aria-live="polite">
        {enviado ? "Abrimos o WhatsApp em outra aba. Se não abriu, toque no botão de novo." : `Ao enviar, você fala direto com a equipe da ${emp.incorporadora} pelo WhatsApp ${emp.whatsapp}.`}
      </p>
    </form>
  );
}
