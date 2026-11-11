import Image from "next/image";
import { SeloDemo } from "@/components/ui/Interface";
import { emp, lazeres } from "@/lib/dados";
import { linkWhatsApp, mensagemUnidade } from "@/lib/formato";
import { Formulario } from "./Formulario";

const t = emp.textos;
const FOTOS = [
  { src: "/referencias/03-sala-varanda.png", alt: "Sala integrada à varanda, com painel de madeira e jardim vertical", larg: 1080, alt2: 608, largo: true },
  { src: "/referencias/07-cozinha.png", alt: "Cozinha com marcenaria preta, bar em madeira e pendentes", larg: 1080, alt2: 608, largo: true },
  { src: "/referencias/05-quarto.png", alt: "Quarto com painel de madeira, frisos de LED e armário de vidro fumê", larg: 1080, alt2: 1350 },
  { src: "/referencias/06-varanda.png", alt: "Varanda com jardim vertical e poltrona de couro", larg: 1080, alt2: 1350 },
  { src: "/referencias/04-banheiro.png", alt: "Banheiro com nicho de madeira, espelho redondo e granito preto", larg: 1080, alt2: 1350 },
  { src: "/referencias/02-portaria-entrada.png", alt: "Portaria com hall de vidro e painel iluminado", larg: 1080, alt2: 1350 },
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

/** Conteúdo abaixo da experiência 3D. Renderizado no servidor (SEO). */
export function Secoes() {
  const itens = lazeres();
  return (
    <>
      <section id="conceito" className="veio-madeira border-y border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="rotulo !text-ambar-claro">{emp.nome}</p>
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
        </div>
      </section>

      <section id="decorado" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Cabecalho rotulo="Decorado" titulo={t.decoradoTitulo} texto={t.decoradoTexto} />
        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-6">
          {FOTOS.map((f) => (
            <li key={f.src} className={`group overflow-hidden rounded-2xl bg-fundo-2 ${f.largo ? "col-span-2 md:col-span-3" : "md:col-span-2"} ${f.largo ? "" : "last:max-md:col-span-1"}`}>
              <Image src={f.src} alt={f.alt} width={f.larg} height={f.alt2} sizes={f.largo ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 33vw, 50vw"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-cinza">Imagens oficiais do projeto. No 3D, use o botão “Foto do decorado” para comparar cada cômodo com a foto.</p>
      </section>

      <section id="lazer" className="bg-fundo-2">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Cabecalho rotulo="Lazer" titulo={t.lazerTitulo} texto={t.lazerTexto} />
            <SeloDemo />
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((l) => (
              <li key={l.id} className="rounded-2xl border border-white/10 bg-fundo p-5">
                <p className="rotulo">{l.etiqueta}</p>
                <h3 className="mt-1 font-titulo text-2xl">{l.nome}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cinza">{l.descricao}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {l.destaques.map((d) => <li key={d} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs">{d}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="localizacao" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Cabecalho rotulo="Localização" titulo={t.localizacaoTitulo} texto={t.localizacaoTexto} />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-fundo-2">
            {emp.localizacao.mapaEmbedUrl ? (
              <iframe src={emp.localizacao.mapaEmbedUrl} title={`Mapa: ${emp.endereco}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ backgroundImage: "linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)", backgroundSize: "44px 44px" }}>
                <span className="pulso relative block h-4 w-4 rounded-full bg-ambar" />
                <p className="font-titulo text-xl">{emp.localizacao.bairro}</p>
                <p className="text-sm text-cinza">{emp.localizacao.cidade} – {emp.localizacao.uf}</p>
                <p className="max-w-xs text-xs text-cinza">O mapa entra aqui quando o endereço exato for confirmado.</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-cinza">{emp.endereco}</p>
            <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
              {emp.localizacao.pontos.map((p) => (
                <li key={p.nome} className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
                  <span>{p.nome}</span>
                  <span className={p.confirmado ? "font-medium text-ambar-claro" : "text-cinza"}>{p.tempo}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="incorporadora" className="veio-madeira border-y border-white/5">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
          <div aria-hidden className="font-titulo text-8xl font-extralight tracking-[0.12em] text-texto/90">ZP</div>
          <div>
            <Cabecalho rotulo="A incorporadora" titulo={t.incorporadoraTitulo} texto={t.incorporadoraTexto} />
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
        </div>
      </footer>
    </>
  );
}
