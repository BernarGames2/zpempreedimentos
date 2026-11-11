import { NextResponse } from "next/server";

interface Lead {
  nome: string;
  whatsapp: string;
  unidade?: string;
  interesse: "comprar" | "alugar";
}

function valido(b: unknown): b is Lead {
  if (typeof b !== "object" || b === null) return false;
  const l = b as Record<string, unknown>;
  return (
    typeof l.nome === "string" && l.nome.trim().length >= 2 && l.nome.length <= 120 &&
    typeof l.whatsapp === "string" && l.whatsapp.replace(/\D/g, "").length >= 10 && l.whatsapp.length <= 30 &&
    (l.unidade === undefined || (typeof l.unidade === "string" && l.unidade.length <= 12)) &&
    (l.interesse === "comprar" || l.interesse === "alugar")
  );
}

/**
 * Registro de leads. Ponto de integração DESLIGADO por padrão: só encaminha quando
 * LEAD_WEBHOOK_URL está definido (planilha, Zapier, Make, e-mail...). Sem a variável,
 * o lead segue apenas pelo WhatsApp e nada é guardado no servidor.
 */
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }
  if (!valido(corpo)) return NextResponse.json({ ok: false, erro: "Dados incompletos" }, { status: 400 });

  const destino = process.env.LEAD_WEBHOOK_URL;
  if (!destino) return NextResponse.json({ ok: true, registrado: false });
  try {
    const r = await fetch(destino, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: corpo.nome.trim(), whatsapp: corpo.whatsapp, unidade: corpo.unidade ?? "", interesse: corpo.interesse, data: new Date().toISOString() }),
    });
    return NextResponse.json({ ok: r.ok, registrado: r.ok }, { status: r.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, registrado: false }, { status: 502 });
  }
}
