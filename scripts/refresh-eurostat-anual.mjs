import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { buildAnnualAccounts, cofogUrl, jsonStatValues, mainUrl, populationUrl } from './lib/eurostat.mjs';

// Descarga de Eurostat los ingresos anuales de las Administraciones públicas
// (sector S13, incluye ayuntamientos) del mismo año que la clasificación por
// funciones de data/gasto-funcional-2024.json y los guarda en
// data/cuentas-anuales-aapp.json. El simulador «por funciones» usa esos ingresos
// como tope y las funciones COFOG como partidas.

const root = new URL('../', import.meta.url);
const headers = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));

async function fetchJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  const text = await response.text();
  return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
}

const functional = await readJson('data/gasto-funcional-2024.json');
const year = Number(String(functional.period).match(/\d{4}/)?.[0]);
if (!year) throw new Error(`No se reconoce el año de data/gasto-funcional-2024.json: ${functional.period}`);

const [main, cofog, population] = await Promise.all([fetchJson(mainUrl('ES', year)), fetchJson(cofogUrl('ES', year)), fetchJson(populationUrl('ES', year))]);
const averagePopulation = jsonStatValues(population.json, 'geo').ES;
if (!(averagePopulation > 40_000_000 && averagePopulation < 60_000_000)) throw new Error(`Población media de ${year} fuera de rango: ${averagePopulation}`);
const accounts = buildAnnualAccounts(main.json, cofog.json, functional);

const output = {
  title: 'Cuentas anuales de las Administraciones públicas',
  year,
  scope: 'Total de las Administraciones públicas (sector S13): Administración central, comunidades autónomas, corporaciones locales y Seguridad Social, consolidado',
  accountingBasis: 'Contabilidad nacional · SEC 2010',
  unit: 'millones de euros',
  source: 'Eurostat · Government finance statistics (gov_10a_main, gov_10a_exp), datos notificados por España',
  sourceUrl: `https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=es`,
  ...accounts,
  population: { year, averagePeople: averagePopulation, source: 'Eurostat · demo_gind (población media del año)' },
  provenance: {
    mainUrl: mainUrl('ES', year),
    cofogUrl: cofogUrl('ES', year),
    populationUrl: populationUrl('ES', year),
    mainUpdated: main.json.updated,
    cofogUpdated: cofog.json.updated,
    mainSha256: main.sha256,
    cofogSha256: cofog.sha256,
    retrievedAt: new Date().toISOString(),
  },
};
// Keep the previous download time when Eurostat returned exactly the same data,
// so the weekly workflow only commits real changes.
const previous = await readJson('data/cuentas-anuales-aapp.json').catch(() => null);
const sameData = previous?.provenance && ['mainSha256', 'cofogSha256'].every(key => previous.provenance[key] === output.provenance[key])
  && previous.population?.averagePeople === output.population.averagePeople;
if (sameData) output.provenance.retrievedAt = previous.provenance.retrievedAt;
await writeFile(new URL('data/cuentas-anuales-aapp.json', root), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Eurostat ${year}: ingresos ${accounts.revenueTotal} M€, gasto por funciones ${accounts.cofogTotal} M€, gasto revisado ${accounts.expenditureTotalRevised} M€ (diferencia ${accounts.revisionGap} M€).`);
