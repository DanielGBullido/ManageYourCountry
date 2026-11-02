import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { matchesCommonReferenceMonth } from './lib/monthly-period.mjs';

const readJson = async path => JSON.parse(await readFile(new URL(`../data/${path}`, import.meta.url), 'utf8'));
const [monthly, benefits, people, regions, taxes, services, provenance, localHistory, publicDebtHistory] = await Promise.all([
  readJson('igae-latest.json'),
  readJson('prestaciones-latest.json'),
  readJson('personas-trabajo-latest.json'),
  readJson('comunidades-autonomicas.json'),
  readJson('recaudacion-tributaria-2025.json'),
  readJson('gasto-funcional-2024.json'),
  readJson('provenance/igae-latest.json'),
  readJson('igae-monthly-history-2026.json'),
  readJson('public-debt-history-2026.json'),
]);
const dashboardPeriods = await readJson('dashboard-periods.json');
const sourceWorkbook = await readFile(new URL('../data/sources/igae/M_CONSOLIDADO_2026.xlsx', import.meta.url));
const workbookHash = createHash('sha256').update(sourceWorkbook).digest('hex');
const sum = values => values.reduce((total, value) => total + value, 0);
const near = (actual, expected, tolerance, description) => assert.ok(Math.abs(actual - expected) <= tolerance, `${description}: ${actual} != ${expected} (tolerancia ${tolerance})`);
const unique = (items, getKey, description) => assert.equal(new Set(items.map(getKey)).size, items.length, `${description} contiene identificadores duplicados`);

near(sum(monthly.revenue.map(item => item.amount)), monthly.revenueTotal, 0.01, 'Ingresos IGAE');
near(sum(monthly.expenditure.map(item => item.amount)), monthly.expenditureTotal, 0.01, 'Gastos IGAE');
near(monthly.revenueTotal - monthly.expenditureTotal, monthly.financingBalance, 0.01, 'Saldo IGAE');
unique(monthly.revenue, item => item.id, 'Ingresos IGAE');
unique(monthly.expenditure, item => item.id, 'Gastos IGAE');
for (const line of monthly.expenditure) {
  for (const source of line.relatedSources ?? []) {
    assert.ok(source.label && (source.href.startsWith('https://') || source.href.startsWith('#')), `Enlace relacionado no válido en ${line.id}`);
  }
}
unique(regions.communities, item => item.name, 'Comunidades autónomas');
assert.equal(regions.communities.length, 17, 'Se esperan 17 comunidades autónomas');
assert.ok(monthly.sourceUrl.startsWith('https://') && benefits.items.every(item => item.sourceUrl.startsWith('https://')), 'Las fuentes deben enlazar a HTTPS');
assert.equal(provenance.referencePeriod, monthly.referencePeriod, 'La versión registrada debe corresponder al dato mensual mostrado');
assert.equal(provenance.sourceUrl, monthly.sourceUrl, 'El PDF registrado debe ser el que se muestra como fuente');
assert.ok(publicDebtHistory.sourceUrl.startsWith('https://') && publicDebtHistory.catalogUrl.startsWith('https://') && publicDebtHistory.apiUrl.startsWith('https://'), 'La deuda debe conservar enlaces oficiales');
assert.equal(publicDebtHistory.seriesCode, 'DMNPDE2010_P00000_PS_APU', 'La serie debe ser la deuda PDE total consolidada de las AAPP');
assert.ok(publicDebtHistory.previousMonth?.referencePeriod === '2025-12' && publicDebtHistory.previousMonth.amountMillions > 0, 'Falta el saldo previo para calcular la variación de enero');
unique(publicDebtHistory.months, item => item.referencePeriod, 'Meses de deuda pública');
assert.equal(publicDebtHistory.months.length, localHistory.months.length, 'La deuda y el selector IGAE deben cubrir los mismos meses');
for (const period of localHistory.months.map(item => item.period)) {
  const debt = publicDebtHistory.months.find(item => item.referencePeriod === period);
  assert.ok(debt && debt.periodLabel && debt.amountMillions > 0, `Falta el dato de deuda para ${period}`);
  assert.equal(dashboardPeriods[period].monthly.referencePeriod, debt.referencePeriod, `La tarjeta de deuda debe seguir el mes seleccionado (${period})`);
}
near(publicDebtHistory.months.at(-1).amountMillions, 1749584.760, 0.001, 'Deuda PDE total de agosto de 2026 (M€)');

