import Image from "next/image";
import { SeloDemo } from "@/components/ui/Interface";
import { emp, lazeres } from "@/lib/dados";
import { area, linkWhatsApp, mensagemUnidade } from "@/lib/formato";
import { Formulario } from "./Formulario";

const t = emp.textos;

const INTERIORES = [
  { src: "/referencias/sala-01.jpg", alt: "Living integrado à varanda, com cozinha de marcenaria clara, bancada de mármore e banquetas de palhinha", larg: 1080, alt2: 692 },
  { src: "/referencias/sala-02.jpg", alt: "Cozinha linear com mármore e marcenaria de madeira clara, balcão branco e sofá caramelo", larg: 1080, alt2: 692 },
  { src: "/referencias/suite.jpg", alt: "Suíte master com cabeceira de veludo caramelo e closet com portas de vidro", larg: 1080, alt2: 692 },
];

function Cabecalho({ rotulo, titulo, texto }: { rotulo: string; titulo?: string; texto?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="rotulo !text-ambar-claro">{rotulo}</p>
      <h2 className="mt-2 text-3xl sm:text-4xl">{titulo}</h2>
      {texto && <p className="mt-4 leading-relaxed text-cinza">{texto}</p>}
    </div>
  );
}

/** Plantas oficiais, uma por tipologia (os finais espelhados mostram a mesma planta). */
function plantas() {
  const vistas = new Set<string>();
  return emp.tipos
    .filter((x) => x.plantaImagem && !vistas.has(x.plantaImagem) && vistas.add(x.plantaImagem))
    .map((x) => {
      const us = emp.unidades.filter((u) => emp.tipos.find((k) => k.id === u.tipo)?.plantaImagem === x.plantaImagem);
      const areas = [...new Set(us.map((u) => u.areaPrivativa))].sort((a, b) => a - b);
      return { tipo: x, areas, src: x.plantaImagem as string };
    });
}

