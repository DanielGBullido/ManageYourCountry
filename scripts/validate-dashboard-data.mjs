import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchesCommonReferenceMonth } from './lib/monthly-period.mjs';

const readJson = async path => JSON.parse(await readFile(new URL(`../data/${path}`, import.meta.url), 'utf8'));
const [monthly, benefits, people, regions, taxes, services, provenance] = await Promise.all([
  readJson('igae-latest.json'),
  readJson('prestaciones-latest.json'),
  readJson('personas-trabajo-latest.json'),
  readJson('comunidades-autonomicas.json'),
  readJson('recaudacion-tributaria-2025.json'),
  readJson('gasto-funcional-2024.json'),
  readJson('provenance/igae-latest.json'),
]);
const dashboardPeriods = await readJson('dashboard-periods.json');
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
for (const [key, snapshot] of archivedPeriods) {
  assert.equal(snapshot.period, key, `La clave del archivo ${key} debe coincidir con su periodo`);
  const commonSources = [snapshot.taxes.latestMonthly.period, ...snapshot.benefits.items.map(item => item.period), snapshot.regions.igaeMonthly.period];
  assert.ok(matchesCommonReferenceMonth(snapshot.monthly.referencePeriod, commonSources), `El panel ${key} mezcla meses o no tiene series mensuales coincidentes`);
  near(sum(snapshot.monthly.revenue.map(item => item.amount)), snapshot.monthly.revenueTotal, 0.01, `Ingresos IGAE archivados ${key}`);
  near(sum(snapshot.monthly.expenditure.map(item => item.amount)), snapshot.monthly.expenditureTotal, 0.01, `Gastos IGAE archivados ${key}`);
}
assert.equal(archivedPeriods[0][1].period, monthly.referencePeriod, 'El mes más reciente del selector debe ser la fotografía oficial vigente');
console.log(`Validación de datos correcta: sumas, fuentes y periodos; ${archivedPeriods.length} panel(es) mensual(es) completos disponibles.`);
