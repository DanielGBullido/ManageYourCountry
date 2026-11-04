import { readXlsx } from './xlsx-reader.mjs';
import { assertNear, listLinks, periodKey } from './official-import.mjs';

// IGAE · «Administración regional y detalle por comunidad autónoma.
// Operaciones no financieras. Serie mensual». Un libro por año
// (M_CCAA_Sub_Det_AAAA.xlsx) con cifras ACUMULADAS a fin de mes en millones de
// euros: Tabla1a es el subsector y Tabla2a…Tabla18a, cada comunidad. El libro
// se sustituye cada mes y puede revisar meses anteriores.

export const CCAA_CATALOG_URL = 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/imnofinancierasCA.aspx';
export const CCAA_PARSER_VERSION = 'igae-ccaa@1';

// Título de cada hoja → nombre usado en data/comunidades-autonomicas.json.
export const COMMUNITY_NAMES = new Map([
  ['ANDALUCÍA', 'Andalucía'], ['ARAGÓN', 'Aragón'], ['ASTURIAS', 'Asturias'], ['BALEARES', 'Illes Balears'],
  ['CANARIAS', 'Canarias'], ['CANTABRIA', 'Cantabria'], ['CASTILLA-LA MANCHA', 'Castilla-La Mancha'],
  ['CASTILLA Y LEÓN', 'Castilla y León'], ['CATALUÑA', 'Cataluña'], ['EXTREMADURA', 'Extremadura'],
  ['GALICIA', 'Galicia'], ['MADRID', 'Comunidad de Madrid'], ['REGIÓN DE MURCIA', 'Región de Murcia'],
  ['COMUNIDAD FORAL DE NAVARRA', 'Navarra'], ['LA RIOJA', 'La Rioja'], ['COMUNITAT VALENCIANA', 'Comunitat Valenciana'],
  ['PAÍS VASCO', 'País Vasco'],
]);

export function listCcaaWorkbooks(html, baseUrl = CCAA_CATALOG_URL) {
  const seen = new Map();
  for (const href of listLinks(html, baseUrl)) {
    const match = href.match(/\/M_CCAA_Sub_Det_(20\d{2})\.xlsx$/);
    if (match && !seen.has(Number(match[1]))) seen.set(Number(match[1]), { year: Number(match[1]), url: href });
  }
  return [...seen.values()].sort((a, b) => b.year - a.year);
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const monthHeaders = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function readTable(rows, sheet, year) {
  if (!new RegExp(`Año ${year}\\. Datos acumulados a final del periodo\\. Millones de euros`).test(clean(rows[2]?.[0]))) {
    throw new Error(`${sheet} no contiene datos acumulados de ${year} en millones de euros`);
  }
  const header = rows.findIndex(row => clean(row[1]) === 'CONCEPTOS');
  if (header < 0 || monthHeaders.some((name, index) => clean(rows[header][index + 2]) !== name)) throw new Error(`Cambió la cabecera de meses en ${sheet}`);
  const line = (code, label) => {
    const row = rows.find(item => clean(item[1]) === label && (code === null || clean(item[0]) === code));
    if (!row) throw new Error(`Falta la fila «${label}» en ${sheet}`);
    return monthHeaders.map((_, index) => row[index + 2]).filter(value => typeof value === 'number');
  };
  const values = {
    revenue: line(null, 'Total de ingresos'),
    tax: line('D.2+D.5+D.91', 'Impuestos'),
    expenditure: line(null, 'Total de gastos'),
    balance: line('B.9', 'Total capacidad (+) o necesidad (-) de financiación'),
  };
  const months = values.revenue.length;
  if (!months || Object.values(values).some(series => series.length !== months)) throw new Error(`${sheet} no tiene los mismos meses en todas las filas`);
  values.revenue.forEach((_, index) => assertNear(values.revenue[index] - values.expenditure[index], values.balance[index], 1, `${sheet}: ingresos − gastos = capacidad/necesidad acumulada (${monthHeaders[index]})`));
  return values;
}

/** @param {Buffer} buffer */
export function parseCcaaWorkbook(buffer) {
  const workbook = readXlsx(buffer);
  const index = workbook.sheet('Indice');
  const year = Number(clean(index[2]?.[1]).match(/Año (20\d{2})/)?.[1]);
  const updated = clean(index[4]?.[1]).match(/Fecha de actualización: (\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (!year || !updated) throw new Error('No se pudo leer el año o la fecha de actualización del libro IGAE regional');
  const updatedOn = `${updated[3]}-${updated[2].padStart(2, '0')}-${updated[1].padStart(2, '0')}`;

  const subsector = workbook.sheet('Tabla1a');
  if (!clean(subsector[0]?.[0]).startsWith('ADMINISTRACIÓN REGIONAL')) throw new Error('Tabla1a no es la Administración regional');
  const regional = readTable(subsector, 'Tabla1a', year);
  const communities = [];
  for (let table = 2; table <= 18; table++) {
    const sheet = `Tabla${table}a`;
    const rows = workbook.sheet(sheet);
    const name = COMMUNITY_NAMES.get(clean(rows[0]?.[0]).toLocaleUpperCase('es'));
    if (!name) throw new Error(`Comunidad no reconocida en ${sheet}: «${clean(rows[0]?.[0])}»`);
    communities.push({ name, values: readTable(rows, sheet, year) });
  }
  if (new Set(communities.map(item => item.name)).size !== 17) throw new Error('El libro IGAE regional no trae las 17 comunidades');
  const monthCount = regional.revenue.length;
  if (communities.some(item => item.values.revenue.length !== monthCount)) throw new Error('No todas las comunidades tienen los mismos meses publicados');
  for (let month = 0; month < monthCount; month++) {
    const total = key => communities.reduce((sum, item) => sum + item.values[key][month], 0);
    // Los impuestos no se consolidan; ingresos y gastos sí (transferencias entre comunidades).
    assertNear(total('tax'), regional.tax[month], 17, `Impuestos: suma de comunidades frente a la Administración regional (${monthHeaders[month]})`);
    for (const key of ['revenue', 'expenditure']) {
      assertNear(total(key), regional[key][month], Math.max(25, regional[key][month] * 0.002), `${key}: suma de comunidades frente a la Administración regional (${monthHeaders[month]})`);
    }
  }

  const flow = (series, month) => month === 0 ? series[0] : series[month] - series[month - 1];
  return Array.from({ length: monthCount }, (_, month) => ({
    period: periodKey(year, month + 1),
    values: {
      updatedOn,
      communities: communities.map(({ name, values }) => {
        const revenue = flow(values.revenue, month);
        const expenditure = flow(values.expenditure, month);
        return { name, tax: flow(values.tax, month), revenue, expenditure, balance: revenue - expenditure };
      }),
    },
  }));
}