/** Conteúdo abaixo da experiência 3D. Renderizado no servidor (SEO). Tudo vem de `emp`, com fonte oficial. */
export function Secoes() {
  const itens = lazeres().filter((l) => l.imagem);
  const fonte = emp.fonte;
  return (
    <>
      <section id="conceito" className="veio-madeira border-y border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="rotulo !text-ambar-claro">{emp.nome} · {emp.incorporadora}</p>
          <h1 className="mt-2 max-w-3xl text-4xl leading-tight sm:text-6xl">{t.h1}</h1>
          <p className="mt-5 max-w-2xl text-lg text-cinza">{t.chamada}</p>
          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 className="text-2xl sm:text-3xl">{t.conceitoTitulo}</h2>
              <p className="mt-4 leading-relaxed text-cinza">{t.conceitoTexto}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[1, 2, 3].map((i) => (
                <li key={i} className="rounded-2xl border border-white/10 bg-fundo/60 p-5">
                  <h3 className="font-titulo text-xl text-ambar-claro">{t[`conceito${i}Titulo`]}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cinza">{t[`conceito${i}Texto`]}</p>
                </li>
              ))}
            </ul>
          </div>
          {emp.galeria && (
            <ul className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
              {emp.galeria.map((f, i) => (
                <li key={f.src} className={`overflow-hidden rounded-2xl bg-fundo-2 ${i === 0 ? "row-span-2" : ""} ${f.larg > f.alt2 ? "col-span-2" : ""}`}>
                  <Image src={f.src} alt={f.alt} width={f.larg} height={f.alt2} sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full object-cover" loading="lazy" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="interiores" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Cabecalho rotulo="Interiores" titulo={t.decoradoTitulo} texto={t.decoradoTexto} />
        <ul className="mt-10 grid gap-3 md:grid-cols-2">
          {INTERIORES.map((f, i) => (
            <li key={f.src} className={`group overflow-hidden rounded-2xl bg-fundo-2 ${i === 0 ? "md:col-span-2" : ""}`}>
              <Image src={f.src} alt={f.alt} width={f.larg} height={f.alt2} sizes={i === 0 ? "100vw" : "(min-width: 768px) 50vw, 100vw"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-cinza">Imagens oficiais de divulgação. No 3D, use o botão “Foto do decorado” para comparar o cômodo com a imagem.</p>
      </section>

      <section id="plantas" className="bg-fundo-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Cabecalho rotulo="Plantas" titulo="Plantas oficiais" texto="Do 6º ao 23º pavimento são seis apartamentos por andar; no 24º, três coberturas. Toque na unidade no 3D para ver a planta dela." />
          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {plantas().map(({ tipo, areas, src }) => (
              <li key={src} className="overflow-hidden rounded-2xl border border-white/10 bg-fundo">
                <a href={src} target="_blank" rel="noopener noreferrer" className="block bg-[#f4f1ea]">
                  <Image src={src} alt={`Planta oficial: ${tipo.descricao ?? tipo.nome}`} width={1080} height={1080} sizes="(min-width: 768px) 25vw, 50vw" className="aspect-square h-auto w-full object-contain" loading="lazy" />
                </a>
                <div className="p-3">
                  <p className="font-titulo text-lg">{areas.map((a) => area(a)).join(" · ")}</p>
                  <p className="text-xs text-cinza">{tipo.descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="lazer" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Cabecalho rotulo="Lazer" titulo={t.lazerTitulo} texto={t.lazerTexto} />
          <SeloDemo />
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((l) => (
            <li key={l.id} className="overflow-hidden rounded-2xl border border-white/10 bg-fundo-2">
              {l.imagem && <Image src={l.imagem} alt={`${l.nome} (imagem oficial)`} width={1080} height={692} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[3/2] h-auto w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <h3 className="font-titulo text-xl">{l.nome}</h3>
                <p className="mt-1 text-sm leading-relaxed text-cinza">{l.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {emp.comercial && (
        <section id="working" className="veio-madeira border-y border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <Cabecalho rotulo="Working" titulo={emp.comercial.titulo} texto={emp.comercial.texto} />
            <ul className="mt-6 space-y-1 text-sm">
              {emp.comercial.itens.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <ul className="mt-10 grid gap-3 md:grid-cols-3">
              {emp.comercial.fotos.map((f) => (
                <li key={f.src} className="overflow-hidden rounded-2xl bg-fundo-2">
                  <Image src={f.src} alt={f.alt} width={f.larg} height={f.alt2} sizes="(min-width: 768px) 33vw, 100vw" className="h-auto w-full object-cover" loading="lazy" />
                  {f.rotulo && <p className="px-4 py-3 text-sm text-cinza">{f.rotulo}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(emp.obra || emp.ficha) && (
        <section id="obra" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2">
            {emp.obra && (
              <div>
                <Cabecalho rotulo="Obra" titulo={`${emp.obra.geral}% concluída`} texto={`Conclusão prevista: ${emp.obra.conclusao}.`} />
                <ul className="mt-8 space-y-4" aria-label="Estágio da obra">
                  {emp.obra.etapas.map((e) => (
                    <li key={e.nome}>
                      <div className="flex justify-between text-sm"><span>{e.nome}</span><span className="tabular-nums text-cinza">{e.pct}%</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={e.nome} aria-valuenow={e.pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-ambar" style={{ width: `${e.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emp.ficha && (
              <div>
                <Cabecalho rotulo="Ficha técnica" titulo="O projeto" />
                <dl className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10">
                  {emp.ficha.map((f) => (
                    <div key={f.rotulo} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                      <dt className="text-cinza">{f.rotulo}</dt>
                      <dd className="text-right font-medium">{f.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="localizacao" className="bg-fundo-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Cabecalho rotulo="Localização" titulo={t.localizacaoTitulo} texto={t.localizacaoTexto} />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-fundo">
              {emp.localizacao.mapaEmbedUrl && (
                <iframe src={emp.localizacao.mapaEmbedUrl} title={`Mapa: ${emp.endereco}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
              )}
            </div>
            <div>
              <p className="font-titulo text-xl">{emp.localizacao.bairro}</p>
              <p className="mt-2 text-sm text-cinza">{emp.endereco}</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(emp.endereco)}`} target="_blank" rel="noopener noreferrer" className="btn btn-linha mt-6">Abrir no Google Maps</a>
            </div>
          </div>
        </div>
      </section>

      <section id="incorporadora" className="veio-madeira border-y border-white/5">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-16">
          <div aria-hidden className="font-titulo text-8xl font-extralight tracking-[0.12em] text-texto/90">MAXI</div>
          <div>
            <Cabecalho rotulo="A incorporadora" titulo={t.incorporadoraTitulo} texto={t.incorporadoraTexto} />
            {emp.historico && (
              <ol className="mt-6 flex flex-wrap gap-2 text-xs" aria-label="Empreendimentos entregues e em obra">
                {emp.historico.map((h) => (
                  <li key={h.ano} className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5"><span className="text-ambar-claro">{h.ano}</span> · {h.nomes}</li>
                ))}
              </ol>
            )}
            <a href={linkWhatsApp(emp, mensagemUnidade(emp, undefined))} target="_blank" rel="noopener noreferrer" className="btn btn-linha mt-6">Falar com a equipe</a>
          </div>
        </div>
      </section>

      <section id="contato" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-2">
          <Cabecalho rotulo="Contato" titulo={t.contatoTitulo} texto={t.contatoTexto} />
          <div className="rounded-3xl border border-white/10 bg-fundo-2 p-5 sm:p-8">
            <Formulario />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#10131d]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-cinza sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-titulo text-lg text-texto">{emp.nome} <span className="text-cinza">· {emp.incorporadora}</span></p>
            <a href={linkWhatsApp(emp, mensagemUnidade(emp, undefined))} target="_blank" rel="noopener noreferrer" className="hover:text-ambar-claro">WhatsApp {emp.whatsapp}</a>
          </div>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed">{t.avisoLegal}</p>
          {fonte && (
            <p className="mt-2 text-xs">
              Fonte: <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ambar-claro">{fonte.nome}</a> (consultado em {fonte.consultadoEm}).
              {emp.proposta && <> Protótipo criado por {emp.proposta.autor}.</>}
            </p>
          )}
          <p className="mt-2 text-xs">
            Modelos 3D de mobiliário: sofá e luminária © Wayfair, LLC (
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ambar-claro">CC BY 4.0</a>
            , adaptados; via Khronos glTF Sample Assets); demais peças de{" "}
            <a href="https://polyhaven.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-ambar-claro">Poly Haven</a> (CC0).
          </p>
        </div>
      </footer>
    </>
  );
}
