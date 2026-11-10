import { defineConfig } from "@playwright/test";

const PORTA = 3100;
// O Chromium dos testes usa WebGL por software (SwiftShader): funciona em qualquer máquina, mas é lento.
const args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  timeout: 240_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORTA}`, launchOptions: { args }, actionTimeout: 45_000 },
  projects: [
    { name: "celular", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: `npx next start -p ${PORTA}`,
    url: `http://127.0.0.1:${PORTA}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
