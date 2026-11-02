import type { DashboardData } from '../../../lib/dashboard-data';
import { formatMillions, formatPreciseMillions } from '../../../lib/format';
import RecipientProfileSection from './RecipientProfileSection';

type BenefitsSectionProps = { benefits: DashboardData['benefits'] };

export default function BenefitsSection({ benefits }: BenefitsSectionProps) {
  const latestBenefitsSum = benefits.items.reduce((sum, item) => sum + item.amountMillions, 0);
  const period = benefits.items[0]?.period ?? 'Periodo no disponible';
  return (
        <details className="budget-more-disclosure" id="prestaciones">
          <summary><span className="deep-summary-icon">+</span><span className="deep-summary-copy"><b>Pensiones, IMV y prestaciones por desempleo</b><small>Importes, perfiles de quienes las reciben y datos de subvenciones</small></span><span className="deep-summary-action">Ver ayudas y perfiles <i>↓</i></span></summary>
        <div className="benefits-section">
          <div className="benefits-heading"><div><div className="eyebrow muted">02 / ¿QUÉ HAY DETRÁS DE LAS AYUDAS? · {period.toUpperCase()}</div><h3>Pensiones, IMV y paro,<br/><em>con nombres y cifras.</em></h3></div><aside className="benefits-total" aria-label={`Suma aproximada de las cuatro prestaciones en ${period}: ${formatMillions(latestBenefitsSum)}`}><span>SUMA DE LAS 4 PRESTACIONES · {period.toUpperCase()}</span><strong>≈ {formatMillions(latestBenefitsSum)}</strong><small>Importes de ese mes. No representa todas las ayudas públicas.</small></aside></div>
          <div className="benefits-note"><span>!</span><p><b>Cómo interpretar la suma:</b> reúne las nóminas de {period} de pensiones contributivas, pensiones no contributivas, IMV y prestaciones por desempleo. No incluye todas las ayudas sociales y no debe sumarse al total de gasto de la IGAE, porque estos programas ya están dentro de esa cifra general.</p></div>
          <div className="benefit-grid">{benefits.items.map(item => <article className="benefit-card" key={item.id}>
            <div className="benefit-card-top"><span>{item.period.toUpperCase()}</span><span className="benefit-tag">{item.source}</span></div>
            <h4>{item.name}</h4>
            {item.id === 'pensions' && <p className="benefit-definition"><b>¿Qué significa contributiva?</b> Es una pensión ligada a las cotizaciones a la Seguridad Social. El derecho y la cuantía dependen de las cotizaciones y del tipo de pensión. Incluye jubilación, viudedad, incapacidad permanente, orfandad y otras.</p>}
            {item.id === 'non-contributory-pensions' && <p className="benefit-definition"><b>¿Qué significa no contributiva?</b> Es una pensión para personas mayores o con discapacidad que no han cotizado lo suficiente para una pensión contributiva y cumplen los requisitos de ingresos. No es solo una pensión de jubilación: también existe por incapacidad.</p>}
            <strong className="benefit-amount">{formatPreciseMillions(item.amountMillions)}</strong><p>{item.summary}</p>
            {item.details.length > 0 && <div className="benefit-breakdown">{item.details.map(detail => <div key={detail.label}><span>{detail.label}</span><b>{formatPreciseMillions(detail.amountMillions)}</b></div>)}</div>}
            {item.secondary && <p className="benefit-secondary">{item.secondary}</p>}
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">Fuente y nómina: {item.source} ↗</a>
          </article>)}</div>
          <RecipientProfileSection />
        </div>        </details>
  );
}
