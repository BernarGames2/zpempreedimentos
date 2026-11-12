/**
 * Métricas para a incorporadora. Ficam desligadas até existir NEXT_PUBLIC_GA_ID e/ou
 * NEXT_PUBLIC_META_PIXEL_ID no ambiente (ver components/Metricas.tsx).
 */
export type Evento =
  | "unidade_vista"
  | "entrou_no_apartamento"
  | "abriu_foto_decorado"
  | "tempo_no_passeio"
  | "clicou_whatsapp"
  | "compartilhou"
  | "lazer_visto"
  | "lead_enviado";

type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __zpEventos?: { evento: Evento; params: Params }[];
  }
}

export function registrar(evento: Evento, params: Params = {}): void {
  if (typeof window === "undefined") return;
  // Fila local: útil para depurar e para os testes automatizados.
  (window.__zpEventos ??= []).push({ evento, params });
  window.gtag?.("event", evento, params);
  window.fbq?.("trackCustom", evento, params);
}
