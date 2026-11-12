import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole, pularIntro } from "./apoio";

test("fase 2: link direto foca a unidade certa e o painel tem WhatsApp", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1802");
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("numero-unidade")).toHaveText("1802");
  const zap = await page.getByTestId("whatsapp-unidade").getAttribute("href");
  expect(zap).toContain("wa.me/5534996844424");
  expect(decodeURIComponent(zap ?? "")).toContain("Olá! Tenho interesse na unidade 1802 do Liwo. Pode me passar mais informações?");
  await capturar(page, "f2-unidade", info.project.name);
  // unidade de cima
  await page.getByTestId("seta-cima").click();
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("numero-unidade")).toHaveText("1902");
  expect(page.url()).toContain("unidade=1902");
  semErros(erros);
});

test("fase 2: filtros, contador e camada de status", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await pularIntro(page);
  await esperarEstado(page, "PREDIO");
  await page.getByTestId("abrir-filtros").click();
  const contador = page.getByTestId("contador-filtro");
  await expect(contador).toContainText("111 de 111");
  await page.getByRole("button", { name: "3 suítes", exact: true }).click();
  await expect(contador).toContainText("36 de 111");
  await page.getByText("Só disponíveis").click();
  const n = Number((await contador.innerText()).split(" ")[0]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(36);
  await capturar(page, "f2-filtros", info.project.name);
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(contador).toContainText("111 de 111");
  await page.getByRole("button", { name: "Fechar filtros" }).click();
  await page.getByTestId("ver-status").click();
  expect((await estado(page)).mostrarStatus).toBe(false);
  semErros(erros);
});
