import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { parseIgaeMonthlyPdfPage } from './lib/igae-pdf-parser.mjs';
import { findLatestReport } from './lib/igae-catalog.mjs';
import { matchesCommonReferenceMonth } from './lib/monthly-period.mjs';

const root = new URL('../', import.meta.url);
const catalogUrl = 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/DatosConsolidados.aspx';
const requestHeaders = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };

async function fetchText(url) {
  const response = await fetch(url, { headers: requestHeaders, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  return response.text();
}

function labelPeriod(year, month) {
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `${monthLabel[0].toUpperCase()}${monthLabel.slice(1)} de ${year}`;
}

async function writeJson(relativePath, value) {
  const path = new URL(relativePath, root);
  await mkdir(new URL('.', path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const catalog = await fetchText(catalogUrl);
const report = findLatestReport(catalog);
const response = await fetch(report.url, { headers: requestHeaders, signal: AbortSignal.timeout(60_000) });
if (!response.ok) throw new Error(`No se pudo descargar el informe IGAE: HTTP ${response.status}`);
const pdf = Buffer.from(await response.arrayBuffer());
if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`La respuesta de ${report.url} no parece ser un PDF`);

const pdfPath = join(tmpdir(), `igae-${report.year}-${String(report.month).padStart(2, '0')}-${Date.now()}.pdf`);
await writeFile(pdfPath, pdf);
let tableText;
try {
  tableText = execFileSync('pdftotext', ['-f', '7', '-l', '7', '-layout', pdfPath, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  throw new Error(`No se pudo leer la página de la tabla mensual. Instala Poppler (pdftotext). ${error.message}`);
}

const amounts = parseIgaeMonthlyPdfPage(tableText);
const period = `${report.year}-${String(report.month).padStart(2, '0')}`;
const latestPath = new URL('data/igae-latest.json', root);
const current = JSON.parse(await readFile(latestPath, 'utf8'));
if (current.referencePeriod > period) throw new Error(`El catálogo devolvió ${period}, anterior al dato ya incorporado (${current.referencePeriod})`);
const taxes = JSON.parse(await readFile(new URL('data/recaudacion-tributaria-2025.json', root), 'utf8'));
const benefits = JSON.parse(await readFile(new URL('data/prestaciones-latest.json', root), 'utf8'));
const regions = JSON.parse(await readFile(new URL('data/comunidades-autonomicas.json', root), 'utf8'));
const alignedPeriods = [taxes.latestMonthly.period, ...benefits.items.map(item => item.period), regions.igaeMonthly.period];
if (!matchesCommonReferenceMonth(period, alignedPeriods)) {
  console.log(`IGAE publica ${period}, pero impuestos y prestaciones usan ${alignedPeriods.join(', ')}. Se conserva el mes común actual; no se mezclan periodos en el panel.`);
  process.exit(0);
}

const updated = {
  ...current,
  sourceUrl: report.url,
  catalogUrl,
  referencePeriod: period,
  periodLabel: labelPeriod(report.year, report.month),
  revenueTotal: amounts.revenueTotal,
  expenditureTotal: amounts.expenditureTotal,
  financingBalance: amounts.financingBalance,
  revenue: current.revenue.map(item => ({ ...item, amount: ({ taxes: amounts.taxes, contributions: amounts.contributions, transfers: amounts.transfersIn, other: amounts.otherRevenue })[item.id] ?? item.amount })),
  expenditure: current.expenditure.map(item => ({ ...item, amount: ({ intermediate: amounts.intermediate, wages: amounts.wages, interest: amounts.interest, subsidies: amounts.subsidies, benefits: amounts.benefits, in_kind: amounts.inKind, capital: amounts.capital, transfers_out: amounts.transfersOut, other_out: amounts.otherExpenditure })[item.id] ?? item.amount })),
  notes: [
    `Cifras extraídas automáticamente de la tabla del agregado publicada por la IGAE para ${labelPeriod(report.year, report.month)}, columna «En el mes».`,
    'El saldo es la diferencia entre recursos y empleos no financieros del mes.',
    'La clasificación de gasto es económica; no identifica programas concretos ni una cantidad mínima necesaria para prestar cada servicio.',
    'El escenario permite redistribuir el gasto oficial y dejar parte de los ingresos sin asignar.',
  ],
};
const descriptionIndex = updated.expenditure.findIndex(item => item.id === 'other_out');
if (descriptionIndex >= 0) updated.expenditure[descriptionIndex].description = 'Es la diferencia entre el total de empleos no financieros y la suma de las ocho partidas de gasto anteriores. No es un programa concreto. La tabla mensual consolidada no publica las operaciones que forman esta cifra por separado, así que no se puede atribuir a servicios concretos con esta fuente.';

const sha256 = createHash('sha256').update(pdf).digest('hex');
const provenancePath = new URL('data/provenance/igae-latest.json', root);
let previousProvenance = null;
try { previousProvenance = JSON.parse(await readFile(provenancePath, 'utf8')); } catch {}
const retrievedAt = previousProvenance?.sha256 === sha256 ? previousProvenance.retrievedAt : new Date().toISOString();
const provenance = { sourceUrl: report.url, catalogUrl, sha256, retrievedAt, parser: 'igae-pdf-parser@1' };
const snapshot = { ...updated, provenance };
if (previousProvenance?.sha256 !== sha256) {
  await writeJson(`data/history/igae/${period}-${sha256.slice(0, 12)}.json`, snapshot);
  await writeJson('data/provenance/igae-latest.json', provenance);
}
await writeJson('data/igae-latest.json', updated);
console.log(`IGAE verificado: ${updated.periodLabel}; ${amounts.revenueTotal} M€ de ingresos, ${amounts.expenditureTotal} M€ de gasto; informe ${basename(pdfPath)} · SHA-256 ${sha256}`);
