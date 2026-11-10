import type { Empreendimento } from "./types";

/** Erro com o caminho exato do campo, para quem edita o JSON saber o que corrigir. */
export class ErroDeDados extends Error {
  constructor(caminho: string, esperado: string, recebido: unknown) {
    const visto = recebido === undefined ? "campo ausente" : JSON.stringify(recebido)?.slice(0, 80);
    super(`data/empreendimento.json → "${caminho}": esperado ${esperado}, recebido ${visto}.`);
    this.name = "ErroDeDados";
  }
}

type Obj = Record<string, unknown>;
const STATUS = ["disponivel", "reservada", "vendida", "alugada"];
const ABERTURAS = ["porta", "porta-correr", "vao", "janela", "guarda-corpo"];

function obj(v: unknown, c: string): Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new ErroDeDados(c, "um objeto", v);
  return v as Obj;
}
function str(o: Obj, k: string, c: string): string {
  const v = o[k];
  if (typeof v !== "string" || v.length === 0) throw new ErroDeDados(`${c}.${k}`, "um texto", v);
  return v;
}
function num(o: Obj, k: string, c: string): number {
  const v = o[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ErroDeDados(`${c}.${k}`, "um número", v);
  return v;
}
function numOuNulo(o: Obj, k: string, c: string): void {
  const v = o[k];
  if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) throw new ErroDeDados(`${c}.${k}`, "um número ou null", v);
}
function bool(o: Obj, k: string, c: string): void {
  if (typeof o[k] !== "boolean") throw new ErroDeDados(`${c}.${k}`, "true ou false", o[k]);
}
function umDe(o: Obj, k: string, opcoes: string[], c: string): void {
  if (typeof o[k] !== "string" || !opcoes.includes(o[k] as string)) throw new ErroDeDados(`${c}.${k}`, `um de ${opcoes.join(" | ")}`, o[k]);
}
function lista(o: Obj, k: string, c: string): unknown[] {
  const v = o[k];
  if (!Array.isArray(v)) throw new ErroDeDados(`${c}.${k}`, "uma lista", v);
  return v;
}
function vetor(v: unknown, n: number, c: string): void {
  if (!Array.isArray(v) || v.length !== n || v.some((x) => typeof x !== "number" || !Number.isFinite(x))) {
    throw new ErroDeDados(c, `uma lista de ${n} números`, v);
  }
}
function enquadramento(v: unknown, c: string): void {
  const e = obj(v, c);
  vetor(e.posicao, 3, `${c}.posicao`);
  vetor(e.olhar, 3, `${c}.olhar`);
}

function validarAbertura(v: unknown, c: string): void {
  const a = obj(v, c);
  str(a, "id", c);
  umDe(a, "tipo", ABERTURAS, c);
  vetor(a.p1, 2, `${c}.p1`);
  vetor(a.p2, 2, `${c}.p2`);
  num(a, "altura", c);
  num(a, "peitoril", c);
  if (a.liga !== undefined) {
    if (!Array.isArray(a.liga) || a.liga.length !== 2 || a.liga.some((x) => typeof x !== "string")) {
      throw new ErroDeDados(`${c}.liga`, "dois ids de cômodo", a.liga);
    }
  }
}

function validarLazer(v: unknown, c: string): void {
  const l = obj(v, c);
  for (const k of ["id", "nome", "etiqueta", "descricao"]) str(l, k, c);
  const d = lista(l, "destaques", c);
  if (d.length !== 3 || d.some((x) => typeof x !== "string")) throw new ErroDeDados(`${c}.destaques`, "três textos", d);
  lista(l, "itens", c).forEach((x, i) => {
    if (typeof x !== "string") throw new ErroDeDados(`${c}.itens[${i}]`, "um texto", x);
  });
  vetor(l.posicao, 3, `${c}.posicao`);
  vetor(l.tamanho, 3, `${c}.tamanho`);
  enquadramento(l.camera, `${c}.camera`);
}

