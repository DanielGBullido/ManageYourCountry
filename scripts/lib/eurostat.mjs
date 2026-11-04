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

/** Every cell of a JSON-stat dataset as { dimension: category, ..., value }. */
export function jsonStatRows(dataset) {
  const { id, size, dimension: dimensions, value } = dataset;
  const categories = id.map(name => Object.entries(dimensions[name].category.index).sort((a, b) => a[1] - b[1]).map(([code]) => code));
  return Object.entries(value).map(([key, cell]) => {
    let rest = Number(key);
    const row = {};
    for (let d = id.length - 1; d >= 0; d -= 1) { row[id[d]] = categories[d][rest % size[d]]; rest = Math.floor(rest / size[d]); }
    return { ...row, value: Number(cell) };
  });
}

export const SUBSECTORS = { S1311: 'central', S1312: 'regional', S1313: 'local', S1314: 'socialSecurity' };
export const FUNCTION_CODES = Array.from({ length: 10 }, (_, index) => `GF${String(index + 1).padStart(2, '0')}`);

export const contextUrls = (fromYear) => ({
  ratios: `${EUROSTAT_API}/gov_10a_main?geo=ES&geo=EU27_2020&sector=S13&unit=PC_GDP&na_item=TR&na_item=TE&na_item=B9&sinceTimePeriod=${fromYear}`,
  debt: `${EUROSTAT_API}/gov_10dd_edpt1?geo=ES&geo=EU27_2020&sector=S13&unit=PC_GDP&na_item=GD&sinceTimePeriod=${fromYear}`,
  functions: `${EUROSTAT_API}/gov_10a_exp?geo=ES&geo=EU27_2020&sector=S13&unit=PC_GDP&na_item=TE&sinceTimePeriod=${fromYear}${FUNCTION_CODES.map(code => `&cofog99=${code}`).join('')}&cofog99=TOTAL`,
  levels: `${EUROSTAT_API}/gov_10a_main?geo=ES&unit=MIO_EUR&na_item=TE&na_item=TR&na_item=B9&sector=S13${Object.keys(SUBSECTORS).map(code => `&sector=${code}`).join('')}&sinceTimePeriod=${fromYear}`,
});

const byKey = (rows, keys) => Object.fromEntries(rows.map(row => [keys.map(key => row[key]).join('|'), row.value]));

/**
 * Spain in context: yearly deficit, revenue, spending and debt as % of GDP for
 * Spain and the EU-27; spending by function as % of GDP in the latest COFOG
 * year; and each level of government's balance in the latest year.
 */
export function buildContext({ ratios, debt, functions, levels }) {
  const ratioRows = byKey(jsonStatRows(ratios), ['geo', 'na_item', 'time']);
  const debtRows = byKey(jsonStatRows(debt), ['geo', 'time']);
  const years = [...new Set(jsonStatRows(ratios).filter(row => row.geo === 'ES' && row.na_item === 'B9').map(row => row.time))].sort();
  const series = years.map(year => ({
    year: Number(year),
    spain: { revenue: ratioRows[`ES|TR|${year}`], spending: ratioRows[`ES|TE|${year}`], balance: ratioRows[`ES|B9|${year}`], debt: debtRows[`ES|${year}`] },
    eu: { revenue: ratioRows[`EU27_2020|TR|${year}`], spending: ratioRows[`EU27_2020|TE|${year}`], balance: ratioRows[`EU27_2020|B9|${year}`], debt: debtRows[`EU27_2020|${year}`] },
  })).filter(entry => [entry.spain.balance, entry.spain.debt, entry.eu.balance, entry.eu.debt].every(Number.isFinite));
  if (series.length < 5) throw new Error(`Eurostat solo devuelve ${series.length} años completos de déficit y deuda`);
  for (const entry of series) {
    for (const [geo, values] of Object.entries({ ES: entry.spain, EU: entry.eu })) {
      if (Number.isFinite(values.revenue) && Number.isFinite(values.spending) && Math.abs(values.revenue - values.spending - values.balance) > 0.25) {
        throw new Error(`${geo} ${entry.year}: ingresos − gastos (${values.revenue} − ${values.spending}) no cuadra con el saldo ${values.balance} % del PIB`);
      }
    }
  }

  const functionRows = jsonStatRows(functions);
  const functionYear = Math.max(...functionRows.filter(row => row.geo === 'ES' && row.cofog99 === 'TOTAL').map(row => Number(row.time)));
  const functionValues = byKey(functionRows.filter(row => Number(row.time) === functionYear), ['geo', 'cofog99']);
  const functionShares = FUNCTION_CODES.map(code => ({ code, spain: functionValues[`ES|${code}`], eu: functionValues[`EU27_2020|${code}`] }));
  if (functionShares.some(item => !Number.isFinite(item.spain) || !Number.isFinite(item.eu))) throw new Error(`Faltan funciones COFOG en % del PIB para ${functionYear}`);

  const levelRows = jsonStatRows(levels);
  const levelYear = Math.max(...levelRows.filter(row => row.sector === 'S13' && row.na_item === 'B9').map(row => Number(row.time)));
  const levelValues = byKey(levelRows.filter(row => Number(row.time) === levelYear), ['sector', 'na_item']);
  const levelList = Object.entries(SUBSECTORS).map(([code, id]) => ({ id, code, revenue: levelValues[`${code}|TR`], spending: levelValues[`${code}|TE`], balance: levelValues[`${code}|B9`] }));
  if (levelList.some(level => ![level.revenue, level.spending, level.balance].every(Number.isFinite))) throw new Error(`Faltan cuentas por nivel de administración en ${levelYear}`);
  const total = { revenue: levelValues['S13|TR'], spending: levelValues['S13|TE'], balance: levelValues['S13|B9'] };
  const balanceSum = levelList.reduce((sum, level) => sum + level.balance, 0);
  if (Math.abs(balanceSum - total.balance) > 2) throw new Error(`Los saldos de cada nivel suman ${balanceSum}, pero el total es ${total.balance} M€`);

  return {
    series,
    functions: { year: functionYear, totalSpain: functionValues['ES|TOTAL'], totalEu: functionValues['EU27_2020|TOTAL'], items: functionShares },
    levels: { year: levelYear, total, items: levelList },
  };
}
