import type { DashboardData } from '../../../lib/dashboard-data';
import type { BudgetLine } from '../../../lib/budget-scenario';
import { formatMillions, formatPercent } from '../../../lib/format';

type ScenarioOverviewProps = {
  monthly: DashboardData['monthly'];
  lines: BudgetLine[];
  amounts: number[];
  spent: number;
  unallocated: number;
  deficit: number;
  balance: number;
  gradient: string;
  isYearToDate: boolean;
};

export default function ScenarioOverview({ monthly, lines, amounts, spent, unallocated, deficit, balance, gradient, isYearToDate }: ScenarioOverviewProps) {
  const percentSpent = monthly.revenueTotal > 0 ? spent / monthly.revenueTotal * 100 : 0;
  // Shares are of revenue while within budget; with a deficit, of total spending (the ring is full).
  const shareBase = Math.max(monthly.revenueTotal, spent);
  const officialBalance = monthly.financingBalance;
  return <div className="right-stack">
    <article className="panel impact-panel">
      <div className="panel-top"><div><div className="eyebrow muted">TU ESCENARIO · GASTO</div><h3>Así queda el reparto</h3></div><span className="scenario-tag">{monthly.periodLabel.toUpperCase()}</span></div>
      <div className="chart-wrap">
        <div className="donut" role="img" aria-label={deficit > 0 ? `${formatMillions(spent)} gastados; ${formatMillions(deficit)} por encima de los ingresos` : `${formatMillions(spent)} gastados y ${formatMillions(unallocated)} sin repartir`} style={{ background: `conic-gradient(${gradient})` }}><div className="donut-center"><span>{deficit > 0 ? 'DE LOS INGRESOS' : 'GASTADO'}</span><b>{formatPercent(percentSpent)}%</b><small>{formatMillions(spent)}</small></div></div>
        <div className="legend">{lines.map((line, index) => <div className="legend-item" key={line.id}><i className="color-chip" style={{ background: line.color }}/><span>{line.label}</span><b>{formatPercent(shareBase > 0 ? amounts[index] / shareBase * 100 : 0)}%</b></div>)}{deficit > 0 ? null : <div className="legend-item"><i className="color-chip" style={{ background: '#e7e9e4' }}/><span>Sin repartir</span><b>{formatPercent(monthly.revenueTotal > 0 ? unallocated / monthly.revenueTotal * 100 : 0)}%</b></div>}</div>
      </div>
      <p className="scenario-emotion-note">Las caritas del simulador solo comparan el dinero que has asignado con el gasto oficial de cada categoría. No miden la calidad del servicio ni quién recibe ese dinero.</p>
      <div className="impact-divider"/><div className="scenario-balance"><span>Saldo del escenario tras el gasto</span><b className={balance >= 0 ? 'balance-positive' : ''}>{balance >= 0 ? '+' : '−'}{formatMillions(Math.abs(balance))}</b><small>{deficit > 0 ? `Déficit: el gasto supera los ingresos en ${formatPercent(deficit / Math.max(1, monthly.revenueTotal) * 100)} %. Habría que emitir deuda por esa cantidad, que además generaría intereses en el futuro.` : `Ingresos ${isYearToDate ? 'acumulados' : 'del mes'} menos el gasto de tu escenario. Es una simulación, no dinero en una cuenta real.`} Saldo oficial de {monthly.periodLabel.toLowerCase()}: {officialBalance >= 0 ? '+' : '−'}{formatMillions(Math.abs(officialBalance))}.</small></div>
    </article>
    <article className="panel revenue-panel">
      <div className="eyebrow muted">DINERO QUE ENTRÓ · {monthly.periodLabel.toUpperCase()} · M€</div><h3>¿De dónde vienen los ingresos?</h3>
      <div className="revenue-list">{monthly.revenue.map(item => <div className="revenue-row" key={item.id}><span><i className="color-chip" style={{ background: item.color }}/><span>{item.label}<small className="revenue-source-term">{item.description}</small><a className="revenue-source-term" href={`${monthly.sourceUrl}#page=9`} target="_blank" rel="noreferrer">IGAE · nombre en la tabla: {item.officialLabel} ↗</a></span></span><b>{formatMillions(item.amount)}</b></div>)}</div>
      <div className="revenue-total"><span>Total de ingresos</span><b>{formatMillions(monthly.revenueTotal)}</b></div><div className="revenue-explainer">Impuestos y cotizaciones son las principales fuentes de ingresos. Estas cifras son ingresos de las administraciones, no lo que paga cada persona.</div>
    </article>
  </div>;
}
