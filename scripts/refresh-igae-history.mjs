import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { buildHistory, parseConsolidatedWorkbook } from './lib/igae-consolidated.mjs';

// Descarga los libros oficiales M_CONSOLIDADO_AAAA.xlsx de la IGAE del año del
// panel y de los dos anteriores, guarda una copia en data/sources/igae/ y escribe
// data/igae-monthly-history-AAAA.json con los flujos de cada mes. Así el selector
// ofrece meses de años anteriores y se puede comparar con el mismo mes del año previo.
// Uso: node scripts/refresh-igae-history.mjs [--offline]  (offline: solo relee las copias locales)

const root = new URL('../', import.meta.url);
const catalogUrl = 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/DatosConsolidadosSeries.aspx';
const workbookUrl = year => `https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP-M/M_CONSOLIDADO_${year}.xlsx`;
const headers = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };
const offline = process.argv.includes('--offline');

const latest = JSON.parse(await readFile(new URL('data/igae-latest.json', root), 'utf8'));
const panelYear = Number(latest.referencePeriod.slice(0, 4));
const { revenue, expenditure, ...rest } = latest;
const template = { ...rest, revenue: revenue.map(({ amount, ...item }) => item), expenditure: expenditure.map(({ amount, ...item }) => item) };

for (const year of [panelYear - 2, panelYear - 1, panelYear]) {
  const sourcePath = new URL(`data/sources/igae/M_CONSOLIDADO_${year}.xlsx`, root);
  let buffer;
  if (offline) buffer = await readFile(sourcePath);
  else {
    const response = await fetch(workbookUrl(year), { headers, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Error HTTP ${response.status} al descargar ${workbookUrl(year)}`);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  const parsed = parseConsolidatedWorkbook(buffer);
  if (parsed.year !== year) throw new Error(`El libro de ${year} dice ser de ${parsed.year}`);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const historyPath = new URL(`data/igae-monthly-history-${year}.json`, root);
  const previous = await readFile(historyPath, 'utf8').then(JSON.parse).catch(() => null);
  const unchanged = previous?.months?.[0]?.provenance?.sha256 === sha256;
  const retrievedAt = unchanged ? previous.retrievedAt : new Date().toISOString().slice(0, 10);
  if (!unchanged && !offline) await writeFile(sourcePath, buffer);
  const provenanceBase = {
    sourceUrl: workbookUrl(year), catalogUrl, sourceFile: `M_CONSOLIDADO_${year}.xlsx`, sourceSheet: 'Tabla1a',
    verifiedAt: retrievedAt, sourceUpdatedAt: parsed.updatedAt, sha256,
    parser: 'igae-consolidated@1: flujos mensuales calculados como diferencias de acumulados',
    method: 'Acumulado del mes menos acumulado del mes anterior; enero usa su acumulado. Importes en millones de euros.',
  };
  const output = {
    series: 'Operaciones no financieras consolidadas de las Administraciones Públicas',
    year,
    provisional: parsed.provisional,
    sourceFile: `M_CONSOLIDADO_${year}.xlsx`, sourceSheet: 'Tabla1a', sourceUrl: workbookUrl(year), catalogUrl,
    updatedAt: parsed.updatedAt, retrievedAt,
    scope: 'Administración central, Administración regional y Fondos de Seguridad Social; excluye Administración local',
    unit: 'millones de euros',
    periodType: 'Flujos mensuales derivados de datos acumulados',
    method: 'El fichero oficial presenta importes acumulados. Para obtener el flujo de cada mes se resta el acumulado del mes previo; enero es igual a su acumulado.',
    months: buildHistory(parsed, template, provenanceBase),
  };
  await writeFile(historyPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`IGAE ${year}${parsed.provisional ? ' (provisional)' : ''}: ${parsed.months.length} meses · actualizado ${parsed.updatedAt}${unchanged ? ' · sin cambios' : ''}`);
}
