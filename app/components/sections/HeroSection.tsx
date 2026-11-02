import type { DashboardData } from '../../lib/dashboard-data';
import { formatMillions } from '../../lib/format';
import type publicDebtHistoryData from '../../../data/public-debt-history-2026.json';

type HeroSectionProps = {
  monthly: DashboardData['monthly'];
  publicDebt: Omit<typeof publicDebtHistoryData, 'months'> & typeof publicDebtHistoryData.months[number];
  selectedPeriod: string;
  availablePeriods: { period: string; label: string }[];
  onPeriodChange: (period: string) => void;
};

export default function HeroSection({ monthly, publicDebt, selectedPeriod, availablePeriods, onPeriodChange }: HeroSectionProps) {
  return (
<section className="hero hero-data">
        <div className="hero-copy"><div className="eyebrow hero-period-label"><span className="live-dot"/><span>CUENTAS PÚBLICAS</span><span className="hero-period-picker"><label htmlFor="dashboard-period">CAMBIA EL MES</label><span className="hero-period-select-wrap"><select id="dashboard-period" className="hero-period-select" value={selectedPeriod} onChange={event => onPeriodChange(event.target.value)} aria-describedby="period-availability">{availablePeriods.map(item => <option key={item.period} value={item.period}>{item.label}</option>)}</select><span className="hero-period-chevron" aria-hidden="true">▾</span></span></span></div><small id="period-availability" className="period-availability">{availablePeriods.length} meses de cuentas mensuales IGAE disponibles. Las demás secciones indican su propio periodo de publicación.</small>
          <h1>¿Cuánto entra,<br/><em>cuánto sale?</em></h1>
          <p className="hero-intro">Mira los ingresos y gastos de un mes real. Después, cambia las prioridades y comprueba cómo quedaría el reparto.</p>
          <a className="text-link" href="#presupuesto">EXPLORAR Y CAMBIAR EL GASTO <span>↓</span></a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>DINERO QUE ENTRÓ</span><b>{formatMillions(monthly.revenueTotal)}</b><small>Impuestos, cotizaciones, ventas y rentas públicas</small></div>
          <div className="hero-stat"><span>DINERO QUE SE GASTÓ</span><b>{formatMillions(monthly.expenditureTotal)}</b><small>Gasto público no financiero</small></div>
          <div className={`hero-stat balance ${monthly.financingBalance >= 0 ? 'surplus' : ''}`}><span>{monthly.financingBalance >= 0 ? 'QUEDÓ DESPUÉS DE GASTAR' : 'FALTÓ PARA CUBRIR EL GASTO'}</span><b>{monthly.financingBalance >= 0 ? '+' : '−'}{formatMillions(Math.abs(monthly.financingBalance))}</b><small>{monthly.financingBalance >= 0 ? 'Superávit del mes' : 'Déficit del mes'}</small></div>
          <a className="hero-debt" href={publicDebt.apiUrl} target="_blank" rel="noreferrer" aria-label={`Deuda pública total PDE al cierre de ${publicDebt.periodLabel}: ${formatMillions(publicDebt.amountMillions)}. Abrir serie del Banco de España`}><span className="hero-debt-copy"><span>DEUDA PÚBLICA A CIERRE DE MES · PDE</span><b>{formatMillions(publicDebt.amountMillions)}</b></span><small>{publicDebt.periodLabel.toUpperCase()} · Banco de España · ver serie oficial ↗</small><small className="hero-debt-note">Es deuda acumulada, no gasto del mes. El déficit o superávit mensual no se convierte directamente en la misma subida o bajada de deuda.</small></a>
          <div className="stat-foot">{monthly.periodLabel.toUpperCase()} · {monthly.scope.toUpperCase()}<br/>Saldo de ingresos y gastos públicos; no es el dinero que queda en una cuenta bancaria.</div>
        </div>
      </section>
  );
}
