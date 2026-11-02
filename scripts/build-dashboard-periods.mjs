import { readFile, writeFile } from 'node:fs/promises';
import { matchesCommonReferenceMonth } from './lib/monthly-period.mjs';

const root = new URL('../data/', import.meta.url);
const load = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance] = await Promise.all([
  load('igae-latest.json'), load('prestaciones-latest.json'), load('personas-trabajo-latest.json'),
  load('perfiles-empleo-latest.json'), load('comunidades-autonomicas.json'), load('recaudacion-tributaria-2025.json'),
  load('gasto-funcional-2024.json'), load('demografia-nacionalidad-latest.json'), load('provenance/igae-latest.json'),
]);

const aligned = matchesCommonReferenceMonth(monthly.referencePeriod, [
  taxes.latestMonthly.period,
  ...benefits.items.map(item => item.period),
  regions.igaeMonthly.period,
]);
if (!aligned) throw new Error(`No se crea un mes de panel incompleto: IGAE ${monthly.referencePeriod}; AEAT ${taxes.latestMonthly.period}; prestaciones ${benefits.items.map(item => item.period).join(', ')}; comunidades ${regions.igaeMonthly.period}.`);

// El fichero de origen lleva nombres de columnas ligados al primer mes importado;
// los snapshots usan claves genéricas para que valgan para cualquier mes.
const monthlyRegions = {
  ...regions,
  communities: regions.communities.map(({ igaeAugustTax, igaeAugustRevenue, igaeAugustExpenditure, igaeAugustBalance, ...region }) => ({
    ...region,
    igaeMonthlyTax: igaeAugustTax,
    igaeMonthlyRevenue: igaeAugustRevenue,
    igaeMonthlyExpenditure: igaeAugustExpenditure,
    igaeMonthlyBalance: igaeAugustBalance,
  })),
};

const path = new URL('dashboard-periods.json', root);
let periods = {};
try { periods = JSON.parse(await readFile(path, 'utf8')); } catch {}
periods[monthly.referencePeriod] = {
  period: monthly.referencePeriod,
  label: monthly.periodLabel,
  monthly,
  benefits,
  people,
  jobs,
  regions: monthlyRegions,
  taxes,
  services,
  demographics,
  igaeProvenance,
};
const ordered = Object.fromEntries(Object.entries(periods).sort(([a], [b]) => b.localeCompare(a)));
await writeFile(path, `${JSON.stringify(ordered, null, 2)}\n`);
console.log(`Panel mensual disponible: ${monthly.periodLabel}. Meses completos archivados: ${Object.keys(ordered).length}.`);
