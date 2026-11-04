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

test('«España en contexto» se abre desde el índice', async ({ page }) => {
  await page.goto('/');
  await page.locator('.section-directory-grid a', { hasText: 'España en contexto' }).click();
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
