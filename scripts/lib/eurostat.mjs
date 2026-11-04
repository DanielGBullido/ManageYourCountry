// Lectura de respuestas JSON-stat 2.0 de la API de difusión de Eurostat y
// cálculo de las cuentas anuales de las Administraciones públicas (sector S13).

export const EUROSTAT_API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
export const MAIN_ITEMS = ['TR', 'TE', 'B9', 'D2REC', 'D5REC', 'D91REC', 'D61REC'];

export const mainUrl = (geo, year) => `${EUROSTAT_API}/gov_10a_main?geo=${geo}&sector=S13&unit=MIO_EUR&time=${year}${MAIN_ITEMS.map(item => `&na_item=${item}`).join('')}`;
export const cofogUrl = (geo, year) => `${EUROSTAT_API}/gov_10a_exp?geo=${geo}&sector=S13&unit=MIO_EUR&time=${year}&na_item=TE`;

/** Value for one category of `dimension`, with every other dimension fixed to a single category. */
export function jsonStatValues(dataset, dimension) {
  const { id, size, dimension: dimensions, value } = dataset;
  const position = id.indexOf(dimension);
  if (position < 0) throw new Error(`La respuesta de Eurostat no tiene la dimensión «${dimension}»`);
  id.forEach((name, index) => {
    if (index !== position && size[index] !== 1) throw new Error(`La respuesta de Eurostat tiene ${size[index]} categorías en «${name}»; se esperaba una`);
  });
  const stride = size.slice(position + 1).reduce((product, n) => product * n, 1);
  const result = {};
  for (const [category, index] of Object.entries(dimensions[dimension].category.index)) {
    const cell = value[index * stride] ?? value[String(index * stride)];
    if (cell !== undefined && cell !== null) result[category] = Number(cell);
  }
  return result;
}

const near = (a, b, tolerance = 2) => Math.abs(a - b) <= tolerance;

/**
 * Builds the annual general-government figures used by the «por funciones»
 * simulator. Spending by function (COFOG) and revenue come from the same
 * Eurostat release; the check against the project's COFOG file guarantees the
 * simulator lines and the annual context block show the same figures.
 */
export function buildAnnualAccounts(main, cofog, functionalFile) {
  const items = jsonStatValues(main, 'na_item');
  for (const item of MAIN_ITEMS) if (!Number.isFinite(items[item])) throw new Error(`Falta ${item} en gov_10a_main`);
  const functions = jsonStatValues(cofog, 'cofog99');
  const codes = Array.from({ length: 10 }, (_, index) => `GF${String(index + 1).padStart(2, '0')}`);
  for (const code of codes) if (!Number.isFinite(functions[code])) throw new Error(`Falta la función ${code} en gov_10a_exp`);
  const cofogTotal = functions.TOTAL;
  const sumFunctions = codes.reduce((total, code) => total + functions[code], 0);
  if (!near(sumFunctions, cofogTotal)) throw new Error(`Las diez funciones COFOG suman ${sumFunctions}, pero el total es ${cofogTotal}`);
  if (!near(items.TR - items.TE, items.B9)) throw new Error(`Ingresos menos gastos (${items.TR - items.TE}) no coincide con el saldo B9 (${items.B9})`);

  const fileAmounts = functionalFile.items.map(item => item.amount);
  if (functionalFile.items.length !== 10 || fileAmounts.some((amount, index) => !near(amount, functions[codes[index]], 1))) {
    throw new Error(`data/gasto-funcional-2024.json no coincide con la última publicación COFOG de Eurostat (${codes.map(code => functions[code]).join(', ')}). Actualiza ese fichero antes.`);
  }

  const taxes = items.D2REC + items.D5REC + items.D91REC;
  const contributions = items.D61REC;
  return {
    revenueTotal: items.TR,
    revenue: { taxes, contributions, other: items.TR - taxes - contributions },
    expenditureTotalRevised: items.TE,
    financingBalanceRevised: items.B9,
    cofogTotal,
    revisionGap: items.TE - cofogTotal,
  };
}
