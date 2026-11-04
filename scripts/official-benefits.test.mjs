import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findPensionSeriesWorkbook, parsePensionSeriesWorkbook } from './lib/seguridad-social-pensions.mjs';
import { findPncWorkbook, parsePncWorkbook } from './lib/imserso-pnc.mjs';
import { findImvPayrollWorkbook, listImvArticles, parseImvPayrollWorkbook } from './lib/inss-imv.mjs';
import { averageSpendingPerBeneficiary, listPrdWorkbooks, parsePrdWorkbook } from './lib/prd-unemployment.mjs';
import { readXlsx } from './lib/xlsx-reader.mjs';

// Ficheros oficiales tal cual se descargaron el 4 de noviembre de 2026 (sus
// SHA-256 coinciden con data/provenance/*-latest.json). Las cifras esperadas de
// agosto de 2026 son las que se habían copiado a mano de las notas oficiales.
const fixture = path => readFileSync(new URL(`./fixtures/${path}`, import.meta.url));

test('xlsx reader opens official workbooks without dependencies', () => {
  const workbook = readXlsx(fixture('seguridad-social/S202610.xlsx'));
  assert.ok(workbook.sheetNames.includes('S_Total'));
  assert.equal(workbook.sheet('S_Total')[1][0], 'TOTAL SISTEMA');
  assert.throws(() => readXlsx(Buffer.from('%PDF-1.7')), /no es un libro Excel/);
});

test('Seguridad Social: finds the newest «Series de pensiones en vigor» workbook', () => {
  const html = `
    <a href="/wps/wcm/connect/wss/b6b25f6d-bc19-4936-a8a0-14fad7944d01/MIN202610.xlsx?MOD=AJPERES&amp;CONVERT_TO=linktext&amp;CACHEID=ROOTWORKSPACE.Z18-q6bpX77">
    <a href="/wps/wcm/connect/wss/85c56f05-1d11-4a4b-974f-14c4e5386427/S202610.xlsx?MOD=AJPERES&amp;CONVERT_TO=linktext&amp;CACHEID=ROOTWORKSPACE.Z18-q6bpX6F">`;
  assert.deepEqual(findPensionSeriesWorkbook(html), {
    publication: '2026-10',
    url: 'https://www.seg-social.es/wps/wcm/connect/wss/85c56f05-1d11-4a4b-974f-14c4e5386427/S202610.xlsx?MOD=AJPERES',
  });
  assert.throws(() => findPensionSeriesWorkbook('<a href="/REG202610.xlsx">'), /Series de pensiones/);
});