near(people.labour.employed + people.labour.unemployed, people.labour.active, 1, 'Ocupadas + paradas = activas');
near(people.labour.active + people.labour.inactive, people.labour.population16Plus, 1, 'Activas + inactivas = población EPA de 16 años o más');
near(sum(people.labour.inactiveReasons.map(item => item.people)), people.labour.inactive, 1, 'Desglose de inactividad');

const benefitPeriods = new Set(benefits.items.map(item => item.period));
assert.equal(benefitPeriods.size, 1, 'Las prestaciones resumidas deben compartir periodo');
const normalizedPeriod = period => period.toLocaleLowerCase('es').replace(/\s+de\s+/g, ' ').replace(/\s+/g, ' ').trim();
assert.equal(normalizedPeriod([...benefitPeriods][0]), normalizedPeriod(monthly.periodLabel), 'El simulador y las cuatro prestaciones deben usar el mismo mes de referencia');
assert.equal(normalizedPeriod(taxes.latestMonthly.period), normalizedPeriod(monthly.periodLabel), 'La AEAT mensual y el simulador deben usar el mismo mes de referencia');
const contributory = benefits.items.find(item => item.id === 'pensions');
if (contributory?.details?.length) near(sum(contributory.details.map(item => item.amountMillions)), contributory.amountMillions, 0.11, 'Desglose de pensiones contributivas (redondeo oficial a 0,1 M€)');
const nonContributory = benefits.items.find(item => item.id === 'non-contributory-pensions');
if (nonContributory?.details?.length) near(sum(nonContributory.details.map(item => item.amountMillions)), nonContributory.amountMillions, 0.01, 'Desglose de pensiones no contributivas');

unique(taxes.items, item => item.id, 'Grupos de recaudación tributaria');
unique(services.items, item => item.id, 'Funciones COFOG');
assert.ok(taxes.latestMonthly.period && taxes.latestMonthly.sourceUrl, 'Falta la referencia del dato mensual AEAT');
const archivedPeriods = Object.entries(dashboardPeriods);
assert.ok(archivedPeriods.length > 0, 'El selector necesita al menos un mes completo archivado');
assert.ok(localHistory.months.length > 0, 'Falta el histórico local de la serie IGAE');
unique(localHistory.months, item => item.period, 'Meses del histórico IGAE');
for (const item of localHistory.months) {
  assert.equal(item.monthly.referencePeriod, item.period, `El mes IGAE ${item.period} debe coincidir con su clave`);
  assert.equal(item.monthly.periodType, 'Flujo del mes, calculado como diferencia entre acumulados del mes y del mes anterior', `Debe explicarse el cálculo del flujo mensual ${item.period}`);
  assert.ok(item.monthly.sourceUrl.endsWith('/M_CONSOLIDADO_2026.xlsx'), `Falta el Excel IGAE de origen ${item.period}`);
  assert.equal(item.provenance.sha256, workbookHash, `La huella del Excel no coincide con el archivo local (${item.period})`);
  near(sum(item.monthly.revenue.map(line => line.amount)), item.monthly.revenueTotal, 0.01, `Ingresos del histórico IGAE ${item.period}`);
  near(sum(item.monthly.expenditure.map(line => line.amount)), item.monthly.expenditureTotal, 0.01, `Gastos del histórico IGAE ${item.period}`);
  near(item.monthly.revenueTotal - item.monthly.expenditureTotal, item.monthly.financingBalance, 0.01, `Saldo del histórico IGAE ${item.period}`);
}
for (const [key, snapshot] of archivedPeriods) {
  assert.equal(snapshot.period, key, `La clave del archivo ${key} debe coincidir con su periodo`);
  assert.ok(snapshot.taxes.latestMonthly.period && snapshot.benefits.items.every(item => item.period) && snapshot.regions.igaeMonthly.period, `El panel ${key} debe conservar la fecha propia de sus series auxiliares`);
  assert.ok(snapshot.monthly.sourceUrl && snapshot.monthly.periodLabel, `El panel ${key} debe incluir fuente y fecha de las cuentas mensuales`);
  near(sum(snapshot.monthly.revenue.map(item => item.amount)), snapshot.monthly.revenueTotal, 0.01, `Ingresos IGAE archivados ${key}`);
  near(sum(snapshot.monthly.expenditure.map(item => item.amount)), snapshot.monthly.expenditureTotal, 0.01, `Gastos IGAE archivados ${key}`);
}
assert.equal(archivedPeriods[0][1].period, monthly.referencePeriod, 'El mes más reciente del selector debe ser la fotografía oficial vigente');
console.log(`Validación de datos correcta: sumas, fuentes y periodos; ${archivedPeriods.length} meses IGAE disponibles. Las series auxiliares conservan sus fechas publicadas.`);
