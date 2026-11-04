import { readXlsx } from './xlsx-reader.mjs';
import { assertNear, listLinks, monthNumber, periodKey } from './official-import.mjs';

// Seguridad Social · Estadísticas · «Pensiones contributivas en vigor».
// La página publica cada mes un libro «Series de pensiones en vigor»
// (S<AAAA><MM>.xlsx) con una fila por nómina del año en curso (1 enero,
// 1 febrero…) y el cierre de los cuatro años anteriores. Número de pensiones,
// importe mensual en miles de euros y pensión media, por clase de pensión.

export const PENSIONS_CATALOG_URL = 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23/EST24';
export const PENSIONS_PARSER_VERSION = 'seguridad-social-pensiones@1';

/** Devuelve el libro de series más reciente enlazado en la página oficial. */
export function findPensionSeriesWorkbook(html, baseUrl = PENSIONS_CATALOG_URL) {
  const candidates = listLinks(html, baseUrl)
    .map(href => {
      const match = href.match(/\/S(20\d{2})(0[1-9]|1[0-2])\.xlsx(?:\?|$)/);
      if (!match) return null;
      const url = new URL(href);
      const mod = url.searchParams.get('MOD');
      url.search = mod ? `?MOD=${mod}` : '';
      return { publication: periodKey(Number(match[1]), Number(match[2])), url: url.toString() };
    })
    .filter(Boolean)
    .sort((a, b) => b.publication.localeCompare(a.publication));
  if (!candidates.length) throw new Error('No se encontró el libro «Series de pensiones en vigor» (S<AAAAMM>.xlsx) en la página de la Seguridad Social');
  return candidates[0];
}

const classes = [
  ['total', 'Total pensiones'],
  ['permanentDisability', 'Incapacidad permanente'],
  ['retirement', 'Jubilación'],
  ['widowhood', 'Viudedad'],
  ['orphanhood', 'Orfandad'],
  ['family', 'Favor de familiares'],
];
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

/**
 * Lee la hoja «S_Total» y devuelve un registro por nómina mensual.
 * @param {Buffer} buffer
 */
export function parsePensionSeriesWorkbook(buffer) {
  const rows = readXlsx(buffer).sheet('S_Total');
  if (!clean(rows[1]?.[0]).startsWith('TOTAL SISTEMA')) throw new Error('La hoja S_Total no corresponde al total del sistema');
  const header = rows.findIndex(row => classes.every(([, label]) => row.some(cell => clean(cell) === label)));
  if (header < 0) throw new Error('No se encontraron las columnas de clase de pensión en S_Total');
  const columns = Object.fromEntries(classes.map(([key, label]) => [key, rows[header].findIndex(cell => clean(cell) === label)]));
  const units = rows[header + 1].map(clean);
  for (const [key, column] of Object.entries(columns)) {
    if (units[column] !== 'Número' || !units[column + 1].startsWith('Importe (miles de €)') || !units[column + 2].startsWith('P. media')) {
      throw new Error(`Cambió el formato de las columnas de ${key} en S_Total`);
    }
  }

  const months = [];
  let year = null;
  for (let index = header + 2; index < rows.length; index++) {
    const row = rows[index];
    if (clean(row[0]) === 'Periodo' || row.some(cell => clean(cell) === '%')) break;
    if (typeof row[0] === 'number') year = row[0];
    const label = clean(row[1]).match(/^1 ([a-záéíóú]+)$/i);
    if (!label || row[columns.total] == null) continue;
    const month = monthNumber(label[1]);
    if (!year || !month) throw new Error(`Fila de nómina sin año o mes reconocible: «${clean(row[1])}»`);
    const read = key => ({ pensions: row[columns[key]], amountThousands: row[columns[key] + 1], averageEuros: row[columns[key] + 2] });
    const values = Object.fromEntries(classes.map(([key]) => [key, read(key)]));
    const period = periodKey(year, month);
    const parts = classes.slice(1).map(([key]) => values[key]);
    assertNear(parts.reduce((sum, item) => sum + item.pensions, 0), values.total.pensions, 0, `Número de pensiones por clase (${period})`);
    assertNear(parts.reduce((sum, item) => sum + item.amountThousands, 0), values.total.amountThousands, 1, `Importe por clase (${period}, miles de €)`);
    for (const [key, item] of Object.entries(values)) {
      if (!(item.pensions > 0 && item.amountThousands > 0)) throw new Error(`Faltan cifras de ${key} en ${period}`);
      assertNear(item.amountThousands * 1000 / item.pensions, item.averageEuros, 0.01, `Pensión media de ${key} (${period})`);
    }
    months.push({ period, values });
  }
  if (!months.length) throw new Error('S_Total no contiene ninguna nómina mensual');
  return months;
}
