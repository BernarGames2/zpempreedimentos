import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { emp } from "@/lib/dados";
import { inter, outfit } from "@/lib/fontes";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const descricao = `${emp.textos.h1 ?? emp.nome}. Explore o ${emp.nome} em 3D: escolha a unidade na fachada, entre no apartamento, veja o sol em cada horário e fale com a ${emp.incorporadora}.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${emp.nome} | ${emp.textos.h1 ?? emp.incorporadora}`, template: `%s | ${emp.nome}` },
  description: descricao,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: emp.nome,
    title: `${emp.nome} — ${emp.textos.h1 ?? ""}`,
    description: descricao,
    images: [{ url: "/referencias/01-fachada-esquina.png", width: 1280, height: 1600, alt: `Fachada do ${emp.nome} vista da esquina` }],
  },
  twitter: { card: "summary_large_image", title: emp.nome, description: descricao, images: ["/referencias/01-fachada-esquina.png"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#141824", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-fundo text-texto">{children}</body>
    </html>
  );
}
