import { expect, test, type Page } from "@playwright/test";
import { abrir, capturar, esperarEstado, estado, pularIntro, semErros, vigiarConsole } from "./apoio";

type Pose = { x: number; z: number; guinada: number };
const pose = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __pose: Pose }).__pose }));

test("fase 7: 13º andar → unidade 1301 → entrar e caminhar em 3D → trocar de cômodo → sair", async ({ page }, info) => {
  const erros = vigiarConsole(page);
  await abrir(page);
  await pularIntro(page);
  await esperarEstado(page, "PREDIO");

  // escolhe o andar no seletor: o pavimento fica em destaque e a lista mostra as unidades dele
  await page.getByTestId("abrir-andares").click();
  await page.getByTestId("andar-13").click();
  const f = (await estado(page)).filtros as { andarMin: number; andarMax: number };
  expect([f.andarMin, f.andarMax]).toEqual([13, 13]);
  await capturar(page, "f7-andar", info.project.name);
  await page.getByTestId("escolher-1301").dispatchEvent("click");
  await esperarEstado(page, "UNIDADE");
  expect((await estado(page)).unidadeSel).toBe("1301");

  // entra: apartamento 3D navegável (planta oficial do final 01), não uma fotografia
  await page.getByTestId("entrar").dispatchEvent("click");
  await esperarEstado(page, "PASSEIO");
  const s = await estado(page);
  expect(s.cena).toBe("interior");
  expect(s.comodoAtual).toBe("living");
  expect((s.foto as { aberta: boolean }).aberta).toBe(false);
  await expect(page.getByTestId("abas-comodos")).toBeVisible();
  await capturar(page, "f7-living", info.project.name);

  // anda: joystick no celular, teclado (W) no computador
  const p0 = await pose(page);
  if (info.project.name === "celular") {
    const j = page.getByTestId("joystick");
    await expect(j).toBeVisible();
    const b = (await j.boundingBox()) as { x: number; y: number; width: number; height: number };
    const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: cy - i * 5, id: 1 }] });
    await page.waitForTimeout(2500);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await expect(page.getByTestId("joystick")).toHaveCount(0);
    await page.keyboard.down("w");
    await page.waitForTimeout(2500);
    await page.keyboard.up("w");
  }
  const p1 = await pose(page);
  expect(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toBeGreaterThan(0.3);

  // troca de cômodo pela aba: a câmera caminha pela circulação até a suíte
  await page.getByTestId("aba-suite").dispatchEvent("click");
  await page.waitForFunction(() => {
    const p = (window as unknown as { __pose: Pose }).__pose;
    return Math.hypot(p.x - 7.55, p.z - 2.55) < 0.25;
  }, null, { timeout: 120_000 });
  expect((await estado(page)).comodoAtual).toBe("suite");
  await capturar(page, "f7-suite", info.project.name);

  // colisão: andar para a frente (na direção da cama) não atravessa o móvel
  await page.keyboard.down("w");
  await page.waitForTimeout(3500);
  await page.keyboard.up("w");
  const p2 = await pose(page);
  const dentroDaCama = p2.x > 5.74 && p2.x < 7.28 && p2.z > 3.45 && p2.z < 5.44;
  expect(dentroDaCama).toBe(false);

  // sai do apartamento e volta ao prédio
  await page.getByTestId("voltar-predio").first().dispatchEvent("click");
  await esperarEstado(page, "PREDIO");
  expect((await estado(page)).cena).toBe("exterior");
  semErros(erros);
});

test("fase 7: vista do andar funciona em plantas sem interior (garden)", async ({ page }) => {
  const erros = vigiarConsole(page);
  await abrir(page, "unidade=606");
  await esperarEstado(page, "UNIDADE");
  await expect(page.getByTestId("sem-interior")).toBeVisible();
  await page.evaluate(() => (window as unknown as { __zp: { getState: () => { verVista: () => void } } }).__zp.getState().verVista());
  await esperarEstado(page, "VISTA");
  const g0 = (await pose(page)).guinada;
  const box = (await page.locator("canvas").first().boundingBox()) as { x: number; y: number; width: number; height: number };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect(Math.abs((await pose(page)).guinada - g0)).toBeGreaterThan(0.2);
  semErros(erros);
});
