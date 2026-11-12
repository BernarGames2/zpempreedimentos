import { Hero } from "@/components/Hero";
import { Metricas } from "@/components/Metricas";
import { Secoes } from "@/components/secoes/Secoes";
import { Header } from "@/components/ui/Header";
import { emp } from "@/lib/dados";
import { FONTE_TITULO } from "@/lib/fontes";
import { lerManifesto } from "@/lib/manifesto.server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Dados estruturados (schema.org) do empreendimento. */
function dadosEstruturados() {
  const precos = emp.unidades.map((u) => u.preco).filter((p): p is number => p !== null);
  return {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    name: emp.nome,
    description: emp.textos.conceitoTexto,
    url: SITE,
    image: `${SITE}/referencias/fachada-diagonal.jpg`,
    numberOfAccommodationUnits: emp.unidades.length,
    address: { "@type": "PostalAddress", addressLocality: emp.localizacao.cidade, addressRegion: emp.localizacao.uf, addressCountry: "BR", streetAddress: emp.endereco },
    amenityFeature: [...emp.terreo, ...emp.cobertura].map((l) => ({ "@type": "LocationFeatureSpecification", name: l.nome, value: true })),
    brand: { "@type": "Organization", name: emp.incorporadora },
    // Preços só entram nos dados estruturados quando deixarem de ser de demonstração.
    ...(emp.demonstracao.ativo || precos.length === 0
      ? {}
      : { offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: Math.min(...precos), highPrice: Math.max(...precos), offerCount: precos.length } }),
  };
}

export default function Pagina() {
  const manifesto = lerManifesto();
  const logo = manifesto.marca.find((f) => /logo/i.test(f)) ?? manifesto.marca[0];
  return (
    <>
      <a href="#conceito" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-ambar focus:px-3 focus:py-2 focus:text-[#1a1408]">Pular a experiência 3D</a>
      <Header logo={logo} />
      <main>
        <Hero fonte={FONTE_TITULO} manifesto={manifesto} />
        <Secoes />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados()).replace(/</g, "\\u003c") }} />
      <Metricas />
    </>
  );
}
