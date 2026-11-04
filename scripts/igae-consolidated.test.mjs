import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseConsolidatedWorkbook } from './lib/igae-consolidated.mjs';

const workbook = async year => readFile(new URL(`../data/sources/igae/M_CONSOLIDADO_${year}.xlsx`, import.meta.url));

test('the official 2026 workbook reproduces the archived monthly flows exactly', async () => {
  const parsed = parseConsolidatedWorkbook(await workbook(2026));
  const history = JSON.parse(await readFile(new URL('../data/igae-monthly-history-2026.json', import.meta.url), 'utf8'));
  assert.equal(parsed.months.length, history.months.length);
  parsed.months.forEach((month, index) => {
    const archived = history.months[index].monthly;
    assert.equal(month.revenueTotal, archived.revenueTotal);
    for (const line of archived.revenue) assert.equal(month.revenue[line.id], line.amount, `${month.period} ${line.id}`);
    for (const line of archived.expenditure) assert.equal(month.expenditure[line.id], line.amount, `${month.period} ${line.id}`);
  });
});

test('August 2025 from the 2025 workbook matches the previous-year column of the IGAE PDF', async () => {
  const parsed = parseConsolidatedWorkbook(await workbook(2025));
  const august = parsed.months.find(month => month.period === '2025-08');
  assert.equal(parsed.provisional, true);
  assert.equal(august.revenueTotal, 55067);
  assert.equal(august.expenditureTotal, 51902);
  assert.equal(august.financingBalance, 3165);
  assert.equal(august.revenue.taxes, 30863);
  assert.equal(august.expenditure.benefits, 21031);
});

test('a full year adds up month by month', async () => {
  const parsed = parseConsolidatedWorkbook(await workbook(2024));
  assert.equal(parsed.months.length, 12);
  for (const month of parsed.months) {
    assert.equal(Object.values(month.revenue).reduce((a, b) => a + b, 0), month.revenueTotal);
    assert.equal(Object.values(month.expenditure).reduce((a, b) => a + b, 0), month.expenditureTotal);
  }
});
