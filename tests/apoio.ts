import { expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Erros de console coletados durante o teste (critério: nenhum). */
export function vigiarConsole(page: Page): string[] {
  const erros: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text());
  });
  page.on("pageerror", (e) => erros.push(e.message));
  return erros;
}

/** Abre a página com o gancho de depuração e espera a cena ficar pronta. */
export async function abrir(page: Page, consulta = ""): Promise<void> {
  await page.goto(`/?debug=1&q=medio${consulta ? `&${consulta}` : ""}`);
  await page.waitForFunction(() => (window as never as { __zp?: { getState: () => { pronto: boolean } } }).__zp?.getState().pronto === true, null, { timeout: 150_000 });
}

/**
 * Pula a introdução. Com GPU por software, a compilação dos shaders no primeiro quadro pode durar
 * mais que o voo inteiro da introdução: nesse caso ela já terminou e não há botão para clicar.
 */
export async function pularIntro(page: Page): Promise<void> {
  const botao = page.getByTestId("pular-intro");
  if (await botao.isVisible().catch(() => false)) await botao.click().catch(() => undefined);
}

export async function estado(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const s = (window as never as { __zp: { getState: () => Record<string, unknown> } }).__zp.getState();
    return JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  });
}

export async function esperarEstado(page: Page, nome: string, semVoo = true): Promise<void> {
  await page.waitForFunction(
    ([n, v]) => {
      const s = (window as never as { __zp: { getState: () => { estado: string; emVoo: boolean; veu: boolean } } }).__zp.getState();
      return s.estado === n && (!v || (!s.emVoo && !s.veu));
    },
    [nome, semVoo] as const,
    { timeout: 90_000 },
  );
}

/** Captura via CDP (o render por software não acompanha o screenshot padrão). */
export async function capturar(page: Page, nome: string, projeto: string): Promise<void> {
  await page.waitForTimeout(2500);
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  const dir = path.join(__dirname, "capturas");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${nome}-${projeto}.png`), Buffer.from(data, "base64"));
  await cdp.detach();
}

export function semErros(erros: string[]): void {
  expect(erros, `erros no console:\n${erros.join("\n")}`).toEqual([]);
}
