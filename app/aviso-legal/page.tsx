import type { Metadata } from 'next';
import PageFooter from '../components/layout/PageFooter';

export const metadata: Metadata = {
  title: 'Aviso legal y privacidad — España en tus manos',
  description: 'Qué es España en tus manos, de dónde salen sus datos y qué información trata al visitarla.',
  alternates: { canonical: '/aviso-legal' },
};

const repository = 'https://github.com/DanielGBullido/ManageYourCountry';

export default function LegalPage() {
  return <>
    <header className="site-header legal-header">
      <a className="brand" href="/"><img className="brand-mark-image" src="/brand-mark.svg" alt="" aria-hidden="true"/><span>ESPAÑA<br/><b>EN TUS MANOS</b></span></a>
      <a className="share-button" href="/">Volver al simulador</a>
    </header>
    <main id="inicio" className="legal-page">
      <div className="eyebrow muted">AVISO LEGAL Y PRIVACIDAD</div>
      <h1>Qué es esta web y qué datos trata</h1>

      <section>
        <h2>Qué es</h2>
        <p>«España en tus manos» es una herramienta cívica e independiente para entender los ingresos y gastos públicos con datos oficiales. No pertenece a ninguna administración pública ni habla en su nombre.</p>
        <p>El simulador es educativo: muestra qué pasaría con otro reparto del gasto, pero no es una propuesta, una previsión ni una valoración de si una partida está bien o mal dotada.</p>
      </section>

      <section>
        <h2>De dónde salen los datos</h2>
        <p>Las cifras proceden de publicaciones oficiales: IGAE, Agencia Tributaria, Banco de España, INE, Seguridad Social, Imserso, INSS, Ministerio de Trabajo (datos del SEPE) y Eurostat. Cada cifra indica su fuente, su periodo y su alcance, y enlaza a la publicación original.</p>
        <p>Los datos se descargan y comprueban automáticamente cada semana, pero pueden contener errores o estar pendientes de la última revisión. Si hay diferencias, prevalece siempre la publicación del organismo oficial.</p>
      </section>

      <section>
        <h2>Privacidad</h2>
        <ul>
          <li><b>Sin cookies, sin cuentas y sin formularios.</b> La web no te pide ningún dato personal.</li>
          <li><b>Tus escenarios no se guardan en ningún servidor.</b> Viven en tu navegador y en la dirección de la página; solo los compartes si tú envías ese enlace.</li>
          <li><b>Estadísticas de uso sin cookies.</b> Se cuentan visitas y páginas de forma agregada con Vercel Web Analytics, que no usa cookies ni identifica a personas.</li>
          <li><b>Alojamiento.</b> La web está alojada en Vercel, que registra datos técnicos de cada petición (como la dirección IP y el navegador) para que el servicio funcione y sea seguro, según su propia política de privacidad.</li>
          <li><b>Tipografías propias.</b> Las fuentes se sirven desde esta misma web; tu navegador no contacta con Google.</li>
          <li><b>Mapa de comunidades.</b> Al abrir el mapa, tu navegador descarga los límites autonómicos del servicio cartográfico del Ministerio de Transportes (mapas.fomento.gob.es), que recibe esa petición como cualquier otra web.</li>
          <li><b>Enlaces externos.</b> Los enlaces a organismos oficiales abren sus webs, que tienen sus propias condiciones.</li>
        </ul>
      </section>

      <section>
        <h2>Código y contacto</h2>
        <p>El código y los datos están publicados en <a href={repository} target="_blank" rel="noreferrer">GitHub</a>. Para avisar de un error en una cifra o proponer una mejora, abre una <a href={`${repository}/issues`} target="_blank" rel="noreferrer">incidencia en el repositorio</a>.</p>
      </section>
    </main>
    <PageFooter/>
  </>;
}
