import type { DashboardData } from '../../lib/dashboard-data';

const transparencySources = [
  { index: 'PORTAL', title: 'Contratos públicos', description: 'Objeto, importe licitado y adjudicado, órgano comprador y empresa adjudicataria.', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/tramites/contratos' },
  { index: 'BDNS', title: 'Subvenciones y ayudas públicas', description: 'Organismo, finalidad, cuantía y beneficiario de ayudas concedidas.', href: 'https://www.pap.hacienda.gob.es/bdnstrans/GE/es/inicio' },
  { index: 'IGAE', title: 'Ejecución mensual del Estado', description: 'Ingresos, cambios de crédito y ejecución de gastos de la Administración General del Estado.', href: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadPublica/CPE/EjecucionPresupuestaria/Paginas/imextractoejecucion.aspx' },
  { index: 'HACIENDA', title: 'Ejecución de las comunidades autónomas', description: 'Consulta y descarga de datos por comunidad y periodo.', href: 'https://serviciostelematicosext.hacienda.gob.es/SGCIEF/Cimcanet/aspx/consulta/consulta.aspx' },
  { index: 'INE · API', title: 'Series oficiales de población y empleo', description: 'API REST en JSON de Tempus3 para consultar tablas y series estadísticas del INE.', href: 'https://datos.gob.es/es/aplicaciones/api-json' },
  { index: 'TRIBUNAL DE CUENTAS', title: 'Informes de fiscalización', description: 'Auditorías e informes de control de entidades públicas.', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/informacion-economico-presupuestaria/informes-fiscalizacion' }
];

export default function SourcesSection({ data }: { data: DashboardData }) {
  const { monthly: official, taxes: taxAnnual, people, regions, services, jobs, benefits, igaeProvenance } = data;
  return (
    <details className="deep-disclosure sources-disclosure" id="fuente">
      <summary><span className="deep-summary-icon">05</span><span className="deep-summary-copy"><b>Fuentes oficiales</b><small>INE, IGAE, Hacienda, AEAT, Seguridad Social y registros de transparencia</small></span><span className="deep-summary-action">Consultar fuentes <i>↓</i></span></summary>
      <section className="sources-section" id="detalle-fuente">
        <div className="sources-title"><div className="eyebrow muted">TRAZABILIDAD</div><h2>Datos oficiales.<br/><em>Fuente a la vista.</em></h2><p>Cada bloque enlaza con el organismo que publica los datos. Los meses y años de referencia aparecen junto a sus cifras.</p></div>
        <div className="source-list">
          <a className="source-item" href={official.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">IGAE</span><span><b>Ingresos y gastos públicos · {official.periodLabel}</b><small>Operaciones no financieras · SEC 2010 · Revisión Estadística 2024 · versión {igaeProvenance.referencePeriod}{igaeProvenance.sha256 ? ` · SHA-256 ${igaeProvenance.sha256.slice(0, 12)}` : ` · verificada ${igaeProvenance.verifiedAt}`}</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={taxAnnual.latestMonthly.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">AEAT</span><span><b>Recaudación mensual de impuestos · {taxAnnual.latestMonthly.period}</b><small>Recaudación neta de caja del mes; su alcance contable difiere del dato IGAE.</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={taxAnnual.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">AEAT</span><span><b>Recaudación por impuestos · {taxAnnual.period}</b><small>IRPF, IVA, Sociedades, impuestos especiales y desglose de tasas y otros conceptos</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={people.labour.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">INE</span><span><b>Población y empleo · {people.labour.period}</b><small>EPA · personas ocupadas, activas, paradas e inactivas</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={regions.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">HACIENDA</span><span><b>Financiación autonómica · liquidación de 2024</b><small>Capacidad fiscal normativa y financiación del sistema</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={services.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">IGAE</span><span><b>Gasto por finalidad · {services.period}</b><small>Resumen anual COFOG de funciones del conjunto de las administraciones</small></span><span className="source-arrow">↗</span></a>
          <a className="source-item" href={jobs.publicAdministration.sourceUrl} target="_blank" rel="noreferrer"><span className="source-index">EPSAP</span><span><b>Personal de las Administraciones Públicas · {jobs.publicAdministration.period}</b><small>Funcionarios de carrera, personal laboral, interinos, eventuales y personal en formación</small></span><span className="source-arrow">↗</span></a>
          {benefits.items.map(item => <a className="source-item" href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.id}><span className="source-index">{item.source === 'Instituto Nacional de la Seguridad Social' ? 'INSS' : item.source.includes('SEPE') ? 'SEPE' : item.source.includes('Imserso') || item.source.includes('IMSERSO') ? 'IMSERSO' : 'SEGURIDAD SOCIAL'}</span><span><b>{item.name} · {item.period}</b><small>{item.summary}</small></span><span className="source-arrow">↗</span></a>)}
        </div>
        <div className="transparency-source-heading"><div className="eyebrow muted">CONTRATOS, AYUDAS Y CONTROL</div><p>Fuentes para consultar expedientes y documentos concretos. Sus registros no se agregan al simulador mensual.</p></div>
        <div className="source-list transparency-source-list">
          {transparencySources.map(source => <a className="source-item" href={source.href} target="_blank" rel="noreferrer" key={source.title}><span className="source-index">{source.index}</span><span><b>{source.title}</b><small>{source.description}</small></span><span className="source-arrow">↗</span></a>)}
        </div>
        <div className="source-caveat" id="fuente-nota"><b>Actualización controlada y con versiones</b><span>El proyecto incluye una revisión semanal del catálogo IGAE: descarga el último informe mensual, verifica sus sumas y guarda la versión y el enlace del PDF antes de incorporarlo. Los datos de empleo, población, prestaciones, AEAT anual, financiación autonómica y COFOG se siguen incorporando manualmente. Nada se actualiza al abrir esta página. La AEAT informa en caja y la IGAE en contabilidad nacional, con alcances distintos: no sumes sus cifras entre sí.</span></div>
      </section>
    </details>
  );
}
