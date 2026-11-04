import type { DashboardData } from '../../lib/dashboard-data';
import { formatBillionsFromMillions, formatMillions, formatMilliardsFromMillions } from '../../lib/format';
import type publicDebtHistoryData from '../../../data/public-debt-history-2026.json';

type HeroSectionProps = {
  monthly: DashboardData['monthly'];
  publicDebt: (Omit<typeof publicDebtHistoryData, 'months' | 'previousMonth'> & typeof publicDebtHistoryData.months[number] & { previousPeriodLabel: string; changeMillions: number }) | null;
  firstDebtLabel: string;
  /** Same month of the previous year, when it is archived. */
  previousYear: DashboardData['monthly'] | null;
  selectedPeriod: string;
  availablePeriods: { period: string; label: string }[];
  onPeriodChange: (period: string) => void;
};

export default function HeroSection({ monthly, publicDebt, firstDebtLabel, previousYear, selectedPeriod, availablePeriods, onPeriodChange }: HeroSectionProps) {
  const yearOnYear = (current: number, before: number | undefined) => {
    if (before === undefined || before === 0) return null;
    const change = (current - before) / Math.abs(before) * 100;
    return `${change >= 0 ? '+' : '−'}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(Math.abs(change))} % frente a ${previousYear?.periodLabel.toLowerCase()}`;
  };
  const revenueChange = previousYear ? yearOnYear(monthly.revenueTotal, previousYear.revenueTotal) : null;
  const spendingChange = previousYear ? yearOnYear(monthly.expenditureTotal, previousYear.expenditureTotal) : null;
  const balanceBefore = previousYear ? `${previousYear.financingBalance >= 0 ? '+' : '−'}${formatMillions(Math.abs(previousYear.financingBalance))} en ${previousYear.periodLabel.toLowerCase()}` : null;
  return (
<section className="hero hero-data">
        <div className="hero-copy"><div className="eyebrow hero-period-label"><span className="live-dot"/><span>CUENTAS PÚBLICAS</span><span className="hero-period-picker"><label htmlFor="dashboard-period">CAMBIA EL MES</label><span className="hero-period-select-wrap"><select id="dashboard-period" className="hero-period-select" value={selectedPeriod} onChange={event => onPeriodChange(event.target.value)} aria-describedby="period-availability">{availablePeriods.map(item => <option key={item.period} value={item.period}>{item.label}</option>)}</select><span className="hero-period-chevron" aria-hidden="true">▾</span></span></span></div><small id="period-availability" className="period-availability">{availablePeriods.length} meses disponibles</small>
          <h1>¿Cuánto entra,<br/><em>cuánto sale?</em></h1>
          <p className="hero-intro">Mira los ingresos y gastos de un mes real. Después, cambia las prioridades y comprueba cómo quedaría el reparto.</p>
          <a className="text-link" href="#presupuesto">EXPLORAR Y CAMBIAR EL GASTO <span>↓</span></a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span>DINERO QUE ENTRÓ</span><b>{formatMillions(monthly.revenueTotal)}</b><small>Impuestos, cotizaciones, ventas y rentas públicas</small>{revenueChange && <small className="hero-yoy">{revenueChange}</small>}</div>
          <div className="hero-stat"><span>DINERO QUE SE GASTÓ</span><b>{formatMillions(monthly.expenditureTotal)}</b><small>Gasto público no financiero</small>{spendingChange && <small className="hero-yoy">{spendingChange}</small>}</div>
          <div className={`hero-stat balance ${monthly.financingBalance >= 0 ? 'surplus' : ''}`}><span>{monthly.financingBalance >= 0 ? 'QUEDÓ DESPUÉS DE GASTAR' : 'FALTÓ PARA CUBRIR EL GASTO'}</span><b>{monthly.financingBalance >= 0 ? '+' : '−'}{formatMillions(Math.abs(monthly.financingBalance))}</b><small>{monthly.financingBalance >= 0 ? 'Superávit del mes' : 'Déficit del mes'}</small>{balanceBefore && <small className="hero-yoy">{balanceBefore}</small>}</div>
          {publicDebt ? <a className="hero-debt" href={publicDebt.apiUrl} target="_blank" rel="noreferrer"><span className="hero-debt-copy"><span>DEUDA TOTAL ACUMULADA · PDE</span><b>{formatBillionsFromMillions(publicDebt.amountMillions)}</b></span><small>Al cierre de {publicDebt.periodLabel.toLowerCase()} · Banco de España ↗</small><small className="hero-debt-change">{publicDebt.changeMillions > 0 ? 'Subió' : publicDebt.changeMillions < 0 ? 'Bajó' : 'No cambió'} en {formatMilliardsFromMillions(Math.abs(publicDebt.changeMillions))} frente a {publicDebt.previousPeriodLabel}</small><small className="hero-debt-note">Es todo lo que se debe, no lo que se pidió este mes.</small></a> : <div className="hero-debt hero-debt-missing"><span className="hero-debt-copy"><span>DEUDA TOTAL ACUMULADA · PDE</span></span><small>La serie mensual de deuda del Banco de España está cargada desde {firstDebtLabel}. Para este mes, consulta «España en contexto», con la deuda de cada año.</small></div>}
          <div className="stat-foot">{monthly.periodLabel} · Estado, comunidades autónomas y Seguridad Social (sin ayuntamientos)</div>
        </div>
      </section>
  );
}
