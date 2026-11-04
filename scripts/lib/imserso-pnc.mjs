import { readXlsx } from './xlsx-reader.mjs';
import { assertNear, listLinks, monthNumber, periodKey } from './official-import.mjs';

// Imserso · Pensiones no contributivas (PNC) · «Evolución de las nóminas»
// (Anexo 1, total Estado con Navarra y País Vasco). El mismo documento
// (evolpncs.xlsx) se sustituye cada mes y acumula los meses del año en curso:
// importes brutos en euros y número de pensiones, por jubilación e incapacidad.

export const PNC_CATALOG_URL = 'https://imserso.es/el-imserso/documentacion/estadisticas/pensiones-no-contributivas-jubilacion-incapacidad-pnc';
export const PNC_PARSER_VERSION = 'imserso-pnc@1';

export function findPncWorkbook(html, baseUrl = PNC_CATALOG_URL) {
  const url = listLinks(html, baseUrl).find(href => /\/evolpncs\.xlsx(?:\/|\?|$)/.test(href));
  if (!url) throw new Error('No se encontró el libro evolpncs.xlsx en la página de estadísticas de PNC del Imserso');
  return url;
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

/** @param {Buffer} buffer */
export function parsePncWorkbook(buffer) {
  const workbook = readXlsx(buffer);
  const sheetName = workbook.sheetNames.find(name => /N[ÓO]MINA/i.test(name));
  if (!sheetName) throw new Error('El libro del Imserso no contiene la hoja de nóminas');
  const rows = workbook.sheet(sheetName);
  const text = rows.flat().map(clean).join(' ');
  if (!/EVOLUCIÓN DE LAS NÓMINAS/.test(text) || !/CON NAVARRA Y PAÍS VASCO/.test(text)) throw new Error('La hoja no es la evolución de nóminas del total Estado');
  const header = rows.findIndex(row => row.filter(cell => clean(cell) === 'JUBILACIÓN').length === 2);
  if (header < 0) throw new Error('No se encontraron las columnas de jubilación e incapacidad');
  const at = label => rows[header].map((cell, index) => clean(cell) === label ? index : -1).filter(index => index >= 0);
  const [amountRetirement, countRetirement] = at('JUBILACIÓN');
  const [amountDisability, countDisability] = at('INCAPACIDAD');
  const [amountTotal, countTotal] = at('TOTAL');
  if (!(amountRetirement < amountDisability && amountDisability < amountTotal && amountTotal < countRetirement && countRetirement < countDisability && countDisability < countTotal)) {
    throw new Error('Cambió el orden de las columnas de importes y número de pensiones');
  }
  if (!/IMPORTES BRUTOS/.test(rows.slice(0, header).flat().map(clean).join(' '))) throw new Error('No consta que los importes sean brutos');

  const months = [];
  let year = null;
  for (const row of rows.slice(header + 1)) {
    const label = clean(row.find(cell => typeof cell === 'string'));
    const yearRow = label.match(/^AÑO (20\d{2})$/);
    if (yearRow && row[amountTotal] == null) { year = Number(yearRow[1]); continue; }
    if (/^TOTAL/.test(label)) break;
    const monthLabel = label.match(/^([A-ZÁÉÍÓÚ]+)(\**)$/);
    if (!year || !monthLabel) continue;
    const month = monthNumber(monthLabel[1]);
    if (!month || !(row[amountTotal] > 0)) continue;
    const period = periodKey(year, month);
    const values = {
      retirement: { pensions: row[countRetirement], amountEuros: round2(row[amountRetirement]) },
      disability: { pensions: row[countDisability], amountEuros: round2(row[amountDisability]) },
      total: { pensions: row[countTotal], amountEuros: round2(row[amountTotal]) },
      includesExtraPay: monthLabel[2] === '*',
    };
    assertNear(values.retirement.amountEuros + values.disability.amountEuros, values.total.amountEuros, 0.05, `Importe PNC jubilación + incapacidad (${period})`);
    assertNear(values.retirement.pensions + values.disability.pensions, values.total.pensions, 0, `Número de PNC jubilación + incapacidad (${period})`);
    months.push({ period, values });
  }
  if (!months.length) throw new Error('La hoja de nóminas PNC no contiene ningún mes con datos');
  return months;
}

const round2 = value => Math.round(value * 100) / 100;
