import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole } from "./apoio";

test("fase 3: entrar leva direto ao passeio 3D; maquete, abas e minimapa", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1202");
  await esperarEstado(page, "UNIDADE");
  await page.getByTestId("entrar").dispatchEvent("click");
  await esperarEstado(page, "PASSEIO");
  const s0 = await estado(page);
  expect(s0.cena).toBe("interior");
  expect(s0.comodoAtual).toBe("sala");
  expect((s0.foto as { aberta: boolean }).aberta).toBe(false); // o 3D navegável é o padrão, não a foto
  await expect(page.getByTestId("dica-passeio")).toBeVisible();
  await capturar(page, "f3-entrada", info.project.name);
  await page.getByTestId("ir-maquete").dispatchEvent("click");
  await esperarEstado(page, "MAQUETE");
  await capturar(page, "f3-maquete", info.project.name);
  await page.getByTestId("mostrar-medidas").click();
  expect((await estado(page)).medidas).toBe(true);

  // ponto de interesse do quarto leva ao passeio dentro dele
  await expect(page.getByTestId("ponto-quarto")).toBeEnabled();
  await page.getByTestId("ponto-quarto").dispatchEvent("click"); // o ponto gira com a maquete
  await esperarEstado(page, "PASSEIO");
  expect((await estado(page)).comodoAtual).toBe("quarto");
  await expect(page.getByTestId("minimapa")).toBeVisible();
  await expect(page.getByTestId("previa-simplificada")).toBeVisible(); // sem .spz em /public/splats
  await page.waitForFunction(() => window.location.search.includes("comodo=quarto"));
  await capturar(page, "f3-quarto", info.project.name);

  // abas: a câmera desliza até o cômodo
  await page.getByTestId("aba-sala").dispatchEvent("click");
  await page.waitForFunction(() => window.location.search.includes("comodo=sala"), null, { timeout: 60_000 });
  await page.waitForTimeout(6000);
  await capturar(page, "f3-sala", info.project.name);

  await page.getByTestId("ir-maquete").dispatchEvent("click");
  await esperarEstado(page, "MAQUETE");
  await page.getByTestId("voltar-predio").first().dispatchEvent("click");
  await esperarEstado(page, "PREDIO");
  expect((await estado(page)).cena).toBe("exterior");
  semErros(erros);
});

test("fase 3: link direto de cômodo abre o passeio no lugar certo", async ({ page }) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1804&comodo=banheiro");
  await esperarEstado(page, "PASSEIO");
  const s = await estado(page);
  expect(s.unidadeSel).toBe("1804");
  expect(s.comodoAtual).toBe("banheiro");
  await expect(page.getByTestId("aba-banheiro")).toHaveAttribute("aria-current", "true");
  semErros(erros);
});
