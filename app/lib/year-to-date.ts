import type { DashboardData } from './dashboard-data';

type Monthly = DashboardData['monthly'];
export type BudgetView = 'month' | 'ytd';

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function yearToDateLabel(period: string) {
  const [year, month] = period.split('-').map(Number);
  const last = monthNames[month - 1];
  return `Enero a ${last} de ${year}`;
}

/**
 * Sums the archived monthly IGAE flows from January up to `period` (same year).
 * Returns null for January and when any month of that range is missing, so the view never mixes
 * a partial year with a full one.
 */
export function buildYearToDate(monthlies: Monthly[], period: string): Monthly | null {
  const [year, month] = period.split('-').map(Number);
  // January alone is identical to the monthly view; offering both would add noise.
  if (!year || !month || month < 2) return null;
  const wanted = Array.from({ length: month }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
  const byPeriod = new Map(monthlies.map(item => [item.referencePeriod, item]));
  const range = wanted.map(key => byPeriod.get(key));
  if (range.some(item => !item)) return null;
  const months = range as Monthly[];
  const latest = months[months.length - 1];
  const sum = (pick: (item: Monthly) => number) => months.reduce((total, item) => total + pick(item), 0);
  const sumLines = (key: 'revenue' | 'expenditure') => latest[key].map(line => ({
    ...line,
    amount: sum(item => item[key].find(entry => entry.id === line.id)?.amount ?? 0),
  }));
  return {
    ...latest,
    periodLabel: yearToDateLabel(period),
    periodType: `Acumulado del año: suma de los flujos mensuales IGAE de ${months.length} ${months.length === 1 ? 'mes' : 'meses'}`,
    revenueTotal: sum(item => item.revenueTotal),
    expenditureTotal: sum(item => item.expenditureTotal),
    financingBalance: sum(item => item.financingBalance),
    revenue: sumLines('revenue'),
    expenditure: sumLines('expenditure'),
  };
}
