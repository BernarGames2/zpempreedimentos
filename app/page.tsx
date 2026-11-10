import { Hero } from "@/components/Hero";
import { Header } from "@/components/ui/Header";
import { emp } from "@/lib/dados";
import { FONTE_TITULO } from "@/lib/fontes";
import { lerManifesto } from "@/lib/manifesto.server";

export default function Pagina() {
  const manifesto = lerManifesto();
  const logo = manifesto.marca.find((f) => /logo/i.test(f)) ?? manifesto.marca[0];
  return (
    <>
      <Header logo={logo} />
      <main>
        <Hero fonte={FONTE_TITULO} manifesto={manifesto} />
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h1 className="text-4xl sm:text-5xl">{emp.textos.h1}</h1>
          <p className="mt-4 max-w-2xl text-cinza">{emp.textos.chamada}</p>
        </section>
      </main>
    </>
  );
}
