import type { DashboardData } from '../../../lib/dashboard-data';
import { formatMillions } from '../../../lib/format';

export default function MoneyFlow({ monthly }: { monthly: DashboardData['monthly'] }) {
  const balance = monthly.financingBalance;
  return (
    <div className="money-route" aria-label={`Recorrido agregado del dinero público en ${monthly.periodLabel}`}>
      <div className="money-route-heading">
        <div>
          <div className="eyebrow muted">EL RECORRIDO DEL DINERO · {monthly.periodLabel.toUpperCase()}</div>
          <b>De los ingresos al gasto público</b>
        </div>
        <small>Contabilidad nacional · M€</small>
      </div>
      <div className="money-route-flow">
        <article>
          <span>1 · ENTRA</span>
          <strong>{formatMillions(monthly.revenueTotal)}</strong>
          <small>{monthly.revenue.map(item => `${item.label}: ${formatMillions(item.amount)}`).join(' · ')}</small>
        </article>
        <i aria-hidden="true">→</i>
        <article className="money-pool">
          <span>2 · CAJA PÚBLICA COMÚN</span>
          <strong>Se juntan los recursos</strong>
          <small>No se puede seguir cada euro de un impuesto hasta un gasto concreto.</small>
        </article>
        <i aria-hidden="true">→</i>
        <article>
          <span>3 · SE GASTA</span>
          <strong>{formatMillions(monthly.expenditureTotal)}</strong>
          <small>En las nueve partidas del simulador, de sueldos a pensiones e inversión.</small>
        </article>
      </div>
      <div className="money-route-balance">
        <span>Saldo de {monthly.periodLabel.toLowerCase()}</span>
        <b>{balance >= 0 ? '+' : '−'}{formatMillions(Math.abs(balance))}</b>
        <small>{balance >= 0 ? 'Los ingresos superaron el gasto no financiero.' : 'El gasto no financiero superó los ingresos.'}</small>
      </div>
    </div>
  );
}
