import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const dock = '.scenario-dock';

test('el simulador empieza con el gasto oficial y el resumen cuadra', async ({ page }) => {
  await page.goto('/?mes=2026-08');
  await expect(page.locator(dock)).toContainText('Sobran 1316 M€');
  await expect(page.locator('#amount-benefits')).toHaveValue('22435');
});

test('al pulsar + cambia la partida y el resumen al momento', async ({ page }) => {
  await page.goto('/?mes=2026-08');
  await page.getByRole('button', { name: /Sumar .* a Prestaciones en dinero/ }).click();
  await expect(page.locator('#amount-benefits')).toHaveValue('23557');
  await expect(page.locator(dock)).toContainText('Sobran 194 M€');
});

test('en un mes con déficit se activa «Permitir déficit» y se ven los intereses', async ({ page }) => {
  await page.goto('/?mes=2026-01');
  await expect(page.getByRole('checkbox', { name: /Permitir déficit/ })).toBeChecked();
  await expect(page.locator(dock)).toContainText('Faltan 7325 M€');
  await expect(page.locator(dock)).toContainText('al año en intereses');
});

test('las tres vistas del gasto cambian las partidas y la URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Por función/ }).check();
  await expect(page).toHaveURL(/vista=funciones/);
  await expect(page.locator('.sim-name').filter({ hasText: 'Sanidad' })).toBeVisible();
  await page.getByRole('radio', { name: /enero a agosto/ }).check();
  await expect(page).toHaveURL(/vista=acumulado/);
  await expect(page.locator(dock)).toContainText('Faltan 31.183 M€');
});

test('un escenario compartido se abre tal cual', async ({ page }) => {
  await page.goto('/?mes=2026-08&reparto=intermediate:4837;wages:12075;interest:3348;subsidies:838;benefits:30000;in_kind:3286;capital:3104;transfers_out:2676;other_out:2420&deficit=1');
  await expect(page.locator('#amount-benefits')).toHaveValue('30000');
  await expect(page.locator(dock)).toContainText('Faltan');
});

test('los resúmenes se ven sin abrir nada y su botón abre el detalle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'España en contexto', level: 2 })).toBeVisible();
  await expect(page.locator('.section-teaser').filter({ hasText: 'España en contexto' })).toContainText('% del PIB');
  await expect(page.locator('.section-teaser').filter({ hasText: 'Comunidades autónomas' }).locator('.teaser-rank li')).toHaveCount(6);
  await expect(page.locator('#contexto')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: /Ver la evolución y la comparación/ }).click();
  await expect(page.locator('#contexto')).toHaveAttribute('open', '');
  await expect(page.locator('.ctx-plot svg')).toHaveCount(2);
  await expect(page.locator('.ctx-level-row')).toHaveCount(5);
});

test('no hay desbordamiento horizontal ni infracciones de accesibilidad', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.querySelectorAll('details').forEach(details => { details.open = true; }));
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

test('la imagen de vista previa se genera', async ({ request }) => {
  const response = await request.get('/og?mes=2026-01');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});

test.describe('modo oscuro', () => {
  test.use({ colorScheme: 'dark' });
  test('se aplica y no tiene infracciones de accesibilidad', async ({ page }) => {
    await page.goto('/');
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).not.toBe('rgb(244, 244, 238)');
    await page.evaluate(() => document.querySelectorAll('details').forEach(details => { details.open = true; }));
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
  });
});

test('un mes de 2025 se compara con el mismo mes de 2024 y no muestra deuda de otro mes', async ({ page }) => {
  await page.goto('/?mes=2025-08');
  await expect(page.locator('#dashboard-period')).toHaveValue('2025-08');
  await expect(page.locator('.hero-stats')).toContainText('frente a agosto de 2024');
  await expect(page.locator('.hero-debt')).toContainText('cargada desde enero de 2026');
  await expect(page.locator(dock)).toContainText('Sobran 3165 M€');
});

test('el aviso legal se abre desde el pie, explica la privacidad y es accesible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'AVISO LEGAL Y PRIVACIDAD' }).click();
  await expect(page).toHaveURL(/\/aviso-legal$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Qué es esta web');
  await expect(page.locator('main')).toContainText('Sin cookies');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

test('robots.txt y sitemap.xml existen y apuntan al dominio', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://');
  expect(robots).toContain('Disallow: /og');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/aviso-legal</loc>');
});
