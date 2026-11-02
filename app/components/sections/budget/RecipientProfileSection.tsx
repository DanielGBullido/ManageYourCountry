import imvProfile from '../../../../data/perfil-beneficiarios-2026-08.json';

const sepeSource = 'https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/estadisticas-prestaciones.html';
const pncSource = 'https://imserso.es/el-imserso/documentacion/estadisticas/pensiones-no-contributivas-jubilacion-invalidez-pnc/historico-informes-publicados-pnc-pspd/perfil-pensionista-pnc-beneficiario-pspd';
const bdnsApi = 'https://www.infosubvenciones.es/bdnstrans/doc/swagger';
const bdnsSearch = 'https://www.infosubvenciones.es/bdnstrans/GE/es/concesiones';

const imvHolders = { total: imvProfile.totalHolders, ...imvProfile.nationality };
const percentage = (value: number) => (value / imvHolders.total) * 100;
const formatPeople = (value: number) => new Intl.NumberFormat('es-ES').format(value);
const formatPercent = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
const formatShare = (value: number) => value < 0.1 ? '<0,1' : formatPercent(value);

export default function RecipientProfileSection() {
  return (
    <section className="recipient-profile" aria-labelledby="recipient-profile-title">
      <header className="recipient-profile-heading">
        <div>
          <div className="eyebrow muted">QUIÉN RECIBE LAS AYUDAS · DATOS AGREGADOS</div>
          <h4 id="recipient-profile-title">¿A quién llegan algunas prestaciones y subvenciones?</h4>
        </div>
        <p>Las administraciones publican datos distintos para cada ayuda. Aquí separamos hogares, personas beneficiarias y subvenciones a entidades.</p>
      </header>

      <article className="recipient-card imv-recipient-card">
        <div className="recipient-card-title">
          <div><span>INGRESO MÍNIMO VITAL · {imvProfile.periodLabel.toUpperCase()}</span><h5>Nacionalidad de la persona titular</h5></div>
          <strong>{formatPeople(imvHolders.total)} <small>hogares</small></strong>
        </div>
        <p>Una persona titular encabeza cada solicitud del IMV. En {imvProfile.periodLabel.toLowerCase()}, el INSS publicó este reparto por nacionalidad:</p>
        <div className="imv-nationality-bar" role="img" aria-label={`${formatPeople(imvHolders.spanish)} titulares con nacionalidad española, ${formatPeople(imvHolders.foreign)} con nacionalidad extranjera y ${formatPeople(imvHolders.notReported)} sin nacionalidad informada`}>
          <span style={{ width: `${percentage(imvHolders.spanish)}%` }} />
          <span style={{ width: `${percentage(imvHolders.foreign)}%` }} />
          <span style={{ width: `${percentage(imvHolders.notReported)}%` }} />
        </div>
        <div className="imv-nationality-legend">
          <div><i className="spanish"/><span><b>{formatPeople(imvHolders.spanish)}</b> titulares con nacionalidad española <small>{formatPercent(percentage(imvHolders.spanish))}% del total</small></span></div>
          <div><i className="foreign"/><span><b>{formatPeople(imvHolders.foreign)}</b> titulares con nacionalidad extranjera <small>{formatPercent(percentage(imvHolders.foreign))}% del total</small></span></div>
          <div><i className="unknown"/><span><b>{formatPeople(imvHolders.notReported)}</b> sin nacionalidad informada <small>{formatShare(percentage(imvHolders.notReported))}% del total</small></span></div>
        </div>
        <div className="recipient-caveat"><b>Qué cuenta esta tabla:</b> titulares de hogares, no todas las personas que viven en ellos. El IMV llegó a {formatPeople(imvProfile.beneficiaryPeople)} personas ese mes, incluidos menores y otros miembros de los hogares. La fuente no publica cuánto dinero recibió cada grupo de nacionalidad.</div>
        <a href={imvProfile.sourceUrl} target="_blank" rel="noreferrer">Abrir dosier oficial del INSS · tabla 1.5, por provincia y nacionalidad ↗</a>
        <a href={imvProfile.contextUrl} target="_blank" rel="noreferrer">Resumen del IMV de agosto · Seguridad Social ↗</a>
      </article>

      <div className="recipient-data-grid">
        <article className="recipient-card">
          <span className="eyebrow muted">PENSIONES NO CONTRIBUTIVAS · IMSERSO</span>
          <h5>Perfil de quienes las reciben</h5>
          <p>El Imserso publica informes anuales sobre edad, sexo, nacionalidad y comunidad autónoma para las pensiones no contributivas. No son el mismo mes que la nómina del simulador ni permiten atribuir el gasto mensual por nacionalidad.</p>
          <a href={pncSource} target="_blank" rel="noreferrer">Consultar perfiles oficiales de pensionistas ↗</a>
        </article>
        <article className="recipient-card">
          <span className="eyebrow muted">PRESTACIONES POR DESEMPLEO · SEPE</span>
          <h5>Personas que cobran el paro</h5>
          <p>El SEPE publica estadísticas de beneficiarios extranjeros y desgloses por edad, sexo, tipo de prestación, provincia y comunidad autónoma. Son recuentos de personas; no una distribución completa del importe pagado por nacionalidad.</p>
          <a href={sepeSource} target="_blank" rel="noreferrer">Consultar estadísticas oficiales del SEPE ↗</a>
        </article>
        <article className="recipient-card">
          <span className="eyebrow muted">SUBVENCIONES Y AYUDAS · BDNS</span>
          <h5>Quién recibe cada concesión</h5>
          <p>La Base de Datos Nacional permite buscar convocatoria, organismo que concede, beneficiario publicado, importe, fecha, región y actividad económica cuando consta.</p>
          <a href={bdnsSearch} target="_blank" rel="noreferrer">Buscar concesiones en la BDNS ↗</a>
          <a href={bdnsApi} target="_blank" rel="noreferrer">Documentación de la API pública ↗</a>
          <small>La identidad de personas físicas puede aparecer parcialmente oculta y algunas concesiones no se publican por protección de datos. La base no ofrece un cruce completo por nacionalidad.</small>
        </article>
      </div>

      <p className="recipient-profile-note"><b>Nacionalidad no es lugar de nacimiento ni “ser inmigrante”.</b> Una persona nacida fuera puede tener nacionalidad española, también por haberla adquirido; una persona nacida en España puede conservar otra nacionalidad. Por eso mostramos la categoría exacta de cada fuente y no la convertimos en un supuesto origen migratorio.</p>
      <p className="recipient-profile-note">Las concesiones de la BDNS tampoco equivalen necesariamente a pagos realizados ese mes ni a toda la partida de subvenciones de las cuentas IGAE. No se deben sumar a la nómina mensual del simulador.</p>
    </section>
  );
}
