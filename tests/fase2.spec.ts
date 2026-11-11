import { expect, test } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, semErros, vigiarConsole } from "./apoio";

test("fase 2: link direto foca a unidade certa e o painel tem WhatsApp", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=1201");
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("numero-unidade")).toHaveText("1201");
  const zap = await page.getByTestId("whatsapp-unidade").getAttribute("href");
  expect(zap).toContain("wa.me/5534998795445");
  expect(decodeURIComponent(zap ?? "")).toContain("Olá! Tenho interesse na unidade 1201 do Live ZP Connect. Pode me passar mais informações?");
  await capturar(page, "f2-unidade", info.project.name);
  // unidade de cima
  await page.getByTestId("seta-cima").click();
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("numero-unidade")).toHaveText("1301");
  expect(page.url()).toContain("unidade=1301");
  semErros(erros);
});

test("fase 2: filtros, contador e camada de status", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await page.getByTestId("pular-intro").click();
  await esperarEstado(page, "PREDIO");
  await page.getByTestId("abrir-filtros").click();
  const contador = page.getByTestId("contador-filtro");
  await expect(contador).toContainText("78 de 78");
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await expect(contador).toContainText("39 de 78");
  await page.getByText("Só disponíveis").click();
  const n = Number((await contador.innerText()).split(" ")[0]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(39);
  await capturar(page, "f2-filtros", info.project.name);
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(contador).toContainText("78 de 78");
  await page.getByRole("button", { name: "Fechar filtros" }).click();
  await page.getByTestId("ver-status").click();
  expect((await estado(page)).mostrarStatus).toBe(false);
  semErros(erros);
});
