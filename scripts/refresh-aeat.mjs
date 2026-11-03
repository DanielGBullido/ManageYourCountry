import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AEAT_CATALOG_URL, listAeatReports } from './lib/aeat-catalog.mjs';
import { replaceTopLevelValue } from './lib/json-top-level.mjs';
import { AEAT_PARSER_VERSION, aeatMonthName, parseAeatMonthlyReport } from './lib/aeat-pdf-parser.mjs';

// Actualiza `latestMonthly` de data/recaudacion-tributaria-2025.json con la
// recaudación neta del mes publicada por la AEAT (Cuadro 1.1, «TOTAL GENERAL»).
//
// El panel solo muestra meses en los que todas las fuentes coinciden, y el mes
// lo marca la IGAE (data/igae-latest.json). Por eso:
// - el informe AEAT más reciente siempre se descarga, se valida y se archiva en
//   data/history/aeat/ con su huella SHA-256;
// - `latestMonthly` se escribe con el informe del mismo mes que la IGAE. Si la
//   AEAT ya ha publicado meses posteriores, quedan archivados hasta que la IGAE
//   llegue a ellos; nunca se mezclan meses en el panel.

const root = new URL('../', import.meta.url);
const taxesFile = 'data/recaudacion-tributaria-2025.json';
const requestHeaders = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };

const capitalize = text => `${text[0].toUpperCase()}${text.slice(1)}`;
const periodLabel = report => `${capitalize(aeatMonthName(report.month))} ${report.year}`;
const readJson = async relativePath => JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
async function writeJson(relativePath, value) {
  const path = new URL(relativePath, root);
  await mkdir(new URL('.', path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fetchResponse(url, timeout) {
  const response = await fetch(url, { headers: requestHeaders, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  return response;
}

const workDir = await mkdtemp(join(tmpdir(), 'aeat-'));
async function downloadAndParse(report) {
  const pdf = Buffer.from(await (await fetchResponse(report.url, 90_000)).arrayBuffer());
  if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`La respuesta de ${report.url} no parece ser un PDF`);
  const pdfPath = join(workDir, `IMR_${report.period}.pdf`);
  await writeFile(pdfPath, pdf);
  let text;
  try {
    text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(`No se pudo leer el informe AEAT. Instala Poppler (pdftotext). ${error.message}`);
  }
  const amounts = parseAeatMonthlyReport(text, report);
  return { report, amounts, sha256: createHash('sha256').update(pdf).digest('hex') };
}

async function archive({ report, amounts, sha256 }, retrievedAt) {
  const dir = 'data/history/aeat/';
  const name = `${report.period}-${sha256.slice(0, 12)}.json`;
  let existing = [];
  try { existing = await readdir(new URL(dir, root)); } catch {}
  if (existing.includes(name)) return false;
  await writeJson(`${dir}${name}`, {
    referencePeriod: report.period,
    periodLabel: periodLabel(report),
    unit: 'millones de euros',
    measure: 'Ingresos tributarios netos del mes · Cuadro 1.1, TOTAL GENERAL, columna Total',
    ...amounts,
    provenance: { sourceUrl: report.url, catalogUrl: AEAT_CATALOG_URL, sha256, retrievedAt, parser: AEAT_PARSER_VERSION },
  });
  return true;
}

try {
  const catalog = await (await fetchResponse(AEAT_CATALOG_URL, 30_000)).text();
  const reports = listAeatReports(catalog);
  if (!reports.length) throw new Error('No se encontró ningún informe IMR_AA_MM_es_es.pdf en el catálogo oficial de la AEAT');
  const latest = reports[0];
  const panelPeriod = (await readJson('data/igae-latest.json')).referencePeriod;
  const now = new Date().toISOString();

  const newest = await downloadAndParse(latest);
  if (await archive(newest, now)) console.log(`AEAT archivado: ${periodLabel(latest)} · ${newest.amounts.amountMillions} M€ · SHA-256 ${newest.sha256}`);

  if (latest.period < panelPeriod) {
    console.log(`La AEAT aún no ha publicado ${panelPeriod} (último informe: ${latest.period}). Se conserva el dato mensual actual.`);
  } else {
    await updateLatestMonthly(reports, newest, panelPeriod, now);
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}

async function updateLatestMonthly(reports, newest, panelPeriod, now) {
  const latest = newest.report;
  let target = newest;
  if (latest.period > panelPeriod) {
    const panelReport = reports.find(report => report.period === panelPeriod);
    if (!panelReport) throw new Error(`El catálogo AEAT ya no enlaza el informe de ${panelPeriod}, que es el mes del panel`);
    console.log(`La AEAT ya publica ${latest.period}; el panel sigue en ${panelPeriod} (IGAE). Se usa el informe de ${panelPeriod} y ${latest.period} queda archivado.`);
    target = await downloadAndParse(panelReport);
    await archive(target, now);
  }

  const provenancePath = 'data/provenance/aeat-latest.json';
  let previousProvenance = null;
  try { previousProvenance = await readJson(provenancePath); } catch {}
  const unchanged = previousProvenance?.sha256 === target.sha256 && previousProvenance?.referencePeriod === target.report.period;
  const provenance = {
    referencePeriod: target.report.period,
    sourceUrl: target.report.url,
    catalogUrl: AEAT_CATALOG_URL,
    sha256: target.sha256,
    retrievedAt: unchanged ? previousProvenance.retrievedAt : now,
    parser: AEAT_PARSER_VERSION,
    table: 'Cuadro 1.1 · Mes · TOTAL GENERAL · Total (comprobado con el Cuadro 1.3 en miles de euros)',
  };

  const taxesText = await readFile(new URL(taxesFile, root), 'utf8');
  const taxes = JSON.parse(taxesText);
  const previous = taxes.latestMonthly;
  const monthName = aeatMonthName(target.report.month);
  taxes.latestMonthly = {
    ...previous,
    period: periodLabel(target.report),
    amountMillions: target.amounts.amountMillions,
    source: 'Agencia Tributaria · Informe mensual de recaudación tributaria',
    sourceUrl: target.report.url,
    note: `Ingresos tributarios netos recaudados en ${monthName}, en caja. Es un dato AEAT y tiene distinto alcance contable al total de ingresos de la IGAE que usa el simulador.`,
  };
  if (previous.period === taxes.latestMonthly.period && previous.amountMillions !== taxes.latestMonthly.amountMillions) {
    console.log(`La AEAT ha revisado ${taxes.latestMonthly.period}: ${previous.amountMillions} → ${taxes.latestMonthly.amountMillions} M€.`);
  }
  await writeFile(new URL(taxesFile, root), replaceTopLevelValue(taxesText, 'latestMonthly', taxes.latestMonthly));
  await writeJson(provenancePath, provenance);
  console.log(`AEAT verificado: ${taxes.latestMonthly.period}; ${target.amounts.amountMillions} M€ de ingresos tributarios netos (Estado ${target.amounts.stateMillions} M€ + AA.TT. ${target.amounts.territorialMillions} M€); SHA-256 ${target.sha256}`);
}
