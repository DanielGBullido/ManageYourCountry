import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { get as httpsGet } from 'node:https';
import { rootCertificates } from 'node:tls';

// Utilidades comunes a los importadores de series oficiales mensuales.
//
// Regla del panel: el mes lo marca la IGAE (data/igae-latest.json). Cada
// importador descarga la publicación oficial más reciente, valida sus cifras,
// archiva en data/history/<fuente>/ todos los meses completos que sean iguales
// o posteriores al mes del panel y solo escribe en los ficheros del panel el
// mes que coincide con la IGAE. Si la fuente ya no ofrece ese mes, se usa la
// copia archivada; si nunca se archivó, se conserva el dato actual.

export const root = new URL('../../', import.meta.url);
export const requestHeaders = { 'user-agent': 'EspanaEnTusManos/1.0 (herramienta educativa; actualización de estadísticas públicas)' };

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthName = month => monthNames[month - 1];
export const monthNumber = name => {
  const index = monthNames.indexOf(String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').replace(/[^a-z]/g, '').replace('setiembre', 'septiembre'));
  return index < 0 ? null : index + 1;
};
export const periodKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;
export const splitPeriod = period => { const [year, month] = period.split('-').map(Number); return { year, month }; };
const capitalize = text => `${text[0].toLocaleUpperCase('es')}${text.slice(1)}`;
/** «Agosto 2026», como en data/prestaciones-latest.json */
export const shortLabel = period => { const { year, month } = splitPeriod(period); return `${capitalize(monthName(month))} ${year}`; };
/** «Agosto de 2026», como en data/igae-latest.json */
export const longLabel = period => { const { year, month } = splitPeriod(period); return `${capitalize(monthName(month))} de ${year}`; };
export const previousPeriod = period => { const { year, month } = splitPeriod(period); return month === 1 ? periodKey(year - 1, 12) : periodKey(year, month - 1); };

const numberFormat = (digits) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: 'always' });
/** Formato español con separador de miles también en números de cuatro cifras («1.373,44»). */
export const formatNumber = (value, digits = 0) => numberFormat(digits).format(value);
export const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;
export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

