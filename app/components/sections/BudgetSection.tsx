import type { DashboardData } from '../../lib/dashboard-data';
import type { BudgetView } from '../../lib/year-to-date';
import AnnualContextSection from './budget/AnnualContextSection';
import BenefitsSection from './budget/BenefitsSection';
import BudgetSimulator from './budget/BudgetSimulator';
import MoneyFlow from './budget/MoneyFlow';

type BudgetSectionProps = {
  data: DashboardData;
  view: BudgetView;
  yearToDate: DashboardData['monthly'] | null;
  onViewChange: (view: BudgetView) => void;
};

export default function BudgetSection({ data, view, yearToDate, onViewChange }: BudgetSectionProps) {
  const { monthly, benefits, taxes, services } = data;
  const activeView: BudgetView = view === 'ytd' && yearToDate ? 'ytd' : 'month';
  const scenario = activeView === 'ytd' && yearToDate ? yearToDate : monthly;
  const isYearToDate = activeView === 'ytd';
  return (
    <section className="budget-section" id="presupuesto">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">01 / PRUEBA TU ESCENARIO</div>
          <h2>¿Cómo repartirías<br/><em>el presupuesto?</em></h2>
        </div>
        <div className="period-control">
          <span className="period-control-label" id="budget-view-label">PERIODO DEL SIMULADOR</span>
          <div className="view-toggle" role="radiogroup" aria-labelledby="budget-view-label">
            <label className={activeView === 'month' ? 'active' : ''}><input type="radio" name="budget-view" value="month" checked={activeView === 'month'} onChange={() => onViewChange('month')}/>Solo {monthly.periodLabel.toLowerCase()}</label>
            <label className={activeView === 'ytd' ? 'active' : ''} aria-disabled={!yearToDate}><input type="radio" name="budget-view" value="ytd" checked={activeView === 'ytd'} disabled={!yearToDate} onChange={() => onViewChange('ytd')}/>{yearToDate ? `Acumulado: ${yearToDate.periodLabel.toLowerCase()}` : 'Acumulado del año (en enero coincide con el mes)'}</label>
          </div>
          <div className="static-select">Administración central, autonómica y Seguridad Social; sin ayuntamientos</div>
          <div className="data-status official-status"><span className="status-dot"/> BASE OFICIAL · IGAE</div>
        </div>
      </div>
      <div className="official-notice">
        <span>i</span>
        <p><b>{isYearToDate ? `Acumulado de ${scenario.periodLabel.toLowerCase()}.` : 'Un solo mes puede ser irregular.'}</b> {isYearToDate ? 'Sumar meses suaviza pagas extra y cobros trimestrales de impuestos.' : 'Pagas extra o cobros trimestrales de impuestos lo cambian mucho; el acumulado del año es más estable.'} Por defecto no puedes gastar más de lo que entra; activa «Permitir déficit» para hacerlo.</p>
        <a href={monthly.sourceUrl} target="_blank" rel="noreferrer">Ver informe ↗</a>
      </div>
      <BudgetSimulator monthly={scenario} residents={data.people.population.people} isYearToDate={isYearToDate}/>
      <MoneyFlow monthly={scenario}/>
      <AnnualContextSection monthly={monthly} taxes={taxes} services={services}/>
      <BenefitsSection benefits={benefits}/>
    </section>
  );
}
