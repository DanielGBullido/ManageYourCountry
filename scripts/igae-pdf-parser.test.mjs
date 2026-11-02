import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIgaeMonthlyPdfPage } from './lib/igae-pdf-parser.mjs';

const officialPage = `
Recursos no financieros 55.067 56.335 2,3 425.053 461.898 8,7
Impuestos 30.863 31.441 1,9
Cotizaciones sociales 18.599 19.537 5,0
Transferencias entre AAPP 1.262 1.289 2,1
Resto de recursos 4.343 4.068 -6,3
Empleos no financieros 51.902 55.019 6,0
Consumos intermedios 4.379 4.837 10,5
Remuneración de asalariados 11.308 12.075 6,8
Intereses 3.516 3.348 -4,8
Subvenciones 931 838 -10,0
Prestaciones sociales distintas de las
transferencias en especie 21.031 22.435 6,7
Transferencias sociales en especie:
producción adquirida en el mercado 3.194 3.286 2,9
Formación bruta de capital fijo 3.007 3.039 1,1
Transferencias entre AAPP 2.950 2.676 -9,3
Resto de empleos 1.586 2.485 56,7
Capacidad (+) o necesidad (-)
de financiación 3.165 1.316 -58,4`;

test('reads the current-month column and independently reconciles the IGAE totals', () => {
  const amounts = parseIgaeMonthlyPdfPage(officialPage);
  assert.equal(amounts.revenueTotal, 56335);
  assert.equal(amounts.expenditureTotal, 55019);
  assert.equal(amounts.financingBalance, 1316);
  assert.equal(amounts.transfersIn, 1289);
  assert.equal(amounts.transfersOut, 2676);
});

test('rejects a page whose component rows do not add up to the published totals', () => {
  assert.throws(() => parseIgaeMonthlyPdfPage(officialPage.replace('Impuestos 30.863 31.441', 'Impuestos 30.863 31.439')), /ingresos desglosados/);
});

test('fails closed if the official report layout or a required row is missing', () => {
  assert.throws(() => parseIgaeMonthlyPdfPage('no hay tabla aquí'), /No se encontró la fila/);
});
