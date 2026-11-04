import { eurosPerResident, spendingBar } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';
import type { PeriodKind } from '../../../lib/year-to-date';
import context from '../../../../data/contexto-eurostat.json';

type ScenarioDockProps = { budget: number; spent: number; balance: number; residents: number; periodKind: PeriodKind };

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
// Average rate actually paid on Spain's debt (interest ÷ previous year-end debt, Eurostat).
const interestRate = context.interestRate.rate;
const rateText = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(interestRate);

// Always-visible summary of the scenario. It sticks to the bottom of the screen
// while the item list scrolls, so every change shows its effect immediately.
export default function ScenarioDock({ budget, spent, balance, residents, periodKind }: ScenarioDockProps) {
  const deficit = balance < 0;
  const { fill, overflow } = spendingBar(spent, budget);
  const perResident = Math.round(eurosPerResident(Math.abs(balance), residents));
  const periodWord = periodKind === 'year' ? 'al año' : periodKind === 'ytd' ? 'en el periodo' : 'este mes';
  return <div className={`scenario-dock ${deficit ? 'is-deficit' : ''}`} aria-live="polite">
    <div className="scenario-dock-figures">
      <span>Gastas <b>{formatMillions(spent)}</b> de <b>{formatMillions(budget)}</b> que entraron</span>
      <strong>{deficit ? `Faltan ${formatMillions(-balance)}` : balance > 0 ? `Sobran ${formatMillions(balance)}` : 'Cuadra exacto'}</strong>
    </div>
    <div className="scenario-dock-bar" aria-hidden="true"><i style={{ width: `${fill}%` }}/>{overflow > 0 && <em style={{ width: `${overflow}%` }}/>}</div>
    <small>{deficit
      ? `Habría que pedir prestado ≈ ${euros.format(perResident)} € por residente ${periodWord}. Esa deuda costaría ≈ ${formatMillions(Math.round(-balance * interestRate / 100))} al año en intereses (tipo medio que paga España: ${rateText} %).`
      : balance > 0 ? `≈ ${euros.format(perResident)} € por residente ${periodWord} sin repartir.` : 'Todo lo que entró está asignado.'}</small>
  </div>;
}
