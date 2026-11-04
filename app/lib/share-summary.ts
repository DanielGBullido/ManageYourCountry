import { decodeScenario, type BudgetLine } from './budget-scenario';
import { dashboardPeriods } from './dashboard-data';
import { formatMillions } from './format';
import { buildFunctionalScenario } from './functional-scenario';
import { buildYearToDate } from './year-to-date';

export type ShareParams = { mes?: string | null; vista?: string | null; reparto?: string | null; deficit?: string | null };

export type ShareSummary = {
  isScenario: boolean;
  periodLabel: string;
  revenue: number;
  spent: number;
  balance: number;
  changes: { label: string; delta: number }[];
  headline: string;
  description: string;
};

/**
 * What a shared link shows before it is opened (preview image and description):
 * the official figures of the period, or the person's scenario if the link
 * carries one. Uses the same data and rules as the simulator.
 */
export function buildShareSummary(params: ShareParams): ShareSummary {
  const snapshot = dashboardPeriods.find(item => item.period === params.mes) ?? dashboardPeriods[0];
  const monthly = params.vista === 'funciones'
    ? buildFunctionalScenario(snapshot.monthly, snapshot.services)
    : params.vista === 'acumulado'
      ? buildYearToDate(dashboardPeriods.map(item => item.monthly), snapshot.period) ?? snapshot.monthly
      : snapshot.monthly;
  const lines = monthly.expenditure as BudgetLine[];
  const amounts = decodeScenario(params.reparto ?? null, lines, monthly.revenueTotal, { allowDeficit: params.deficit === '1' });
  const scenario = amounts ?? lines.map(line => line.amount);
  const spent = scenario.reduce((sum, amount) => sum + amount, 0);
  const balance = monthly.revenueTotal - spent;
  const changes = lines
    .map((line, index) => ({ label: line.label, delta: scenario[index] - line.amount }))
    .filter(change => Math.abs(change.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
  const balanceText = balance < 0 ? `déficit de ${formatMillions(-balance)}` : balance > 0 ? `sobran ${formatMillions(balance)}` : 'cuadra exacto';
  const isScenario = Boolean(amounts);
  const headline = isScenario ? `Mi reparto del gasto público · ${monthly.periodLabel}` : `¿Cuánto entra y cuánto sale? · ${monthly.periodLabel}`;
  const description = isScenario
    ? `Gasto ${formatMillions(spent)} de ${formatMillions(monthly.revenueTotal)} que entraron: ${balanceText}. ${changes.map(change => `${change.label}: ${change.delta > 0 ? '+' : '−'}${formatMillions(Math.abs(change.delta))}`).join(' · ')}`.trim()
    : `Entraron ${formatMillions(monthly.revenueTotal)} y se gastaron ${formatMillions(spent)}: ${balanceText}. Prueba tu propio reparto con datos oficiales.`;
  return { isScenario, periodLabel: monthly.periodLabel, revenue: monthly.revenueTotal, spent, balance, changes, headline, description };
}
