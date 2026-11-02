import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesCommonReferenceMonth, toYearMonth } from './lib/monthly-period.mjs';

test('normalizes Spanish month labels and machine periods', () => {
  assert.equal(toYearMonth('Agosto de 2026'), '2026-08');
  assert.equal(toYearMonth('Setiembre 2026'), '2026-09');
  assert.equal(toYearMonth('2026-08'), '2026-08');
  assert.equal(toYearMonth('periodo desconocido'), null);
});

test('refreshes only when every panel series has the same reference month', () => {
  assert.equal(matchesCommonReferenceMonth('2026-08', ['Agosto 2026', 'Agosto de 2026']), true);
  assert.equal(matchesCommonReferenceMonth('2026-09', ['Agosto 2026', 'Agosto 2026']), false);
  assert.equal(matchesCommonReferenceMonth('2026-09', ['Septiembre 2026', 'Agosto 2026']), false);
  assert.equal(matchesCommonReferenceMonth('2026-09', []), false);
});
