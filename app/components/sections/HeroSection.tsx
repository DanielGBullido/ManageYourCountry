import type { DashboardData } from '../../lib/dashboard-data';
import { formatMillions } from '../../lib/format';

export default function HeroSection({ monthly }: { monthly: DashboardData['monthly'] }) {
  return (
<section className="hero hero-data">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> CUENTAS PÚBLICAS · {monthly.periodLabel.toUpperCase()}</div>
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
