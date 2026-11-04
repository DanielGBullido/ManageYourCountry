import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { buildContext, contextUrls } from './lib/eurostat.mjs';

// «España en contexto»: evolución del déficit, los ingresos, el gasto y la deuda
// en % del PIB frente a la UE-27; gasto por funciones frente a la UE; y saldo de
// cada nivel de administración (Estado, comunidades, ayuntamientos y Seguridad
// Social). Todo procede de Eurostat (datos notificados por España).

const FROM_YEAR = 2015;
const headers = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };
const urls = contextUrls(FROM_YEAR);

const responses = {};
const provenance = { retrievedAt: new Date().toISOString(), datasets: {} };
for (const [name, url] of Object.entries(urls)) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  const text = await response.text();
  responses[name] = JSON.parse(text);
  provenance.datasets[name] = { url, updated: responses[name].updated, sha256: createHash('sha256').update(text).digest('hex') };
}

const context = buildContext(responses);
const output = {
  title: 'España en contexto',
  source: 'Eurostat · Government finance statistics (gov_10a_main, gov_10dd_edpt1, gov_10a_exp)',
  sourceUrl: 'https://ec.europa.eu/eurostat/web/government-finance-statistics/database',
  scope: 'Total de las Administraciones públicas (sector S13), incluidas las corporaciones locales. UE-27: agregado de los 27 Estados miembros.',
  unit: 'Porcentaje del PIB, salvo el saldo por nivel de administración (millones de euros)',
  ...context,
  provenance,
};
// Keep the previous download time when every dataset is byte-for-byte the same,
// so the weekly workflow only commits real changes.
const path = new URL('../data/contexto-eurostat.json', import.meta.url);
const previous = await readFile(path, 'utf8').then(JSON.parse).catch(() => null);
const sameData = previous?.provenance?.datasets && Object.entries(provenance.datasets).every(([name, dataset]) => previous.provenance.datasets[name]?.sha256 === dataset.sha256);
if (sameData) output.provenance.retrievedAt = previous.provenance.retrievedAt;
await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
const last = context.series.at(-1);
console.log(`Eurostat contexto: ${context.series[0].year}–${last.year}; España ${last.year}: saldo ${last.spain.balance} % y deuda ${last.spain.debt} % del PIB; funciones ${context.functions.year}; niveles ${context.levels.year}.`);
