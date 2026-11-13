import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole, pularIntro } from "./apoio";

const set = (page: import("@playwright/test").Page, parcial: Record<string, unknown>) =>
  page.evaluate((p) => (window as never as { __zp: { getState: () => { set: (x: unknown) => void } } }).__zp.getState().set(p), parcial);

test("fase 4: estudo de sol, qualidade e vista da sacada", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1102");
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("frase-sol")).toContainText(/sol|luz/i);
  await set(page, { noite: false, hora: 10 });
  await expect(page.getByTestId("frase-sol")).toContainText("10h");
  await capturar(page, "f4-dia", info.project.name);
  // a qualidade é fixa por aparelho: o visitante não escolhe nível de qualidade
  await expect(page.getByTestId("menu-qualidade")).toHaveCount(0);
  await set(page, { qualidade: "baixo" });
  expect((await estado(page)).qualidade).toBe("baixo");
  await page.getByTestId("ver-vista").dispatchEvent("click");
  await esperarEstado(page, "VISTA");
  await expect(page.getByTestId("vista-ilustrativa")).toBeVisible();
  await capturar(page, "f4-vista", info.project.name);
  await page.getByTestId("voltar-unidade").dispatchEvent("click");
  await esperarEstado(page, "UNIDADE");
  semErros(erros);
});

test("fase 5: foto do decorado com controle 3D ↔ Foto", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1202&comodo=quarto");
  await esperarEstado(page, "PASSEIO");
  // o 3D é o padrão: a foto oficial só abre quando o visitante pede, e o botão fecha de novo
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("camada-foto")).toHaveCSS("opacity", "0");
  await page.getByTestId("foto-decorado").dispatchEvent("click");
  await expect(page.getByTestId("camada-foto")).toHaveCSS("opacity", "1", { timeout: 60_000 });
  await expect(page.getByAltText("Foto oficial do decorado: Suíte master")).toBeVisible();
  await page.getByTestId("mix-foto").fill("0.5");
  expect(((await estado(page)).foto as { mix: number }).mix).toBe(0.5);
  await capturar(page, "f5-foto", info.project.name);
  await page.getByTestId("foto-decorado").dispatchEvent("click");
  await expect(page.getByTestId("camada-foto")).toHaveCSS("opacity", "0", { timeout: 30_000 });
  const eventos = await page.evaluate(() => (window.__zpEventos ?? []).map((e) => e.evento));
  expect(eventos).toContain("abriu_foto_decorado");
  semErros(erros);
});

test("fase 5: lazer e formulário até o WhatsApp", async ({ page, context }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await pularIntro(page);
  await esperarEstado(page, "PREDIO");
  // Com GPU por software a página fica segundos sem responder enquanto compila os gráficos do lazer:
  // o clique não espera "navegação" (não há nenhuma) e o voltar vai direto ao botão, como o ponto da piscina.
  await page.getByTestId("abrir-lazer").click({ noWaitAfter: true });
  await esperarEstado(page, "LAZER");
  await expect(page.getByTestId("lazer-piscina")).toBeEnabled();
  await page.getByTestId("lazer-piscina").dispatchEvent("click"); // o ponto acompanha a câmera
  await esperarEstado(page, "LAZER");
  const cartao = page.getByTestId("cartao-lazer");
  await expect(cartao).toContainText("Piscina");
  await expect(cartao).toContainText("5º pavimento · Lazer");
  await expect(page.getByTestId("lazer-ilustrativo")).toBeVisible();
  await capturar(page, "f5-lazer", info.project.name);
  await page.getByTestId("lazer-voltar").dispatchEvent("click");
  await esperarEstado(page, "PREDIO");

  // formulário: abre o WhatsApp com a mensagem pronta
  await context.route("**/wa.me/**", (r) => r.fulfill({ status: 200, body: "ok" }));
  await context.route("**/api.whatsapp.com/**", (r) => r.fulfill({ status: 200, body: "ok" }));
  // rolar pelo próprio navegador: com o 3D por software ainda rodando, a espera de "elemento estável" do
  // Playwright passa do limite
  await page.locator("#contato").evaluate((el) => el.scrollIntoView());
  await page.getByLabel("Nome").fill("Maria Teste");
  await page.getByLabel("WhatsApp").fill("(34) 99999-0000");
  await page.getByLabel("Unidade de interesse").fill("1802");
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Continuar no WhatsApp" }).click()]);
  const url = decodeURIComponent(popup.url());
  expect(url).toContain("wa.me/5534996844424");
  expect(url).toContain("quero comprar no Liwo (unidade 1802)");
  const eventos = await page.evaluate(() => (window.__zpEventos ?? []).map((e) => e.evento));
  expect(eventos).toEqual(expect.arrayContaining(["lazer_visto", "lead_enviado", "clicou_whatsapp"]));
  await page.locator("#interiores").scrollIntoViewIfNeeded();
  await capturar(page, "f5-secoes", info.project.name);
  semErros(erros);
});

test("fase 6: sem WebGL mostra a versão 2D com tabela e filtros", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await page.goto("/?semwebgl=1");
  await expect(page.getByTestId("alternativa-2d")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(111);
  await page.getByRole("button", { name: "3 suítes", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await capturar(page, "f6-sem-webgl", info.project.name);
  semErros(erros);
});

test("fase 6: SEO e movimento reduzido", async ({ page }) => {
  const erros = vigiarConsole(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page);
  await esperarEstado(page, "PREDIO"); // sem a introdução animada
  await expect(page.locator("h1")).toHaveText("Apartamentos de 76 a 193 m² no Parque Sul Karaíba, Uberlândia");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /fachada-diagonal\.jpg/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}") as { "@type": string; name: string };
  expect(ld["@type"]).toBe("ApartmentComplex");
  expect(ld.name).toBe("Liwo");
  // teclado: o primeiro Tab leva ao link de pular a experiência
  await page.keyboard.press("Tab");
  await expect(page.getByText("Pular a experiência 3D")).toBeFocused();
  semErros(erros);
});
