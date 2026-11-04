import test from 'node:test';
import assert from 'node:assert/strict';
import { eurosPerResident, lineSliderMax, lineStep, officialScenario, buildBudgetGradient, decodeScenario, encodeScenario, getScenarioBalance, getScenarioDeficit, getUnallocatedBudget, setBudgetLineAmount } from '../app/lib/budget-scenario.ts';

const lines = [
  { id: 'wages', label: 'Sueldos', officialLabel: 'Remuneración', description: '', amount: 60, color: '#000' },
  { id: 'health-care', label: 'Sanidad', officialLabel: 'Sanidad', description: '', amount: 30, color: '#111' },
  { id: 'other', label: 'Otros', officialLabel: 'Otros', description: '', amount: 10, color: '#222' },
];

test('a slider cannot allocate more than the remaining budget; other items scale down', () => {
  const next = setBudgetLineAmount([60, 30, 10], 0, 90, 100);
  assert.deepEqual(next, [90, 7, 2]);
  assert.ok(next.reduce((sum, amount) => sum + amount, 0) <= 100);
});

test('setting a slider to zero leaves the released money unallocated', () => {
  const next = setBudgetLineAmount([60, 30, 10], 1, 0, 100);
  assert.deepEqual(next, [60, 0, 10]);
  assert.equal(getUnallocatedBudget(next, 100), 30);
});

test('keyboard-entered values are clamped to zero and the official monthly budget', () => {
  assert.deepEqual(setBudgetLineAmount([0, 0, 0], 0, -5, 100), [0, 0, 0]);
  assert.deepEqual(setBudgetLineAmount([0, 0, 0], 0, 120, 100), [100, 0, 0]);
});

test('shared scenarios round-trip by stable line identifiers', () => {
  const encoded = encodeScenario(lines, [40, 35, 15]);
  assert.deepEqual(decodeScenario(encoded, lines, 100), [40, 35, 15]);
  assert.deepEqual(decodeScenario(encoded, lines, 50), [23, 19, 8]);
});

test('invalid or incomplete shared scenarios are ignored', () => {
  assert.equal(decodeScenario('wages:40;unknown:60', lines, 100), null);
  assert.equal(decodeScenario('wages:40;health-care:NaN;other:20', lines, 100), null);
  assert.equal(decodeScenario('wages:1;wages:2;health-care:0;other:0', lines, 100), null);
});

test('deficit mode lets spending exceed revenue without shrinking other items', () => {
  const next = setBudgetLineAmount([60, 30, 10], 0, 90, 100, { allowDeficit: true });
  assert.deepEqual(next, [90, 30, 10]);
  assert.equal(getScenarioDeficit(next, 100), 30);
  assert.equal(getScenarioBalance(next, 100), -30);
  assert.equal(getUnallocatedBudget(next, 100), 0);
});

test('deficit mode still caps a single item at the revenue total', () => {
  assert.deepEqual(setBudgetLineAmount([0, 0, 0], 0, 500, 100, { allowDeficit: true }), [100, 0, 0]);
});

test('shared deficit scenarios keep amounts above revenue', () => {
  const encoded = encodeScenario(lines, [80, 40, 20]);
  assert.deepEqual(decodeScenario(encoded, lines, 100, { allowDeficit: true }), [80, 40, 20]);
  assert.deepEqual(decodeScenario(encoded, lines, 100), [58, 28, 14]);
});

test('the chart never draws more than a full ring when spending exceeds revenue', () => {
  const gradient = buildBudgetGradient(lines, [100, 50, 50], 100);
  assert.match(gradient, /#222 75% 100%$/);
});

test('year-to-date view sums archived monthly IGAE flows', async () => {
  const { buildYearToDate } = await import('../app/lib/year-to-date.ts');
  const { readFile } = await import('node:fs/promises');
  const history = JSON.parse(await readFile(new URL('../data/igae-monthly-history-2026.json', import.meta.url), 'utf8'));
  const monthlies = history.months.map(month => month.monthly);
  const ytd = buildYearToDate(monthlies, '2026-08');
  assert.equal(ytd.periodLabel, 'Enero a agosto de 2026');
  assert.equal(ytd.revenueTotal, monthlies.reduce((sum, item) => sum + item.revenueTotal, 0));
  assert.equal(ytd.expenditure.reduce((sum, line) => sum + line.amount, 0), ytd.expenditureTotal);
  assert.equal(ytd.revenueTotal - ytd.expenditureTotal, ytd.financingBalance);
  assert.equal(buildYearToDate(monthlies, '2026-01'), null);
  assert.equal(buildYearToDate(monthlies.filter(item => item.referencePeriod !== '2026-03'), '2026-08'), null);
});

test('each slider is scaled to its own item, capped at revenue', () => {
  assert.equal(lineSliderMax(838, 838, 56335), 2514);
  assert.equal(lineSliderMax(838, 4000, 56335), 4000);
  assert.equal(lineSliderMax(22435, 22435, 56335), 56335);
  assert.equal(lineSliderMax(0, 0, 100), 1);
});

test('step buttons move 5 % of the official amount, at least 1 M€', () => {
  assert.equal(lineStep(22435), 1122);
  assert.equal(lineStep(10), 1);
});

test('the scenario starts from official spending and enables deficit mode when needed', () => {
  assert.deepEqual(officialScenario(lines, 100), { amounts: [60, 30, 10], allowDeficit: false });
  assert.deepEqual(officialScenario(lines, 90), { amounts: [60, 30, 10], allowDeficit: true });
});

test('per-resident equivalents convert millions of euros to euros per person', () => {
  assert.equal(Math.round(eurosPerResident(1000, 49_801_559)), 20);
  assert.equal(eurosPerResident(1000, 0), 0);
});
