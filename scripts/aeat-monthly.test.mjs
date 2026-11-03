import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findLatestAeatReport, listAeatReports } from './lib/aeat-catalog.mjs';
import { parseAeatMonthlyReport } from './lib/aeat-pdf-parser.mjs';

// Extracto literal (pdftotext -layout) del informe oficial IMR_26_08_es_es.pdf:
// Cuadro 1.1 (mes) y fila total del Cuadro 1.3. Se omiten las filas de detalle intermedias.
const august = readFileSync(new URL('./fixtures/aeat/IMR_26_08_extracto.txt', import.meta.url), 'utf8');
const period = { year: 2026, month: 8 };

test('reads the net monthly tax revenue from Cuadro 1.1 and cross-checks Cuadro 1.3', () => {
  const amounts = parseAeatMonthlyReport(august, period);
  assert.equal(amounts.amountMillions, 29451);
  assert.equal(amounts.amountThousands, 29451002);
  assert.equal(amounts.stateMillions, 19882);
  assert.equal(amounts.territorialMillions, 9569);
  assert.equal(amounts.previousYearMillions, 27497);
  assert.deepEqual(amounts.chapters, { direct: 20020, indirect: 9232, feesAndOther: 199 });
});

test('refuses a report whose title is for another month', () => {
  assert.throws(() => parseAeatMonthlyReport(august, { year: 2026, month: 9 }), /no a SEPTIEMBRE 2026/);
});

test('refuses figures that do not reconcile between tables', () => {
  assert.throws(() => parseAeatMonthlyReport(august.replace('29.451.002', '29.551.002'), period), /no coinciden|no coincide/);
  assert.throws(() => parseAeatMonthlyReport(august.replace('CAP. II - IMPUESTOS INDIRECTOS                      4.451              4.780             9.232', 'CAP. II - IMPUESTOS INDIRECTOS                      4.451              4.780             9.932'), period), /capítulos/);
});

test('fails closed if the layout changes or a row is missing', () => {
  assert.throws(() => parseAeatMonthlyReport('sin tabla', period), /no parece un Informe/);
  assert.throws(() => parseAeatMonthlyReport(august.replace('TOTAL GENERAL', 'TOTAL'), period), /TOTAL GENERAL/);
  assert.throws(() => parseAeatMonthlyReport(august.replace('(En millones de euros)', '(En miles de euros)'), period), /millones de euros/);
});

test('lists AEAT monthly reports from the official catalog, newest first', () => {
  const html = `
    <a href="/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_mensuales_recaudacion_tributaria/2026/IMR_26_08_es_es.pdf">Informe de Agosto</a>
    <a href="/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_mensuales_recaudacion_tributaria/2026/IMR_26_09_es_es.pdf">Informe de Septiembre</a>
    <a href="/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_mensuales_recaudacion_tributaria/2025/IMR_25_12_gl_es.pdf">Galego</a>
    <a href="/static_files/Sede/Tema/Estadisticas/Recaudacion_Tributaria/Informes_mensuales/Calendario_es_es.pdf">Calendario</a>`;
  const reports = listAeatReports(html);
  assert.deepEqual(reports.map(report => report.period), ['2026-09', '2026-08']);
  const latest = findLatestAeatReport(html);
  assert.equal(latest.url, 'https://sede.agenciatributaria.gob.es/static_files/AEAT/Estudios/Estadisticas/Informes_Estadisticos/Informes_mensuales_recaudacion_tributaria/2026/IMR_26_09_es_es.pdf');
  assert.throws(() => findLatestAeatReport('<a href="otro.pdf">x</a>'), /No se encontró/);
});

test('rewrites only one top-level JSON value and keeps the rest of the file byte for byte', async () => {
  const { replaceTopLevelValue } = await import('./lib/json-top-level.mjs');
  const original = '{\n  "items": [\n    { "id": "a", "amount": 1 }\n  ],\n  "latestMonthly": {\n    "period": "Agosto 2026",\n    "note": "con \\"comillas\\" y {llaves}"\n  }\n}\n';
  const updated = replaceTopLevelValue(original, 'latestMonthly', { period: 'Septiembre 2026', amountMillions: 18049 });
  assert.ok(updated.startsWith('{\n  "items": [\n    { "id": "a", "amount": 1 }\n  ],\n  "latestMonthly": {\n    "period": "Septiembre 2026",'));
  assert.deepEqual(JSON.parse(updated).latestMonthly, { period: 'Septiembre 2026', amountMillions: 18049 });
  assert.throws(() => replaceTopLevelValue(original, 'missing', {}), /No se encontró/);
});
