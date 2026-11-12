import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole, pularIntro } from "./apoio";

test("fase 1: prédio procedural no ângulo do render diagonal", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await expect(page.getByTestId("selo-demo").first()).toBeVisible();
  await pularIntro(page);
  await esperarEstado(page, "PREDIO");
  expect((await estado(page)).cena).toBe("exterior");
  await capturar(page, "f1-predio", info.project.name);
  semErros(erros);
});
