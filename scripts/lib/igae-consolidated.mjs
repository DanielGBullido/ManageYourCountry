import { readXlsx } from './xlsx-reader.mjs';

// Lectura del libro oficial M_CONSOLIDADO_AAAA.xlsx de la IGAE (hoja Tabla1a):
// operaciones no financieras del agregado de Administración central, regional y
// Seguridad Social, en importes ACUMULADOS desde enero. El flujo de cada mes es el
// acumulado del mes menos el del mes anterior; enero es su propio acumulado.

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const normalize = text => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Finds a row inside a section by its official code and/or the start of its label. */
function findRow(rows, from, to, { code, label }) {
  for (let index = from; index < to; index += 1) {
    const row = rows[index] ?? [];
    const rowCode = normalize(row[0]).replace(/\s/g, '');
    const rowLabel = normalize(row[1]);
    if ((code === undefined || rowCode === code.toLowerCase()) && (label === undefined || rowLabel.startsWith(label.toLowerCase()))) return row;
  }
  throw new Error(`No se encontró la fila IGAE ${code ?? ''} «${label ?? ''}» en Tabla1a`);
}

/**
 * @returns {{ year: number, provisional: boolean, updatedAt: string, months: { period: string, monthly: Record<string, number> }[] }}
 */
export function parseConsolidatedWorkbook(buffer) {
  const rows = readXlsx(buffer).sheet('Tabla1a');
  const title = rows.slice(0, 6).map(row => String(row[0] ?? '')).join(' ');
  const year = Number(title.match(/Año (\d{4})/)?.[1]);
  if (!year) throw new Error('No se reconoce el año del libro IGAE');
  const provisional = /Año \d{4}\s*\(P\)/.test(title);
  const updated = title.match(/actualización:\s*(\d{2})\/(\d{2})\/(\d{4})/);
  const updatedAt = updated ? `${updated[3]}-${updated[2]}-${updated[1]}` : '';
  const header = rows.find(row => normalize(row[1]) === 'conceptos');
  if (!header || normalize(header[2]) !== 'enero') throw new Error('La cabecera de meses de Tabla1a no es la esperada');

  const revenueStart = rows.findIndex(row => normalize(row[1]) === 'total de ingresos');
  const spendingStart = rows.findIndex(row => normalize(row[1]) === 'total de gastos');
  const balanceIndex = rows.findIndex(row => normalize(row[0]).startsWith('b.9'));
  if (revenueStart < 0 || spendingStart < revenueStart || balanceIndex < spendingStart) throw new Error('No se reconocen las secciones de ingresos y gastos de Tabla1a');
  const inRevenue = spec => findRow(rows, revenueStart, spendingStart, spec);
  const inSpending = spec => findRow(rows, spendingStart, balanceIndex, spec);

  const series = {
    revenueTotal: rows[revenueStart],
    taxes: inRevenue({ code: 'D.2+D.5+D.91' }),
    contributionsActual: inRevenue({ code: 'D.611+D.613' }),
    contributionsImputed: inRevenue({ code: 'D.612' }),
    transfersInCurrent: inRevenue({ code: 'D.73' }),
    transfersInCapital: inRevenue({ code: 'D.9_S13' }),
    expenditureTotal: rows[spendingStart],
    intermediate: inSpending({ code: 'P.2' }),
    wages: inSpending({ code: 'D.1' }),
    interest: inSpending({ code: 'D.41' }),
    benefits: inSpending({ code: 'D.62' }),
    inKind: inSpending({ code: 'D.632' }),
    subsidies: inSpending({ code: 'D.3' }),
    transfersOutCurrent: inSpending({ code: 'D.73' }),
    capital: inSpending({ code: 'P.5' }),
    transfersOutCapital: inSpending({ code: 'D.9_S13' }),
    balance: rows[balanceIndex],
  };

  const months = [];
  for (let month = 0; month < 12; month += 1) {
    const column = month + 2;
    const cumulative = key => series[key][column];
    if (typeof cumulative('revenueTotal') !== 'number') break;
    const flow = key => {
      const value = cumulative(key);
      if (typeof value !== 'number') throw new Error(`Falta el dato de ${key} en ${MONTHS[month]} de ${year}`);
      const previous = month === 0 ? 0 : series[key][column - 1];
      return value - previous;
    };
    const revenueTotal = flow('revenueTotal');
    const expenditureTotal = flow('expenditureTotal');
    const revenue = { taxes: flow('taxes'), contributions: flow('contributionsActual') + flow('contributionsImputed'), transfers: flow('transfersInCurrent') + flow('transfersInCapital') };
    revenue.other = revenueTotal - revenue.taxes - revenue.contributions - revenue.transfers;
    const expenditure = {
      intermediate: flow('intermediate'), wages: flow('wages'), interest: flow('interest'), subsidies: flow('subsidies'), benefits: flow('benefits'),
      in_kind: flow('inKind'), capital: flow('capital'), transfers_out: flow('transfersOutCurrent') + flow('transfersOutCapital'),
    };
    expenditure.other_out = expenditureTotal - Object.values(expenditure).reduce((sum, value) => sum + value, 0);
    const financingBalance = flow('balance');
    if (Math.abs(revenueTotal - expenditureTotal - financingBalance) > 1) throw new Error(`${MONTHS[month]} de ${year}: ingresos − gastos (${revenueTotal - expenditureTotal}) no cuadra con el saldo ${financingBalance}`);
    months.push({ period: `${year}-${String(month + 1).padStart(2, '0')}`, monthName: MONTHS[month], revenueTotal, expenditureTotal, financingBalance, revenue, expenditure });
  }
  if (!months.length) throw new Error(`El libro IGAE de ${year} no tiene ningún mes`);
  return { year, provisional, updatedAt, months };
}

const capitalize = text => text[0].toUpperCase() + text.slice(1);

/**
 * Monthly objects in the same shape as data/igae-latest.json, reusing the
 * descriptions, colours and notes of a template month so every month reads the same.
 */
export function buildHistory(parsed, template, provenanceBase) {
  return parsed.months.map(month => {
    const periodLabel = `${capitalize(month.monthName)} de ${parsed.year}`;
    return {
      period: month.period,
      label: periodLabel,
      monthly: {
        ...template,
        sourceUrl: provenanceBase.sourceUrl,
        catalogUrl: provenanceBase.catalogUrl,
        notes: [
          `Fuente: serie mensual consolidada de la IGAE, hoja Tabla1a del libro ${provenanceBase.sourceFile}${parsed.provisional ? ' (datos provisionales)' : ''}, actualización ${provenanceBase.sourceUpdatedAt}.`,
          'El libro publica importes acumulados desde enero. El importe del mes se calcula restando el acumulado del mes anterior; enero equivale a su acumulado.',
          'La clasificación de gasto es económica; no identifica programas concretos ni una cantidad mínima necesaria para prestar cada servicio.',
          'El escenario permite redistribuir el gasto oficial y dejar parte de los ingresos sin asignar.',
        ],
        referencePeriod: month.period,
        periodLabel,
        periodType: 'Flujo del mes, calculado como diferencia entre acumulados del mes y del mes anterior',
        revenueTotal: month.revenueTotal,
        expenditureTotal: month.expenditureTotal,
        financingBalance: month.financingBalance,
        revenue: template.revenue.map(item => ({ ...item, amount: month.revenue[item.id] })),
        expenditure: template.expenditure.map(item => ({ ...item, amount: month.expenditure[item.id] })),
      },
      provenance: { ...provenanceBase, referencePeriod: month.period },
    };
  });
}