export function assertNear(actual, expected, tolerance, description) {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) throw new Error(`${description}: falta el valor numérico`);
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${description}: ${actual} no cuadra con ${expected} (tolerancia ${tolerance})`);
}

export const readJson = async relativePath => JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
export async function writeJson(relativePath, value) {
  const path = new URL(relativePath, root);
  await mkdir(new URL('.', path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

// Algunos servidores oficiales no envían el certificado intermedio de su
// cadena TLS. Los navegadores lo descargan solos; Node no. Para esos dominios se
// añade el intermedio oficial (guardado en scripts/certs/) a las raíces de Node,
// sin desactivar ninguna comprobación.
const intermediateCertificates = new Map([
  ['www.mites.gob.es', 'fnmt-ac-componentes-informaticos.pem'], // FNMT-RCM · AC Componentes Informáticos
]);

function getWithExtraCa(url, certificate, timeout, redirects = 3) {
  return new Promise((resolve, reject) => {
    const request = httpsGet(url, { headers: requestHeaders, ca: [...rootCertificates, certificate], timeout }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirects > 0) {
        response.resume();
        resolve(getWithExtraCa(new URL(response.headers.location, url).toString(), certificate, timeout, redirects - 1));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error(`Tiempo de espera agotado al consultar ${url}`)));
    request.on('error', reject);
  });
}

async function download(url, timeout) {
  const certificateFile = intermediateCertificates.get(new URL(url).hostname);
  if (certificateFile) {
    const certificate = await readFile(new URL(`scripts/certs/${certificateFile}`, root), 'utf8');
    return getWithExtraCa(url, certificate, timeout);
  }
  const response = await fetch(url, { headers: requestHeaders, signal: AbortSignal.timeout(timeout) });
  return { status: response.status, body: Buffer.from(await response.arrayBuffer()) };
}

export async function fetchOfficial(url, { timeout = 60_000, kind = 'text' } = {}) {
  const response = await download(url, timeout);
  if (response.status < 200 || response.status >= 300) throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  if (kind === 'text') return response.body.toString('utf8');
  const buffer = response.body;
  if (kind === 'xlsx' && buffer.subarray(0, 2).toString('latin1') !== 'PK') throw new Error(`La respuesta de ${url} no es un libro Excel .xlsx`);
  return buffer;
}

/** Enlaces de una página HTML resueltos a URL absolutas. */
export function listLinks(html, baseUrl) {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => {
    try { return new URL(match[1].replaceAll('&amp;', '&'), baseUrl).toString(); } catch { return null; }
  }).filter(Boolean);
}

export const panelPeriod = async () => (await readJson('data/igae-latest.json')).referencePeriod;

async function archiveFiles(source) {
  try { return (await readdir(new URL(`data/history/${source}/`, root))).filter(name => name.endsWith('.json')).sort(); } catch { return []; }
}

/** Devuelve la última copia archivada de un mes (la más reciente descargada) o null. */
export async function findArchivedMonth(source, period) {
  const names = (await archiveFiles(source)).filter(name => name.startsWith(`${period}-`));
  const records = await Promise.all(names.map(name => readJson(`data/history/${source}/${name}`)));
  return records.sort((a, b) => String(a.provenance?.retrievedAt).localeCompare(String(b.provenance?.retrievedAt))).at(-1) ?? null;
}

export async function hasArchivedMonth(source, period) {
  return (await archiveFiles(source)).some(name => name.startsWith(`${period}-`));
}

/**
 * Archiva un mes ya validado. No escribe nada si la última copia de ese mes
 * tiene exactamente las mismas cifras, aunque el fichero de origen haya
 * cambiado por incluir otros meses.
 */
export async function archiveMonth(source, record) {
  const previous = await findArchivedMonth(source, record.referencePeriod);
  if (previous && isDeepStrictEqual(previous.values, record.values)) return false;
  await writeJson(`data/history/${source}/${record.referencePeriod}-${record.provenance.sha256.slice(0, 12)}.json`, record);
  return true;
}

/**
 * Flujo común: archiva los meses descargados y escribe solo el mes del panel.
 * @param {object} options
 * @param {string} options.source carpeta en data/history/ y nombre del fichero de procedencia
 * @param {string} options.label nombre legible de la fuente para los mensajes
 * @param {(panel: string) => Promise<object[]>} options.download registros validados, uno por mes
 * @param {(record: object) => Promise<string>} options.write escribe el mes del panel y devuelve un resumen
 */
export async function runMonthlyImport({ source, label, download, write }) {
  const panel = await panelPeriod();
  const retrievedAt = new Date().toISOString();
  const records = (await download(panel)).map(record => ({ ...record, provenance: { ...record.provenance, retrievedAt } }));
  if (!records.length) throw new Error(`${label}: la publicación oficial no contiene ningún mes completo`);
  for (const record of records.filter(item => item.referencePeriod >= panel)) {
    if (await archiveMonth(source, record)) console.log(`${label}: archivado ${record.periodLabel} · SHA-256 ${record.provenance.sha256}`);
  }
  const newest = records.map(item => item.referencePeriod).sort().at(-1);
  let target = records.find(item => item.referencePeriod === panel);
  if (!target) {
    target = await findArchivedMonth(source, panel);
    if (target) console.log(`${label}: la publicación vigente ya no incluye ${panel}; se usa la copia archivada el ${target.provenance.retrievedAt}.`);
  }
  if (!target) {
    console.log(`${label}: aún no hay datos de ${panel}, el mes del panel (último mes publicado: ${newest}). Se conserva el dato actual.`);
    return null;
  }
  if (newest > panel) console.log(`${label}: ya publica ${newest}; el panel sigue en ${panel} (IGAE). Los meses posteriores quedan archivados.`);

  const provenancePath = `data/provenance/${source}-latest.json`;
  let previous = null;
  try { previous = await readJson(provenancePath); } catch {}
  const unchanged = previous?.sha256 === target.provenance.sha256 && previous?.referencePeriod === target.referencePeriod;
  const summary = await write(target);
  await writeJson(provenancePath, {
    referencePeriod: target.referencePeriod,
    ...target.provenance,
    retrievedAt: unchanged ? previous.retrievedAt : target.provenance.retrievedAt,
  });
  console.log(`${label} verificado: ${target.periodLabel}; ${summary}; SHA-256 ${target.provenance.sha256}`);
  return target;
}

/**
 * Sustituye una ficha de data/prestaciones-latest.json y, si las cuatro
 * comparten mes, actualiza el título y la nota comunes.
 */
export async function writeBenefitItem(item) {
  const path = 'data/prestaciones-latest.json';
  const benefits = await readJson(path);
  const index = benefits.items.findIndex(entry => entry.id === item.id);
  if (index < 0) throw new Error(`No existe la ficha «${item.id}» en ${path}`);
  const previous = benefits.items[index];
  if (previous.period === item.period && previous.amountMillions !== item.amountMillions) {
    console.log(`Revisión oficial de ${item.name} (${item.period}): ${previous.amountMillions} → ${item.amountMillions} M€.`);
  }
  benefits.items[index] = { ...previous, ...item };
  const periods = new Set(benefits.items.map(entry => entry.period));
  if (periods.size === 1) {
    const [period] = periods;
    const lower = period.toLocaleLowerCase('es').replace(/ (\d{4})$/, ' de $1');
    benefits.title = `Pensiones y prestaciones de ${lower}`;
    benefits.note = `Las ${benefits.items.length === 4 ? 'cuatro' : benefits.items.length} fichas usan ${lower} y detallan programas incluidos en el gasto general. Su suma orientativa no debe añadirse al total IGAE.`;
  }
  await writeJson(path, benefits);
}
