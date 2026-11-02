import type { DashboardData } from '../../lib/dashboard-data';
import AnnualContextSection from './budget/AnnualContextSection';
import BenefitsSection from './budget/BenefitsSection';
import BudgetSimulator from './budget/BudgetSimulator';
import MoneyFlow from './budget/MoneyFlow';

type BudgetSectionProps = Pick<DashboardData, 'monthly' | 'benefits' | 'taxes' | 'services'>;

export default function BudgetSection({ monthly, benefits, taxes, services }: BudgetSectionProps) {
  return (
    <section className="budget-section" id="presupuesto">
      <div className="section-heading">
        <div>
          <div className="eyebrow muted">01 / PRUEBA TU ESCENARIO</div>
          <h2>¿Cómo repartirías<br/><em>el presupuesto?</em></h2>
        </div>
        <div className="period-control">
          <label>MES Y ADMINISTRACIONES</label>
          <div className="static-select">{monthly.periodLabel} · Sin ayuntamientos</div>
          <div className="data-status official-status"><span className="status-dot"/> BASE OFICIAL · IGAE</div>
        </div>
      </div>
      <div className="official-notice">
        <span>i</span>
        <p><b>El tope del simulador son los ingresos del mes.</b> Si subes una partida y falta dinero, las demás bajan proporcionalmente para hacerle sitio. Si bajas una, el dinero queda sin repartir. La marca vertical señala cuánto se gastó oficialmente en esa partida; no indica un mínimo necesario para que funcione.</p>
        <a href={monthly.sourceUrl} target="_blank" rel="noreferrer">Ver informe ↗</a>
      </div>
      <MoneyFlow monthly={monthly}/>
      <BudgetSimulator monthly={monthly}/>
      <AnnualContextSection monthly={monthly} taxes={taxes} services={services}/>
      <BenefitsSection benefits={benefits}/>
    </section>
  );
}
