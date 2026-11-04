import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildContext, jsonStatRows } from './lib/eurostat.mjs';

const load = async name => JSON.parse(await readFile(new URL(`./fixtures/eurostat/context_${name}.json`, import.meta.url), 'utf8'));
const responses = { ratios: await load('ratios'), debt: await load('debt'), functions: await load('functions'), levels: await load('levels'), interest: await load('interest'), debtEuros: await load('debtEuros') };

test('builds the 2015–2025 deficit and debt series for Spain and the EU from real Eurostat data', () => {
  const { series } = buildContext(responses);
  assert.equal(series[0].year, 2015);
  const last = series.at(-1);
  assert.equal(last.year, 2025);
  assert.deepEqual(last.spain, { revenue: 42.9, spending: 45.3, balance: -2.4, debt: 100.5 });
  assert.equal(last.eu.debt, 81.5);
});

test('spending by function as % of GDP compares Spain with the EU-27', () => {
  const { functions } = buildContext(responses);
  assert.equal(functions.year, 2024);
  assert.deepEqual(functions.items.find(item => item.code === 'GF07'), { code: 'GF07', spain: 6.5, eu: 7.3 });
});

test('the balances of the four levels of government add up to the total', () => {
  const { levels } = buildContext(responses);
  assert.equal(levels.year, 2025);
  assert.equal(levels.items.reduce((sum, level) => sum + level.balance, 0), levels.total.balance);
  assert.equal(levels.items.find(level => level.id === 'local').balance, 5484);
});

test('rejects data where a level balance no longer adds up', () => {
  const broken = structuredClone(responses.levels);
  const keys = Object.keys(broken.value);
  const rows = jsonStatRows(broken);
  const index = rows.findIndex(row => row.sector === 'S1313' && row.na_item === 'B9' && row.time === '2025');
  broken.value[keys[index]] += 1000;
  assert.throws(() => buildContext({ ...responses, levels: broken }), /saldos de cada nivel suman/);
});

test('the average interest rate is interest paid over the previous year-end debt', () => {
  const { interestRate } = buildContext(responses);
  assert.equal(interestRate.year, 2025);
  assert.equal(interestRate.interestMillions, 40432);
  assert.equal(interestRate.rate, 2.49);
});
