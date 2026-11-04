import { eurosPerResident } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';

type ScenarioDockProps = { budget: number; spent: number; balance: number; residents: number; isYearToDate: boolean };

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

// Always-visible summary of the scenario. It sticks to the bottom of the screen
// while the item list scrolls, so every change shows its effect immediately.
export default function ScenarioDock({ budget, spent, balance, residents, isYearToDate }: ScenarioDockProps) {
  const deficit = balance < 0;
  const fill = budget > 0 ? Math.min(100, spent / budget * 100) : 0;
  const overflow = budget > 0 && deficit ? Math.min(100, -balance / budget * 100) : 0;
  const perResident = Math.round(eurosPerResident(Math.abs(balance), residents));
  const periodWord = isYearToDate ? 'en el periodo' : 'este mes';
  return <div className={`scenario-dock ${deficit ? 'is-deficit' : ''}`} aria-live="polite">
    <div className="scenario-dock-figures">
      <span>Gastas <b>{formatMillions(spent)}</b> de <b>{formatMillions(budget)}</b> que entraron</span>
      <strong>{deficit ? `Faltan ${formatMillions(-balance)}` : balance > 0 ? `Sobran ${formatMillions(balance)}` : 'Cuadra exacto'}</strong>
    </div>
    <div className="scenario-dock-bar" aria-hidden="true"><i style={{ width: `${fill}%` }}/>{overflow > 0 && <em style={{ width: `${overflow}%` }}/>}</div>
    <small>{deficit
      ? `Habría que pedir prestado ≈ ${euros.format(perResident)} € por residente ${periodWord}, y pagar intereses después.`
      : balance > 0 ? `≈ ${euros.format(perResident)} € por residente ${periodWord} sin repartir.` : 'Todo lo que entró está asignado.'}</small>
  </div>;
}