/** Valida o JSON inteiro na inicialização. Lança `ErroDeDados` no primeiro campo errado. */
export function validarEmpreendimento(bruto: unknown): Empreendimento {
  const e = obj(bruto, "raiz");
  for (const k of ["nome", "incorporadora", "endereco", "whatsapp"]) str(e, k, "raiz");
  for (const k of ["orientacaoNorteGraus", "latitude", "longitude", "andares", "peDireito"]) num(e, k, "raiz");
  umDe(e, "modo", ["venda", "locacao", "ambos"], "raiz");
  lista(e, "terreo", "raiz").forEach((l, i) => validarLazer(l, `terreo[${i}]`));
  lista(e, "cobertura", "raiz").forEach((l, i) => validarLazer(l, `cobertura[${i}]`));

  const tipos = lista(e, "tipos", "raiz");
  if (tipos.length === 0) throw new ErroDeDados("tipos", "ao menos um tipo de planta", tipos);
  const idsTipo = new Set<string>();
  tipos.forEach((t, i) => {
    const c = `tipos[${i}]`;
    const tipo = obj(t, c);
    idsTipo.add(str(tipo, "id", c));
    str(tipo, "nome", c);
    num(tipo, "quartos", c);
    num(tipo, "vagas", c);
    bool(tipo, "mobiliado", c);
    const comodos = lista(tipo, "comodos", c);
    if (comodos.length === 0) throw new ErroDeDados(`${c}.comodos`, "ao menos um cômodo", comodos);
    comodos.forEach((cm, j) => {
      const cc = `${c}.comodos[${j}]`;
      const comodo = obj(cm, cc);
      str(comodo, "id", cc);
      str(comodo, "nome", cc);
      num(comodo, "area", cc);
      umDe(comodo, "piso", ["porcelanato-cinza", "externo"], cc);
      const pol = lista(comodo, "poligono", cc);
      if (pol.length < 3) throw new ErroDeDados(`${cc}.poligono`, "ao menos 3 pontos", pol);
      pol.forEach((p, k) => vetor(p, 2, `${cc}.poligono[${k}]`));
      enquadramento(comodo.enquadramento, `${cc}.enquadramento`);
      if (comodo.fotoDecorado !== undefined) str(comodo, "fotoDecorado", cc);
      if (comodo.splat !== undefined) {
        const s = obj(comodo.splat, `${cc}.splat`);
        for (const k of ["desktop", "mobile", "collider"]) str(s, k, `${cc}.splat`);
        vetor(s.spawn, 3, `${cc}.splat.spawn`);
        vetor(s.olhar, 3, `${cc}.splat.olhar`);
        const a = obj(s.areaSegura, `${cc}.splat.areaSegura`);
        vetor(a.centro, 3, `${cc}.splat.areaSegura.centro`);
        num(a, "raio", `${cc}.splat.areaSegura`);
      }
      if (comodo.splatTransform !== undefined) {
        const s = obj(comodo.splatTransform, `${cc}.splatTransform`);
        vetor(s.posicao, 3, `${cc}.splatTransform.posicao`);
        num(s, "rotacaoY", `${cc}.splatTransform`);
        num(s, "escala", `${cc}.splatTransform`);
      }
    });
    lista(tipo, "portas", c).forEach((a, j) => validarAbertura(a, `${c}.portas[${j}]`));
    lista(tipo, "janelas", c).forEach((a, j) => validarAbertura(a, `${c}.janelas[${j}]`));
  });

  const unidades = lista(e, "unidades", "raiz");
  if (unidades.length === 0) throw new ErroDeDados("unidades", "ao menos uma unidade", unidades);
  const numeros = new Set<string>();
  unidades.forEach((u, i) => {
    const c = `unidades[${i}]`;
    const un = obj(u, c);
    const numero = str(un, "numero", c);
    if (numeros.has(numero)) throw new ErroDeDados(`${c}.numero`, "um número único", numero);
    numeros.add(numero);
    const andar = num(un, "andar", c);
    if (andar < 1 || andar > (e.andares as number)) throw new ErroDeDados(`${c}.andar`, `entre 1 e ${String(e.andares)}`, andar);
    const pos = num(un, "posicao", c);
    if (!Number.isInteger(pos) || pos < 1 || pos > 6) throw new ErroDeDados(`${c}.posicao`, "um inteiro de 1 a 6", pos);
    const tipo = str(un, "tipo", c);
    if (!idsTipo.has(tipo)) throw new ErroDeDados(`${c}.tipo`, `um id de "tipos" (${[...idsTipo].join(", ")})`, tipo);
    umDe(un, "fachada", ["frente", "lateral"], c);
    num(un, "areaPrivativa", c);
    numOuNulo(un, "preco", c);
    numOuNulo(un, "aluguel", c);
    umDe(un, "status", STATUS, c);
  });

  const textos = obj(e.textos, "textos");
  for (const [k, v] of Object.entries(textos)) if (typeof v !== "string") throw new ErroDeDados(`textos.${k}`, "um texto", v);

  const loc = obj(e.localizacao, "localizacao");
  for (const k of ["bairro", "cidade", "uf"]) str(loc, k, "localizacao");
  lista(loc, "pontos", "localizacao").forEach((p, i) => {
    const c = `localizacao.pontos[${i}]`;
    const ponto = obj(p, c);
    str(ponto, "nome", c);
    str(ponto, "tempo", c);
    bool(ponto, "confirmado", c);
  });

  const demo = obj(e.demonstracao, "demonstracao");
  bool(demo, "ativo", "demonstracao");
  lista(demo, "campos", "demonstracao");

  return bruto as Empreendimento;
}
