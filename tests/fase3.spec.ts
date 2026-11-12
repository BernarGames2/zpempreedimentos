import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole } from "./apoio";

test("fase 3: entrada pela varanda, maquete, passeio com abas e minimapa", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1202");
  await esperarEstado(page, "UNIDADE");
  await page.getByTestId("entrar").click();
  await esperarEstado(page, "MAQUETE");
  expect((await estado(page)).cena).toBe("interior");
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
  await page.getByTestId("aba-sala").click();
  await page.waitForFunction(() => window.location.search.includes("comodo=sala"), null, { timeout: 60_000 });
  await page.waitForTimeout(6000);
  await capturar(page, "f3-sala", info.project.name);

  await page.getByTestId("ir-maquete").click();
  await esperarEstado(page, "MAQUETE");
  await page.getByTestId("voltar-predio").click();
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
