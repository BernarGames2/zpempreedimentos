import { Inter, Outfit } from "next/font/google";

export const outfit = Outfit({ subsets: ["latin"], weight: ["200", "300", "400", "500"], variable: "--font-outfit", display: "swap" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/** Nome real da família gerada pelo next/font, para desenhar o letreiro em canvas. */
export const FONTE_TITULO = outfit.style.fontFamily;