test('Seguridad Social: reads every monthly payroll of the year with its breakdown', () => {
  const months = parsePensionSeriesWorkbook(fixture('seguridad-social/S202610.xlsx'));
  assert.deepEqual(months.map(item => item.period), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  const august = months.find(item => item.period === '2026-08').values;
  assert.equal(august.total.pensions, 10_535_869);
  assert.equal(Math.round(august.total.amountThousands / 100) / 10, 14470.4);
  assert.equal(Math.round(august.total.averageEuros * 100) / 100, 1373.44);
  assert.equal(Math.round(august.retirement.averageEuros * 10) / 10, 1574.9);
  assert.deepEqual(
    ['retirement', 'widowhood', 'permanentDisability', 'orphanhood', 'family'].map(key => Math.round(august[key].amountThousands / 100) / 10),
    [10626, 2288.6, 1331.4, 185.7, 38.7],
  );
});

test('Imserso: finds evolpncs.xlsx and reads non-contributory pensions by month', () => {
  assert.equal(
    findPncWorkbook('<a href="/documents/20123/121856/evolpncs.pdf/93643b36"></a><a href="/documents/20123/121856/evolpncs.xlsx/706b8f90-698b-6b77-941d-8f7f6d3938c6">'),
    'https://imserso.es/documents/20123/121856/evolpncs.xlsx/706b8f90-698b-6b77-941d-8f7f6d3938c6',
  );
  const months = parsePncWorkbook(fixture('imserso/evolpncs.xlsx'));
  assert.equal(months.at(-1).period, '2026-09');
  assert.equal(months.length, 9, 'octubre a diciembre aún están a cero y no se leen');
  const august = months.find(item => item.period === '2026-08').values;
  assert.deepEqual(august.total, { pensions: 470_207, amountEuros: 305_659_701.01 });
  assert.deepEqual(august.retirement, { pensions: 305_867, amountEuros: 191_152_806.85 });
  assert.deepEqual(august.disability, { pensions: 164_340, amountEuros: 114_506_894.16 });
  assert.equal(august.includesExtraPay, false);
  assert.equal(months.find(item => item.period === '2026-06').values.includesExtraPay, true);
  assert.equal(months.find(item => item.period === '2026-02').values.includesExtraPay, false, '«FEBRERO**» es una nota de corrección, no paga extra');
});

test('INSS: finds the monthly IMV payroll workbook through the official magazine', () => {
  const section = `
    <a href="https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-protege-en-agosto-a-m%C3%A1s-de-2-7-millones-de-personas-residentes-en-894.000-hogares">
    <a href="https://revista.seg-social.es/-/ejecucion-presupuestaria-septiembre-2026">
    <a href="http://www.facebook.com/sharer.php?u=https%3A%2F%2Frevista.seg-social.es%2F-%2Fel-ingreso-m%25C3%25ADnimo-vital">`;
  assert.deepEqual(listImvArticles(section), ['https://revista.seg-social.es/-/el-ingreso-m%C3%ADnimo-vital-protege-en-agosto-a-m%C3%A1s-de-2-7-millones-de-personas-residentes-en-894.000-hogares']);
  const article = `
    <a href="/documents/39386/0/202608+COMPLETO+Dossier+comunidad+aut%C3%B3noma+y+provincia.xlsx/11998020-b5c9-314e-dc11-7d1c6c78974a?t=1788846979404">
    <a href="/documents/39386/0/202608_IMV+-+N%C3%B3mina.xlsx/42e5ea71-d2c8-6095-a115-ffe11a8b0eb7?t=1788847007078">`;
  assert.deepEqual(findImvPayrollWorkbook(article, 'https://revista.seg-social.es/-/nota'), {
    period: '2026-08',
    url: 'https://revista.seg-social.es/documents/39386/0/202608_IMV+-+N%C3%B3mina.xlsx/42e5ea71-d2c8-6095-a115-ffe11a8b0eb7?t=1788847007078',
  });
});

test('INSS: reads and cross-checks the IMV payroll totals', () => {
  const august = parseImvPayrollWorkbook(fixture('inss-imv/202608_IMV-Nomina.xlsx'), '2026-08');
  assert.equal(august.households, 893_820);
  assert.equal(august.beneficiaries, 2_725_899);
  assert.equal(august.capiHouseholds, 623_347);
  assert.equal(august.amountEuros, 474_653_073.46);
  assert.equal(Math.round(august.averagePerHousehold * 10) / 10, 502.8);
  assert.throws(() => parseImvPayrollWorkbook(fixture('inss-imv/202608_IMV-Nomina.xlsx'), '2026-09'), /no de septiembre 2026/);
});

test('Trabajo · SEPE: lists PRD workbooks and skips the variants without RDL 2/2024', () => {
  const html = `
    <a href="https://www.mites.gob.es/estadisticas/PRD/prd25_abr/prd_04_25_sin_RDL_2_2024.xlsx">
    <a href="https://www.mites.gob.es/estadisticas/PRD/prd26_ago/prd_08_26.xlsx" title="Documento en formato Excel">Agosto 2026</a>
    <a href="https://www.mites.gob.es/estadisticas/PRD/prd26_sep/prd_09_26.xlsx">
    <a href="https://www.mites.gob.es/estadisticas/PRD/Prd15-Abr/PRD_04_15.xls">`;
  assert.deepEqual(listPrdWorkbooks(html).map(item => item.publication), ['2026-09', '2026-08']);
});

test('Trabajo · SEPE: a month is complete only when both beneficiaries and spending are published', () => {
  const months = parsePrdWorkbook(fixture('trabajo-prd/prd_09_26.xlsx'));
  assert.equal(months.at(-1).period, '2026-08', 'el libro de septiembre trae beneficiarios de septiembre pero gasto solo hasta agosto');
  assert.equal(months[0].period, '2025-01');
  const august = months.find(item => item.period === '2026-08').values;
  assert.equal(august.beneficiaries.total, 1_896_142);
  assert.equal(august.spendingThousands.total, 2_242_129.14);
  assert.equal(Math.round(august.coverageRate * 100) / 100, 87.12);
  assert.equal(Math.round(averageSpendingPerBeneficiary(august) * 10) / 10, 1203.1);
});
