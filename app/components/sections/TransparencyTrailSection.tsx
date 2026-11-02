const trailSources = [
  {
    index: '01',
    name: 'Contratos públicos',
    subtitle: 'Qué compra la Administración y a quién se lo adjudica',
    details: [
      'Consulta el objeto, el órgano que contrata, el precio de licitación y el adjudicado, el procedimiento, cuántas empresas licitaron y quién ganó.',
      'Los datos publicados en Transparencia enlazan con el Registro de Contratos del Sector Público y la Plataforma de Contratación. Las estadísticas agregadas se publican con retraso: la edición anual de 2024 apareció en diciembre de 2025.'
    ],
    limitation: 'El importe adjudicado no demuestra cuánto se pagó finalmente ni si hubo sobrecoste. Estas estadísticas cubren contratos adjudicados y no se pueden sumar directamente a un mes de gasto IGAE.',
    links: [
      { label: 'Buscar contratos en Transparencia', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/tramites/contratos' },
      { label: 'Plataforma de Contratación del Sector Público', href: 'https://contrataciondelestado.es/' }
    ]
  },
  {
    index: '02',
    name: 'Subvenciones y ayudas públicas',
    subtitle: 'Qué ayuda se concedió, para qué y a quién',
    details: [
      'El Sistema Nacional de Publicidad de Subvenciones muestra organismo, finalidad, importe y beneficiario. Su API pública permite consultar y descargar convocatorias, concesiones y ayudas en JSON.',
      'Incluye información de las Administraciones desde 2016 y de la Administración General del Estado desde 2014. La publicación de datos personales tiene límites legales: algunas ayudas a personas físicas no se muestran.'
    ],
    limitation: 'Una concesión publicada no equivale necesariamente al pago realizado en ese mes. Las consultas están sujetas a límites de uso; no descargues datos personales que no necesites. No sumes concesiones al gasto mensual IGAE.',
    links: [
      { label: 'Abrir la Base de Datos Nacional de Subvenciones', href: 'https://www.pap.hacienda.gob.es/bdnstrans/GE/es/inicio' },
      { label: 'Consultar documentación de la API REST oficial', href: 'https://www.infosubvenciones.es/bdnstrans/doc/swagger' },
      { label: 'Ver cobertura y explicación del Portal', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/tramites/subvenciones' }
    ]
  },
  {
    index: '03',
    name: 'Ejecución de los presupuestos',
    subtitle: 'Qué presupuesto se aprobó y cómo se va ejecutando',
    details: [
      'La AGE publica informes mensuales sobre ingresos, cambios de crédito y ejecución de gastos. Hay accesos separados para Seguridad Social, empresas públicas y otros subsectores.',
      'Hacienda publica consultas y ficheros de ejecución de cada comunidad autónoma; el Portal también enlaza a la ejecución trimestral de las entidades locales. La serie mensual IGAE por comunidad permite ver ingresos y gastos del Gobierno autonómico por separado.'
    ],
    limitation: 'El presupuesto y su ejecución usan cuentas presupuestarias y fechas distintas del agregado mensual SEC 2010 de la IGAE. Para relacionar un contrato con una categoría contable hay que comprobar entidad, periodo y fase de pago.',
    links: [
      { label: 'Ejecución mensual del Estado · IGAE', href: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadPublica/CPE/EjecucionPresupuestaria/Paginas/imextractoejecucion.aspx' },
      { label: 'Ejecución de las comunidades · Hacienda', href: 'https://serviciostelematicosext.hacienda.gob.es/SGCIEF/Cimcanet/aspx/consulta/consulta.aspx' },
      { label: 'Cuentas mensuales por comunidad · IGAE', href: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/imnofinancierasCA.aspx' },
      { label: 'Portal: ejecución del Estado, Seguridad Social y entidades locales', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/informacion-economico-presupuestaria/ejecucion' }
    ]
  },
  {
    index: '04',
    name: 'Auditorías del Tribunal de Cuentas',
    subtitle: 'Qué se revisó y qué incidencias señaló el órgano fiscalizador',
    details: [
      'Los informes de fiscalización se organizan por Administración General del Estado y organismos autónomos, Seguridad Social, sociedades públicas estatales y fundaciones.'
    ],
    limitation: 'Son informes de control con su propio periodo y alcance; no constituyen un cálculo automático del sobrecoste de las partidas mensuales.',
    links: [
      { label: 'Consultar informes de fiscalización', href: 'https://transparencia.gob.es/publicidad-activa/por-materias/informacion-economico-presupuestaria/informes-fiscalizacion' }
    ]
  }
];

export default function TransparencyTrailSection() {
  return (
    <section className="transparency-trail" id="detalle-contratos" aria-labelledby="transparency-trail-title">
      <div className="transparency-trail-heading">
        <div>
          <div className="eyebrow muted">DEL GRUPO CONTABLE AL EXPEDIENTE REAL</div>
          <h3 id="transparency-trail-title">¿Qué se compró,<br/><em>a quién se ayudó y quién lo revisó?</em></h3>
        </div>
        <p>El simulador enseña totales por tipo de gasto. Estos portales permiten consultar contratos, ayudas, presupuestos ejecutados e informes de control con nombres y documentos.</p>
      </div>
      <div className="transparency-trail-grid">
        {trailSources.map(source => (
          <article className="transparency-trail-card" key={source.index}>
            <div className="transparency-trail-card-heading"><span>{source.index}</span><div><h4>{source.name}</h4><small>{source.subtitle}</small></div></div>
            <ul>{source.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
            <p className="transparency-trail-limit"><b>Cómo interpretarlo:</b> {source.limitation}</p>
            <div className="transparency-trail-links">
              {source.links.map(link => <a href={link.href} key={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}
            </div>
          </article>
        ))}
      </div>
      <p className="transparency-trail-note"><b>Importante:</b> los registros pueden ayudar a entender partidas como compras, subvenciones o inversión, pero no se suman al simulador. Cambian el periodo, el organismo cubierto y la forma de contabilizar. Un contrato o una ayuda tampoco bastan, por sí solos, para determinar cuánto “debería” costar un servicio.</p>
    </section>
  );
}
