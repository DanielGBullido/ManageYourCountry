import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAnnualAccounts, jsonStatValues } from './lib/eurostat.mjs';

const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const main = await load('./fixtures/eurostat/gov_10a_main_ES_2024.json');
const cofog = await load('./fixtures/eurostat/gov_10a_exp_ES_2024.json');
const functional = await load('../data/gasto-funcional-2024.json');

test('reads general-government revenue and spending from the real Eurostat 2024 release', () => {
  const accounts = buildAnnualAccounts(main, cofog, functional);
  assert.equal(accounts.revenueTotal, 674315);
  assert.equal(accounts.revenue.taxes, 177234 + 198697 + 5735);
  assert.equal(accounts.revenue.contributions, 210294);
  assert.equal(accounts.revenue.taxes + accounts.revenue.contributions + accounts.revenue.other, accounts.revenueTotal);
  assert.equal(accounts.cofogTotal, 725001);
  assert.equal(accounts.financingBalanceRevised, -50807);
  assert.equal(accounts.revisionGap, 121);
});

test('reads one dimension of a JSON-stat dataset', () => {
  const functions = jsonStatValues(cofog, 'cofog99');
  assert.equal(functions.GF07, 102942);
  assert.equal(functions.GF10, 297532);
});

test('refuses to run if the project COFOG file no longer matches Eurostat', () => {
  const stale = { ...functional, items: functional.items.map((item, index) => index === 6 ? { ...item, amount: item.amount + 500 } : item) };
  assert.throws(() => buildAnnualAccounts(main, cofog, stale), /no coincide con la última publicación COFOG/);
});
