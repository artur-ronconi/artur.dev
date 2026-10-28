/**
 * Smoke test end-to-end dos fluxos principais.
 *
 *   1. terminal A: npm run dev      (ou npm run build && npm start)
 *   2. terminal B: npm run test:e2e
 *
 * Variáveis opcionais: E2E_URL, E2E_EMAIL, E2E_PASSWORD, E2E_CHROME.
 */

import { chromium } from "playwright";

const BASE = process.env.E2E_URL ?? "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.ADMIN_PASSWORD;
const EXECUTABLE = process.env.E2E_CHROME;

const SLUG = `e2e-${Date.now()}`;
const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (message) => {
  // Os 404 propositais (rascunho / projeto excluído) não contam como erro.
  const text = message.text();
  if (message.type() === "error" && !text.includes("status of 404")) {
    consoleErrors.push(text.slice(0, 200));
  }
});

try {
  // ----------------------------------------------------------- site público
  const home = await page.goto(BASE, { waitUntil: "networkidle" });
  check("home responde 200", home?.status() === 200);
  check("hero renderiza o nome", (await page.locator("h1").first().innerText()).length > 3);

  // ---------------------------------------------------------- interatividade
  await page.fill("#terminal-input", "whoami");
  await page.keyboard.press("Enter");
  check(
    "terminal do hero responde a comandos",
    (await page.locator('#inicio [role="log"]').innerText()).split("\n").length > 2,
  );

  const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('header button[aria-label^="Mudar para o tema"]').click();
  await page.waitForTimeout(800);
  const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
  check("botão alterna entre tema claro e escuro", themeBefore !== themeAfter, `${themeBefore} → ${themeAfter}`);

  const flow = page.locator("#destaque figure");
  if ((await flow.locator('button:has-text("Simular fluxo")').count()) > 0) {
    await flow.locator('button:has-text("Simular fluxo")').click();
    await page.waitForTimeout(1500);
    check("explorador de fluxo inicia a simulação", (await flow.locator('[aria-current="step"]').count()) === 1);
  }

  const lab = page.locator("#laboratorio");
  if ((await lab.count()) > 0) {
    await lab.scrollIntoViewIfNeeded();
    await lab.locator('button[aria-label^="Instância"]').first().click();
    await page.waitForTimeout(800);
    check(
      "laboratório registra a instância derrubada",
      (await lab.locator('[role="log"]').innerText()).includes("parou de responder"),
    );
  }

  const listing = await page.goto(`${BASE}/projetos`, { waitUntil: "networkidle" });
  check("listagem de projetos responde 200", listing?.status() === 200);

  const projectHref = await page.locator("article a").first().getAttribute("href");
  const detail = await page.goto(BASE + projectHref, { waitUntil: "networkidle" });
  check("página do projeto responde 200", detail?.status() === 200, projectHref ?? "");
  await page.waitForTimeout(1500);
  check("diagrama de arquitetura renderiza", (await page.locator("figure svg").count()) > 0);

  // --------------------------------------------------------- admin protegido
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  check("admin exige login", page.url().includes("/admin/login"));

  if (!EMAIL || !PASSWORD) {
    console.log("\n⚠ E2E_EMAIL/E2E_PASSWORD não definidos — fluxo autenticado ignorado.");
  } else {
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForURL("**/admin", { timeout: 20000 });
    check("login administrativo", page.url().endsWith("/admin"));

    for (const path of [
      "/admin/projetos",
      "/admin/tecnologias",
      "/admin/experiencias",
      "/admin/certificacoes",
      "/admin/midia",
      "/admin/mensagens",
      "/admin/perfil",
      "/admin/conta",
    ]) {
      const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
      check(`${path} carrega`, response?.status() === 200);
    }

    // CRUD completo de projeto
    await page.goto(`${BASE}/admin/projetos/novo`, { waitUntil: "networkidle" });
    await page.fill("#title", `Projeto E2E ${SLUG}`);
    await page.fill("#slug", SLUG);
    await page.fill("#summary", "Projeto criado pelo smoke test automatizado para validar o CRUD.");
    await page.click('button:has-text("Salvar rascunho")');
    await page.waitForTimeout(3000);
    check("projeto criado como rascunho", /\/admin\/projetos\/c[a-z0-9]+/.test(page.url()), page.url());

    const projectId = page.url().split("/").pop();
    const preview = await page.goto(`${BASE}/preview/${projectId}`, { waitUntil: "networkidle" });
    check("prévia autenticada do rascunho", preview?.status() === 200);
    await page.goBack();

    // rascunho não aparece para visitantes anônimos
    const anonymous = await browser.newContext();
    const anonymousPage = await anonymous.newPage();
    const draftResponse = await anonymousPage.goto(`${BASE}/projetos/${SLUG}`, {
      waitUntil: "domcontentloaded",
    });
    check("rascunho retorna 404 para visitantes", draftResponse?.status() === 404);
    await anonymous.close();

    // publica e confere a página pública
    await page.click('button:has-text("Salvar e publicar")');
    await page.waitForTimeout(3000);
    const published = await page.goto(`${BASE}/projetos/${SLUG}`, { waitUntil: "networkidle" });
    check("projeto publicado fica acessível", published?.status() === 200);

    // exclui
    await page.goto(`${BASE}/admin/projetos`, { waitUntil: "networkidle" });
    const row = page.locator("tr", { hasText: `Projeto E2E ${SLUG}` });
    await row.locator("button").last().click();
    await page.click('button:has-text("Excluir projeto")');
    await page.waitForTimeout(3000);
    const after = await page.goto(`${BASE}/projetos/${SLUG}`, { waitUntil: "domcontentloaded" });
    check("projeto excluído some do site", after?.status() === 404);
  }

  check("sem erros de console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
if (failed.length > 0) process.exit(1);
