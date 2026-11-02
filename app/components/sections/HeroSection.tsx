import type { DashboardData } from '../../lib/dashboard-data';
import { formatMillions } from '../../lib/format';

type HeroSectionProps = {
  monthly: DashboardData['monthly'];
  selectedPeriod: string;
  availablePeriods: { period: string; label: string }[];
  onPeriodChange: (period: string) => void;
};

export default function HeroSection({ monthly, selectedPeriod, availablePeriods, onPeriodChange }: HeroSectionProps) {
  return (
<section className="hero hero-data">
        <div className="hero-copy"><div className="eyebrow hero-period-label"><span className="live-dot"/> CUENTAS PÚBLICAS · <label htmlFor="dashboard-period" className="sr-only">Mes común de los datos del panel</label><select id="dashboard-period" className="hero-period-select" value={selectedPeriod} onChange={event => onPeriodChange(event.target.value)} aria-describedby="period-availability">{availablePeriods.map(item => <option key={item.period} value={item.period}>{item.label}</option>)}</select></div><small id="period-availability" className="period-availability">{availablePeriods.length === 1 ? 'Por ahora, este es el único mes completo con fuentes comparables.' : `${availablePeriods.length} meses completos disponibles`}</small>
          <h1>¿Cuánto entra,<br/><em>cuánto sale?</em></h1>
          <p className="hero-intro">Mira los ingresos y gastos de un mes real. Después, cambia las prioridades y comprueba cómo quedaría el reparto.</p>
          <a className="text-link" href="#presupuesto">EXPLORAR Y CAMBIAR EL GASTO <span>↓</span></a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>DINERO QUE ENTRÓ</span><b>{formatMillions(monthly.revenueTotal)}</b><small>Impuestos, cotizaciones, ventas y rentas públicas</small></div>
          <div className="hero-stat"><span>DINERO QUE SE GASTÓ</span><b>{formatMillions(monthly.expenditureTotal)}</b><small>Gasto público no financiero</small></div>
          <div className={`hero-stat balance ${monthly.financingBalance >= 0 ? 'surplus' : ''}`}><span>{monthly.financingBalance >= 0 ? 'QUEDÓ DESPUÉS DE GASTAR' : 'FALTÓ PARA CUBRIR EL GASTO'}</span><b>{monthly.financingBalance >= 0 ? '+' : '−'}{formatMillions(Math.abs(monthly.financingBalance))}</b><small>{monthly.financingBalance >= 0 ? 'Superávit del mes' : 'Déficit del mes'}</small></div>
          <div className="stat-foot">{monthly.periodLabel.toUpperCase()} · {monthly.scope.toUpperCase()}<br/>Saldo de ingresos y gastos públicos; no es el dinero que queda en una cuenta bancaria.</div>
        </div>
      </section>
  );
}
