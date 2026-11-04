import { useMemo } from 'react';
import type { DashboardData } from '../../lib/dashboard-data';
import { buildFunctionalScenario, functionalPopulation, functionalRevisionGap, functionalYear } from '../../lib/functional-scenario';
import { formatMillions } from '../../lib/format';
import type { BudgetView, PeriodKind } from '../../lib/year-to-date';
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
  const functional = useMemo(() => buildFunctionalScenario(monthly, services), [monthly, services]);
  const activeView: BudgetView = view === 'ytd' && !yearToDate ? 'month' : view;
  const scenario = activeView === 'functions' ? functional : activeView === 'ytd' && yearToDate ? yearToDate : monthly;
  const periodKind: PeriodKind = activeView === 'functions' ? 'year' : activeView === 'ytd' ? 'ytd' : 'month';
  const options: { value: BudgetView; label: string; hint: string; disabled?: boolean }[] = [
    { value: 'month', label: `Por tipo de gasto · ${monthly.periodLabel.toLowerCase()}`, hint: 'Sueldos, pensiones, compras… · un mes' },
    { value: 'ytd', label: yearToDate ? `Por tipo de gasto · ${yearToDate.periodLabel.toLowerCase()}` : 'Por tipo de gasto · acumulado del año', hint: yearToDate ? 'Más estable que un solo mes' : 'En enero coincide con el mes', disabled: !yearToDate },
    { value: 'functions', label: `Por función · año ${functionalYear}`, hint: 'Sanidad, educación, defensa… · incluye ayuntamientos' },
  ];
  const notice = periodKind === 'year'
    ? <><b>Año {functionalYear} completo, todas las administraciones.</b> Incluye ayuntamientos, así que no se compara con las cuentas mensuales. El gasto por funciones es de la publicación de abril; la revisión posterior lo sube {formatMillions(functionalRevisionGap)} sin repartirlo por funciones.</>
    : <><b>{periodKind === 'ytd' ? `Acumulado de ${scenario.periodLabel.toLowerCase()}.` : 'Un solo mes puede ser irregular.'}</b> {periodKind === 'ytd' ? 'Sumar meses suaviza pagas extra y cobros trimestrales de impuestos.' : 'Pagas extra o cobros trimestrales de impuestos lo cambian mucho; el acumulado del año es más estable.'} Por defecto no puedes gastar más de lo que entra; activa «Permitir déficit» para hacerlo.</>;
  return (
    <section className="budget-section" id="presupuesto">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">01 / PRUEBA TU ESCENARIO</div>
          <h2>¿Cómo repartirías<br/><em>el presupuesto?</em></h2>
        </div>
        <div className="period-control">
          <span className="period-control-label" id="budget-view-label">CÓMO VER EL GASTO</span>
          <div className="view-toggle" role="radiogroup" aria-labelledby="budget-view-label">
            {options.map(option => <label key={option.value} className={activeView === option.value ? 'active' : ''} aria-disabled={option.disabled}>
              <input type="radio" name="budget-view" value={option.value} checked={activeView === option.value} disabled={option.disabled} onChange={() => onViewChange(option.value)}/>
              <span><b>{option.label}</b><small>{option.hint}</small></span>
            </label>)}
          </div>
          <div className="data-status official-status"><span className="status-dot"/> {periodKind === 'year' ? 'EUROSTAT · DATOS NOTIFICADOS POR ESPAÑA' : 'IGAE · SIN AYUNTAMIENTOS'}</div>
        </div>
      </div>
      <div className="official-notice">
        <span>i</span>
        <p>{notice}</p>
        <a href={scenario.sourceUrl} target="_blank" rel="noreferrer">Ver fuente ↗</a>
      </div>
      <BudgetSimulator monthly={scenario} residents={periodKind === 'year' ? functionalPopulation : data.people.population.people} periodKind={periodKind}/>
      <MoneyFlow monthly={scenario}/>
      <AnnualContextSection monthly={monthly} taxes={taxes} services={services}/>
      <BenefitsSection benefits={benefits}/>
    </section>
  );
}
