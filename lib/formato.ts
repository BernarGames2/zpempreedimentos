import type { Empreendimento, Status, Unidade } from "./types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function reais(v: number | null): string {
  return v === null ? "Consulte" : brl.format(v);
}

export function area(v: number): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m²`;
}

export const ROTULO_STATUS: Record<Status, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  alugada: "Alugada",
};

/** Cores do status: verde-esmeralda, âmbar e cinza fosco. */
export const COR_STATUS: Record<Status, string> = {
  disponivel: "#2fbf8f",
  reservada: "#e9a23b",
  vendida: "#8b93a1",
  alugada: "#8b93a1",
};

export function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/** Link do WhatsApp com DDI 55 e a mensagem pronta. */
export function linkWhatsApp(e: Empreendimento, mensagem: string): string {
  const d = soDigitos(e.whatsapp);
  const numero = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemUnidade(e: Empreendimento, u: Unidade | undefined): string {
  return u
    ? `Olá! Tenho interesse na unidade ${u.numero} do ${e.nome}. Pode me passar mais informações?`
    : `Olá! Tenho interesse no ${e.nome}. Pode me passar mais informações?`;
}

export function mensagemVisita(e: Empreendimento, u: Unidade | undefined): string {
  return u
    ? `Olá! Gostaria de agendar uma visita para conhecer a unidade ${u.numero} do ${e.nome}.`
    : `Olá! Gostaria de agendar uma visita ao ${e.nome}.`;
}

/** Faixa de valores que o painel e os filtros usam, conforme o modo do empreendimento. */
export function valorDe(u: Unidade, tipo: "venda" | "locacao"): number | null {
  return tipo === "venda" ? u.preco : u.aluguel;
}
