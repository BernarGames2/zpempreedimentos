import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole } from "./apoio";

const set = (page: import("@playwright/test").Page, parcial: Record<string, unknown>) =>
  page.evaluate((p) => (window as never as { __zp: { getState: () => { set: (x: unknown) => void } } }).__zp.getState().set(p), parcial);

test("fase 4: estudo de sol, qualidade e vista da sacada", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=902");
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("frase-sol")).toContainText(/sol|luz/i);
  await set(page, { noite: false, hora: 10 });
  await expect(page.getByTestId("frase-sol")).toContainText("10h");
  await capturar(page, "f4-dia", info.project.name);
  await page.getByTestId("menu-qualidade").click();
  await page.getByTestId("qualidade-baixo").click();
  expect((await estado(page)).qualidade).toBe("baixo");
  await page.getByTestId("ver-vista").click();
  await esperarEstado(page, "VISTA");
  await expect(page.getByTestId("vista-ilustrativa")).toBeVisible();
  await capturar(page, "f4-vista", info.project.name);
  await page.getByTestId("voltar-unidade").click();
  await esperarEstado(page, "UNIDADE");
  semErros(erros);
});

test("fase 5: foto do decorado com controle 3D ↔ Foto", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1202&comodo=quarto");
  await esperarEstado(page, "PASSEIO");
  await page.getByTestId("foto-decorado").click();
  await expect(page.getByTestId("camada-foto")).toHaveCSS("opacity", "1", { timeout: 30_000 });
  await expect(page.getByAltText("Foto oficial do decorado: Quarto")).toBeVisible();
  await page.getByTestId("mix-foto").fill("0.5");
  expect(((await estado(page)).foto as { mix: number }).mix).toBe(0.5);
  await capturar(page, "f5-foto", info.project.name);
  const eventos = await page.evaluate(() => (window.__zpEventos ?? []).map((e) => e.evento));
  expect(eventos).toContain("abriu_foto_decorado");
  semErros(erros);
});

test("fase 5: lazer e formulário até o WhatsApp", async ({ page, context }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await page.getByTestId("pular-intro").click();
  await esperarEstado(page, "PREDIO");
  await page.getByTestId("abrir-lazer").click();
  await esperarEstado(page, "LAZER");
  await expect(page.getByTestId("lazer-piscina")).toBeEnabled();
  await page.getByTestId("lazer-piscina").dispatchEvent("click"); // o ponto acompanha a câmera
  await esperarEstado(page, "LAZER");
  const cartao = page.getByTestId("cartao-lazer");
  await expect(cartao).toContainText("Piscina");
  await expect(cartao).toContainText("Cobertura · Exclusivo para moradores");
  await expect(page.getByTestId("lazer-ilustrativo")).toBeVisible();
  await capturar(page, "f5-lazer", info.project.name);
  await page.getByTestId("lazer-voltar").click();
  await esperarEstado(page, "PREDIO");

  // formulário: abre o WhatsApp com a mensagem pronta
  await context.route("**/wa.me/**", (r) => r.fulfill({ status: 200, body: "ok" }));
  await context.route("**/api.whatsapp.com/**", (r) => r.fulfill({ status: 200, body: "ok" }));
  await page.locator("#contato").scrollIntoViewIfNeeded();
  await page.getByLabel("Nome").fill("Maria Teste");
  await page.getByLabel("WhatsApp").fill("(34) 99999-0000");
  await page.getByLabel("Unidade de interesse").fill("1201");
  await page.getByText("Quero alugar").click();
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Continuar no WhatsApp" }).click()]);
  const url = decodeURIComponent(popup.url());
  expect(url).toContain("wa.me/5534998985445");
  expect(url).toContain("quero alugar no Live ZP Connect (unidade 1201)");
  const eventos = await page.evaluate(() => (window.__zpEventos ?? []).map((e) => e.evento));
  expect(eventos).toEqual(expect.arrayContaining(["lazer_visto", "lead_enviado", "clicou_whatsapp"]));
  await page.locator("#decorado").scrollIntoViewIfNeeded();
  await capturar(page, "f5-secoes", info.project.name);
  semErros(erros);
});

test("fase 6: sem WebGL mostra a versão 2D com tabela e filtros", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await page.goto("/?semwebgl=1");
  await expect(page.getByTestId("alternativa-2d")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(78);
  await page.getByRole("button", { name: "1 quarto", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(39);
  await capturar(page, "f6-sem-webgl", info.project.name);
  semErros(erros);
});

test("fase 6: SEO e movimento reduzido", async ({ page }) => {
  const erros = vigiarConsole(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page);
  await esperarEstado(page, "PREDIO"); // sem a introdução animada
  await expect(page.locator("h1")).toHaveText("Studios mobiliados no Saraiva, Uberlândia");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /01-fachada-esquina\.png/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}") as { "@type": string; name: string };
  expect(ld["@type"]).toBe("ApartmentComplex");
  expect(ld.name).toBe("Live ZP Connect");
  // teclado: o primeiro Tab leva ao link de pular a experiência
  await page.keyboard.press("Tab");
  await expect(page.getByText("Pular a experiência 3D")).toBeFocused();
  semErros(erros);
});
