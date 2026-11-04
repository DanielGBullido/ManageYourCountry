import { readXlsx } from './xlsx-reader.mjs';
import { assertNear, listLinks, monthName, monthNumber, periodKey } from './official-import.mjs';

// Instituto Nacional de la Seguridad Social · Ingreso Mínimo Vital (IMV).
// Cada mes la Seguridad Social publica en su revista oficial (sección IMV) una
// nota con el libro «AAAAMM_IMV - Nómina.xlsx»: hogares (prestaciones),
// personas beneficiarias, hogares con CAPI e importe bruto de la nómina, por
// comunidad autónoma y provincia.

export const IMV_CATALOG_URL = 'https://revista.seg-social.es/imv';
export const IMV_PARSER_VERSION = 'inss-imv@1';

/** Notas de la sección IMV que pueden enlazar la nómina mensual. */
export function listImvArticles(html, baseUrl = IMV_CATALOG_URL) {
  return [...new Set(listLinks(html, baseUrl).filter(href => {
    const url = new URL(href);
    return url.hostname === 'revista.seg-social.es' && url.pathname.startsWith('/-/') && /ingreso-m(%c3%ad|í|i)nimo-vital/i.test(url.pathname) && !url.search;
  }))];
}

/** Libro de nómina enlazado en una nota (o null). */
export function findImvPayrollWorkbook(html, baseUrl) {
  for (const href of listLinks(html, baseUrl)) {
    const decoded = decodeURIComponent(href.replaceAll('+', ' '));
    const match = decoded.match(/\/(20\d{2})(0[1-9]|1[0-2])_IMV - Nómina\.xlsx\//i);
    if (match) return { period: periodKey(Number(match[1]), Number(match[2])), url: href };
  }
  return null;
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

/**
 * @param {Buffer} buffer
 * @param {string} period AAAA-MM esperado según el nombre del fichero
 */
export function parseImvPayrollWorkbook(buffer, period) {
  const rows = readXlsx(buffer).sheet('Nómina');
  const [year, month] = period.split('-').map(Number);
  const title = clean(rows[0]?.[0]).match(/nómina de ([a-záéíóú]+) (20\d{2})/i);
  if (!title || monthNumber(title[1]) !== month || Number(title[2]) !== year) {
    throw new Error(`El libro IMV es de «${clean(rows[0]?.[0])}», no de ${monthName(month)} ${year}`);
  }
  const header = rows.findIndex(row => clean(row[0]) === 'COMUNIDADES AUTÓNOMAS');
  if (header < 0) throw new Error('No se encontró la cabecera de la nómina IMV');
  const column = prefix => {
    const index = rows[header].findIndex(cell => clean(cell).startsWith(prefix));
    if (index < 0) throw new Error(`Falta la columna «${prefix}» en la nómina IMV`);
    return index;
  };
  const columns = {
    households: column('Número de prestaciones'),
    holderSex: column('Sexo del titular'),
    capiHouseholds: column('Hogares con CAPI'),
    beneficiaries: column('Número de beneficiarios'),
    amountEuros: column('Importe bruto de las nóminas'),
    averagePerHousehold: column('Cuantía media mensual por hogar'),
  };
  if (clean(rows[header + 1][columns.holderSex]) !== 'Mujeres' || clean(rows[header + 1][columns.holderSex + 1]) !== 'Hombres') throw new Error('Cambió el desglose por sexo del titular');

  const read = row => ({
    households: row[columns.households],
    womenHolders: row[columns.holderSex],
    menHolders: row[columns.holderSex + 1],
    capiHouseholds: row[columns.capiHouseholds],
    beneficiaries: row[columns.beneficiaries],
    amountEuros: Math.round(row[columns.amountEuros] * 100) / 100,
    averagePerHousehold: row[columns.averagePerHousehold],
  });
  const totalRow = rows.find(row => clean(row[0]) === 'TOTAL');
  if (!totalRow) throw new Error('Falta la fila TOTAL de la nómina IMV');
  const total = read(totalRow);
  const regions = rows.slice(header + 2).filter(row => clean(row[0]) && clean(row[0]) !== 'TOTAL' && clean(row[1]) === 'Total').map(read);
  if (regions.length !== 19) throw new Error(`Se esperaban 17 comunidades más Ceuta y Melilla en la nómina IMV y hay ${regions.length}`);
  for (const key of ['households', 'beneficiaries', 'capiHouseholds', 'womenHolders', 'menHolders']) {
    assertNear(regions.reduce((sum, item) => sum + item[key], 0), total[key], 0, `Suma territorial IMV de ${key} (${period})`);
  }
  assertNear(regions.reduce((sum, item) => sum + item.amountEuros, 0), total.amountEuros, 1, `Suma territorial del importe IMV (${period})`);
  assertNear(total.womenHolders + total.menHolders, total.households, 0, `Titulares IMV por sexo (${period})`);
  // La cuantía media no incluye atrasos y el importe sí (notas 4 y 5 del libro),
  // así que no tienen por qué coincidir; solo se comprueba que la nota siga ahí.
  if (!rows.flat().some(cell => /Cuantía media mensual por hogar.{0,3} no incluye atrasos/i.test(clean(cell)))) throw new Error('Cambió la definición de la cuantía media del IMV (nota 5)');
  if (!(total.averagePerHousehold > 100 && total.averagePerHousehold < 2000)) throw new Error(`Cuantía media IMV por hogar fuera de rango en ${period}`);
  if (!(total.households > 0 && total.beneficiaries > total.households && total.capiHouseholds <= total.households)) throw new Error(`Cifras IMV incoherentes en ${period}`);
  return total;
}
