import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const IcoSeta = (p: P) => <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IcoVoltar = (p: P) => <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const IcoCima = (p: P) => <svg {...base(p)}><path d="M6 15l6-6 6 6" /></svg>;
export const IcoBaixo = (p: P) => <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>;
export const IcoEsq = (p: P) => <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const IcoDir = (p: P) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IcoFechar = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IcoFiltro = (p: P) => <svg {...base(p)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const IcoSol = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>;
export const IcoLua = (p: P) => <svg {...base(p)}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>;
export const IcoCompartilhar = (p: P) => <svg {...base(p)}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8" /></svg>;
export const IcoPorta = (p: P) => <svg {...base(p)}><path d="M5 21V4a1 1 0 011-1h9a1 1 0 011 1v17M3 21h18M12.5 12h.01" /></svg>;
export const IcoOlho = (p: P) => <svg {...base(p)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IcoPlanta = (p: P) => <svg {...base(p)}><path d="M3 4h18v16H3zM3 11h8M11 4v9M15 20v-6h6" /></svg>;
export const IcoPredio = (p: P) => <svg {...base(p)}><path d="M5 21V5l8-2v18M13 9l6 2v10M3 21h18M8 8h2M8 12h2M8 16h2" /></svg>;
export const IcoFoto = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>;
export const IcoRegua = (p: P) => <svg {...base(p)}><path d="M3 17L17 3l4 4L7 21zM7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2" /></svg>;
export const IcoSom = (p: P) => <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>;
export const IcoMudo = (p: P) => <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4zM17 9.5l4 5M21 9.5l-4 5" /></svg>;
export const IcoAjustes = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></svg>;
export const IcoLazer = (p: P) => <svg {...base(p)}><path d="M3 18c2 0 2-1.5 4-1.5S9 18 11 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 2-1.5M8 13V6a2 2 0 014 0M16 13V6a2 2 0 00-4 0" /></svg>;
export const IcoCamadas = (p: P) => <svg {...base(p)}><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" /></svg>;
export const IcoCheck = (p: P) => <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export const IcoWhats = (p: P) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.700 6.700 0 01-3.300-2.900c-.200-.400.200-.400.600-1.200.100-.200 0-.300 0-.500l-.800-1.800c-.200-.500-.400-.400-.600-.400h-.500a1 1 0 00-.700.300 2.900 2.900 0 00-.900 2.200c0 1.300.900 2.500 1 2.700.2.200 1.900 2.900 4.600 4 1.700.700 2.300.700 3.200.600.500-.100 1.500-.600 1.700-1.200.2-.600.200-1.100.2-1.200-.1-.100-.300-.200-.500-.300z" />
  </svg>
);
