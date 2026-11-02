import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeScenario, encodeScenario, getUnallocatedBudget, setBudgetLineAmount } from '../app/lib/budget-scenario.ts';

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
